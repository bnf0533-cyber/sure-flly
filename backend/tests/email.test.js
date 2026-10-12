import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../db/config.db.js";
import { createUserDAL } from "../DAL/user.DAL.js";
import { createFlightDAL } from "../DAL/flight.DAL.js";
import { createTrackedFlightDAL } from "../DAL/trackedFlight.DAL.js";
import { processFlightClaimsInTransaction } from "../services/claims.services.js";
import { createEmailWorker } from "../services/emailWorker.service.js";
import { buildAirlineMessage, getAirlineGuide } from "../services/airlineGuides.service.js";

async function fixture(t, number = "LY315") {
    const db = await createDatabase({ mode: "memory" }); t.after(() => db.close()); await db.migrate();
    const user = await createUserDAL(db).create({ id:randomUUID(),name:"נוסע בדיקה",email:"passenger@example.test",passwordHash:"test",role:"USER" });
    const flight = await createFlightDAL(db).createOrFind({id:randomUUID(),flightNumber:number,airline:"Airline",departureAirport:"TLV",arrivalAirport:"LHR",departureLat:32,departureLon:35,arrivalLat:51,arrivalLon:0,scheduledDeparture:new Date().toISOString(),scheduledArrival:new Date(Date.now()+3600000).toISOString(),distanceKm:3593,trackingStatus:"ACTIVE_TRACKING"});
    await createFlightDAL(db).updateStatus(flight.id,{status:"DELAYED",delayMinutes:120});
    await createTrackedFlightDAL(db).create({id:randomUUID(),userId:user.id,flightId:flight.id,pnr:"TEST01"});
    const prepare=()=>db.transaction(tx=>processFlightClaimsInTransaction(tx,flight.id,{liveMode:true,paymentGateway:{pay(){throw new Error("Real workflow must never pay");}}}));
    return {db,user,flight,prepare};
}
test("live disruption prepares one PDF and email without payment",async t=>{
    const {db,prepare}=await fixture(t); const result=await prepare();
    assert.equal(result.length,1); assert.equal(result[0].status,"READY");assert.equal(result[0].amountIls,0);
    assert.deepEqual(await prepare(),[]);
    const rows=await db.query("SELECT * FROM claims");assert.equal(rows.rows[0].email_status,"PENDING");assert.equal(rows.rows[0].paid_at,null);
    const sent=[];const worker=createEmailWorker({db,enabled:()=>true,sender:{async send(message){sent.push(message);return {messageId:"test-id"};}}});
    await worker.tick();await worker.tick();
    assert.equal(sent.length,1);assert.equal(sent[0].to,"passenger@example.test");assert.equal(sent[0].pdf.subarray(0,5).toString(),"%PDF-");
    assert.match(sent[0].text,/contactus.elal.com/);
    assert.equal((await db.query("SELECT email_status FROM claims")).rows[0].email_status,"SENT");
});
test("definite SMTP failures can retry, ambiguous failures cannot",async t=>{
    const {db,prepare}=await fixture(t,"IZ315");await prepare();let calls=0;
    const worker=createEmailWorker({db,enabled:()=>true,logger:{error(){}},sender:{async send(){calls++;throw Object.assign(new Error("not logged"),{code:calls===1?"EAUTH":"ETIMEDOUT"});}}});
    await worker.tick();assert.equal((await db.query("SELECT email_status FROM claims")).rows[0].email_status,"FAILED");
    await worker.tick();assert.equal(calls,1);
    await db.query("UPDATE claims SET email_next_attempt_at = NULL");await worker.tick();await worker.tick();
    assert.equal(calls,2);assert.equal((await db.query("SELECT email_status FROM claims")).rows[0].email_status,"UNKNOWN");
});
test("disabled email and unsupported airlines do not send",async t=>{
    const ctx=await fixture(t,"BA315");assert.deepEqual(await ctx.prepare(),[]);
    await createEmailWorker({db:ctx.db,enabled:()=>false,sender:{send(){throw new Error("must not send");}}}).tick();
});
test("airline instructions use correct forms and escape user text",()=>{
    assert.equal(getAirlineGuide({flightNumber:"IZ123"}).url,"https://ext.arkia.co.il/contactus/");
    assert.equal(getAirlineGuide({flightNumber:"BA123"}),null);
    const message=buildAirlineMessage({flight:{flightNumber:"LY123",status:"DELAYED",delayMinutes:120,departureAirport:"TLV",arrivalAirport:"LHR",scheduledDeparture:new Date(),scheduledArrival:new Date()},passenger:{name:"<img src=x>",email:"test@example.test"},pnr:"TEST01"});
    assert.ok(!message.html.includes("<img"));assert.match(message.html,/&lt;img/);assert.match(message.text,/לא קבעה זכאות/);
});
