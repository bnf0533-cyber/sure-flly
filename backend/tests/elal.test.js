import test from 'node:test';
import assert from 'node:assert/strict';
import { fillElAlForm, launchElAlAutoFill } from '../services/elalAutomation.service.js';
function fakePage({ fail = false } = {}) {
    const writes = [], clicks = [];
    const field = label => { let value = ''; return { count: async()=>1, isVisible:async()=>true,
        fill:async v=>{if(fail) throw Error('blocked'); value=v;writes.push([String(label),v]);}, inputValue:async()=>value,
        click:async()=>clicks.push(String(label)) }; };
    return { writes, clicks, goto:async()=>{}, getByLabel:field, locator:field,
        getByRole:(_,args)=>field(args.name), waitForURL:async()=>{} };
}
const flight={flightNumber:'LY315'};
test('Hebrew names are left for manual completion without invented identity',async()=>{
    const page=fakePage();const result=await fillElAlForm(page,{passenger:{name:'משה כהן'},flight,pnr:'TEST01'});
    assert.equal(result.success,false);assert.match(result.message,/שם משפחה/);
    assert.deepEqual(page.writes.map(x=>x[1]),['TEST01']);assert.ok(!page.clicks.includes('המשך'));
});
test('missing phone is never fabricated and partial completion is reported',async()=>{
    const page=fakePage();const result=await fillElAlForm(page,{passenger:{name:'Jane Smith',email:'jane@example.test'},flight,pnr:'TEST01'});
    assert.equal(result.success,false);assert.match(result.message,/טלפון/);
    assert.ok(!page.writes.some(x=>x[1]==='0501234567'));assert.ok(page.writes.some(x=>x[1]==='Smith'));
});
test('field errors propagate instead of reporting success',async()=>{
    await assert.rejects(fillElAlForm(fakePage({fail:true}),{passenger:{name:'Jane Smith'},flight,pnr:'TEST01'}));
});
test('browser launch failures return a controlled failure',async()=>{
    const result=await launchElAlAutoFill({flight,passenger:{},browserType:{launch:async()=>{throw Error('missing chrome');}}});
    assert.equal(result.success,false);
});
test('deadline closes a stalled browser and reports failure',async()=>{
    let closed=false;const browser={newContext:async()=>new Promise(()=>{}),close:async()=>{closed=true;}};
    const result=await launchElAlAutoFill({flight,passenger:{},timeoutMs:20,browserType:{launch:async()=>browser}});
    assert.equal(result.success,false);assert.equal(closed,true);
});
test('other airlines never launch a browser',async()=>{
    const result=await launchElAlAutoFill({flight:{flightNumber:'IZ315'},passenger:{},browserType:{launch:async()=>assert.fail('must not launch')}});
    assert.equal(result.success,false);
});
