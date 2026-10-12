// Official entry points checked on 2026-10-12. Fields after login can change.
export function getAirlineGuide(flight) {
    const number = flight.flightNumber.replace(/\s/g, "").toUpperCase();
    if (/^LY\d/.test(number)) return { name: "אל על", url: "https://contactus.elal.com/contactus",
        firstStep: "בחר אם אתה נוסע מתמיד והשלם את שלב ההזדהות המתאים. לאחר מכן המשך לפנייה לקשרי לקוחות בנושא הטיסה.", checkedAt: "2026-10-12" };
    if (/^IZ\d/.test(number)) return { name: "ארקיע", url: "https://ext.arkia.co.il/contactus/",
        firstStep: "הזן את מספר הטלפון הנייד שלך והשלם את האימות בקוד. לאחר מכן המשך בטופס הפנייה לשירות הלקוחות.", checkedAt: "2026-10-12" };
    return null;
}

export function buildAirlineMessage({ flight, passenger, pnr, guide = getAirlineGuide(flight) }) {
    if (!guide) throw new Error("Airline instructions are available for LY (EL AL) and IZ (Arkia) only");
    const disruption = flight.status === "CANCELLED" ? "ביטול טיסה" : "איחור מדווח של " + flight.delayMinutes + " דקות בהגעה (עשוי להיות זמן משוער)";
    const subject = "בקשה לבירור בעקבות שיבוש בטיסה " + flight.flightNumber;
    const letter = ["לכבוד שירות הלקוחות של " + guide.name + ",", "שמי " + passenger.name + ".",
        "מספר הזמנה (PNR): " + pnr, "מספר טיסה: " + flight.flightNumber,
        "מסלול: " + flight.departureAirport + " → " + flight.arrivalAirport,
        "המראה מתוכננת (UTC): " + new Date(flight.scheduledDeparture).toISOString(),
        "נחיתה מתוכננת (UTC): " + new Date(flight.scheduledArrival).toISOString(),
        "השיבוש שדווח: " + disruption + ".",
        "אבקש לבדוק את נסיבות השיבוש ולמסור לי תשובה בכתב לגבי סיוע, החזר או פיצוי ככל שמגיעים לי לפי הדין ותנאי ההזמנה.",
        "מצורפים סיכום נתוני הטיסה ומסמכי ההזמנה שבידי. אנא אשרו את קבלת הפנייה ומסרו מספר פנייה.",
        "כתובת לתשובה: " + passenger.email, "תודה, " + passenger.name].join("\n");
    const text = ["שלום " + passenger.name + ",", "זוהה שיבוש בטיסה שלך. מצורף PDF עם סיכום והנחיות לפנייה.",
        "המערכת לא שלחה פנייה לחברת התעופה ולא קבעה זכאות לפיצוי. לפני הגשה, השווה את הפרטים לכרטיס ולנתונים בפועל.",
        "1. פתח את הטופס הרשמי: " + guide.url,
        "2. " + guide.firstStep,
        "3. בפרטי הנוסע מלא את שמך כפי שמופיע בכרטיס, כתובת המייל ומספר טלפון. אם נדרש שם באנגלית, העתק אותו מהכרטיס.",
        "4. בפרטי הטיסה הזן את מספר הטיסה, התאריך, המסלול וההזמנה המופיעים להלן. מספר כרטיס אלקטרוני יש להעתיק מהכרטיס; הוא אינו מספר ה-PNR.",
        "5. בנושא הפנייה בחר את האפשרות המתאימה לשיבוש בטיסה, ובשדה התיאור/פרטים הדבק את הנוסח הבא. שמות השדות עשויים להשתנות לאחר ההזדהות.",
        "6. צרף את ה-PDF, אישור ההזמנה או הכרטיס, כרטיס עלייה למטוס אם קיים, הודעות על השיבוש וקבלות על הוצאות שאתה מבקש להחזיר. אל תצרף מסמך זהות אלא אם החברה דורשת אותו בערוץ הרשמי.",
        "7. בדוק את הנתונים, שלח בעצמך ושמור את אישור הפנייה. אם הטופס מבקש מידע שלא קיים כאן, השלם אותו מהמסמכים שלך.",
        "נושא להעתקה: " + subject, "נוסח להעתקה:", letter,
        "הנתונים התקבלו מספק מעקב ועשויים להתעדכן. איחור כשלעצמו אינו מבטיח פיצוי. קישורי הכניסה נבדקו בתאריך " + guide.checkedAt + "."].join("\n\n");
    const escape = value => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    return { subject, text, letter, guide, html: '<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8;white-space:pre-wrap">' + escape(text) + '</div>' };
}
