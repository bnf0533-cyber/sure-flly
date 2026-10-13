import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import express from 'express';
import request from 'supertest';
import {validateProduction} from '../config.js';
import {createAuthLimiter,productionOnlyOff,requireVerifiedEmail} from '../middleware/security.middleware.js';
import {createEmailVerification} from '../services/emailVerification.service.js';
import {createDatabase} from '../db/config.db.js';
import {createUserDAL} from '../DAL/user.DAL.js';
import {errorHandler} from '../middleware/error.middleware.js';
import {getClaimInstructionsService} from '../services/claims.services.js';
const valid=()=>({NODE_ENV:'production',DB_URL:'postgresql://db:pass@db.example/db',JWT_SECRET:'a'.repeat(64),CLIENT_ORIGIN:'https://flights.example',AVIATIONSTACK_API_KEY:'key',SMTP_USER:'sender@example.test',SMTP_PASS:'password',PDF_FONT_PATH:process.env.PDF_FONT_PATH || 'C:/Windows/Fonts/arial.ttf',DB_SSL:'true',DB_SSL_REJECT_UNAUTHORIZED:'true',FLIGHT_PROVIDER:'aviationstack',EMAIL_ENABLED:'true'});
test('production configuration rejects insecure or mock setups',()=>{
    assert.doesNotThrow(()=>validateProduction(valid()));
    for(const changes of [{JWT_SECRET:'short'},{CLIENT_ORIGIN:'http://flights.example'},{DB_SSL_REJECT_UNAUTHORIZED:'false'},{FLIGHT_PROVIDER:'mock'},{DEMO_ENABLED:'true'},{LOCAL_AUTOMATION_ENABLED:'true'},{TRUST_PROXY:'true'},{DB_URL:'postgresql://db:pass@db.example/db?sslmode=require'},{PDF_FONT_PATH:'/not/a/font'}])
        assert.throws(()=>validateProduction({...valid(),...changes}));
});
test('auth limiter returns JSON and Retry-After',async()=>{
    const app=express();app.use(createAuthLimiter(2));app.post('/login',(_q,r)=>r.sendStatus(401));
    await request(app).post('/login').expect(401);await request(app).post('/login').expect(401);
    const result=await request(app).post('/login').expect(429);assert.equal(result.body.error.code,'RATE_LIMITED');assert.ok(result.headers['retry-after']);
});
test('production guards block demo routes and unverified tracking',async t=>{
    const old=process.env.NODE_ENV;process.env.NODE_ENV='production';t.after(()=>{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;});
    const app=express();app.get('/demo',productionOnlyOff,(_q,r)=>r.sendStatus(200));
    app.post('/track',(q,_r,next)=>{q.user={emailVerified:false};next();},requireVerifiedEmail,(_q,r)=>r.sendStatus(200));
    await request(app).get('/demo').expect(404);await request(app).post('/track').expect(403);
});
test('verification binds to the owner, expires and can only be used once',async t=>{
    const db=await createDatabase({mode:'memory'});t.after(()=>db.close());await db.migrate();
    const user=await createUserDAL(db).create({id:randomUUID(),name:'Test User',email:'test@example.test',passwordHash:'test'});
    const messages=[];const service=createEmailVerification({db,origin:'https://flights.example',sender:{send:async message=>messages.push(message)}});
    await service.request(user.id);assert.equal(messages.length,1);
    const token=messages[0].text.split('#verify=')[1];assert.equal(token.length,64);
    assert.notEqual((await db.query('SELECT verification_hash FROM users WHERE id=$1',[user.id])).rows[0].verification_hash,token);
    await assert.rejects(service.request(user.id),e=>e.statusCode===429);
    await assert.rejects(service.confirm(token,randomUUID()),e=>e.statusCode===400);
    await db.query('UPDATE users SET verification_expires_at=$2 WHERE id=$1',[user.id,new Date(Date.now()-1000).toISOString()]);
    await assert.rejects(service.confirm(token,user.id),e=>e.statusCode===400);
    await db.query('UPDATE users SET verification_expires_at=$2 WHERE id=$1',[user.id,new Date(Date.now()+60000).toISOString()]);
    await service.confirm(token,user.id);assert.equal((await createUserDAL(db).findById(user.id)).emailVerified,true);
    await assert.rejects(service.confirm(token,user.id),e=>e.statusCode===400);
});
test('instructions never disclose another users claim',async()=>{
    await assert.rejects(getClaimInstructionsService('intruder','claim',{query:async()=>({rows:[{claim_id:'claim',user_id:'owner',flight_number:'LY315'}]})}),e=>e.statusCode===404);
});
test('unexpected controller errors do not expose database secrets',async()=>{
    const app=express();app.get('/',()=>{throw new Error('postgresql://secret@example/private');});app.use(errorHandler);
    const result=await request(app).get('/').expect(500);assert.equal(result.body.error.code,'INTERNAL_ERROR');assert.ok(!JSON.stringify(result.body).includes('postgresql'));
});
