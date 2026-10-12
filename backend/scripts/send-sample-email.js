import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createMailSender } from '../services/mail.service.js';
import { buildAirlineMessage } from '../services/airlineGuides.service.js';
import { generateClaimPdf } from '../utils/pdfGenerator.js';
const recipient = process.env.SMTP_TEST_TO;
if (recipient !== 'chaim05041056@gmail.com') throw new Error('Test recipient must be the authorized sender address');
const airline = process.argv[2] === 'arkia' ? 'IZ' : 'LY';
const flight = { flightNumber: airline+'315', airline: airline==='LY'?'אל על':'ארקיע', isDemo: false,
    departureAirport:'TLV',arrivalAirport:'LHR',scheduledDeparture:new Date().toISOString(),
    scheduledArrival:new Date(Date.now()+18000000).toISOString(),distanceKm:3593,status:'DELAYED',delayMinutes:120 };
const passenger={name:'בדיקת מערכת — נתוני הדגמה',email:recipient};
const claim={id:randomUUID(),amountIls:0,status:'READY',createdAt:new Date().toISOString()};
const message=buildAirlineMessage({flight,passenger,pnr:'TEST01'});
const pdf=await generateClaimPdf({claim,flight,passenger,pnr:'TEST01',reason:'DELAY_REPORTED'});
const mail=createMailSender();
try { await mail.verify(); const result=await mail.send({to:recipient,...message,subject:'[בדיקת מערכת בלבד] '+message.subject,pdf,id:claim.id}); console.log('Test email accepted by SMTP:',result.messageId); }
catch { console.error('Test email failed. Check SMTP settings; no credentials were printed.');process.exitCode=1; }
finally {mail.close();}
