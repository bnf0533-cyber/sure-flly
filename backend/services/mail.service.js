import nodemailer from "nodemailer";

export function createMailSender(env = process.env) {
    const user = env.SMTP_USER?.trim();
    const pass = env.SMTP_PASS?.replace(/\s/g, "");
    if (!user || !pass) throw new Error("Set SMTP_USER and SMTP_PASS in backend/.env");
    const port = Number(env.SMTP_PORT || 465);
    const transport = nodemailer.createTransport({ host: env.SMTP_HOST || "smtp.gmail.com", port,
        secure: port === 465, requireTLS: port !== 465, auth: { user, pass },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
        disableFileAccess: true, disableUrlAccess: true });
    return {
        verify: () => transport.verify(),
        async send({ to, subject, text, html, pdf, id }) {
            const result = await transport.sendMail({ from: { name: "SureFlight", address: user }, to,
                subject, text, html, messageId: "<sureflight-" + id + "@" + user.split("@")[1] + ">",
                attachments: pdf ? [{ filename: "SureFlight-" + id + ".pdf", content: pdf, contentType: "application/pdf" }] : [] });
            if (!result.accepted?.length) throw Object.assign(new Error("Recipient rejected"), { code: "EENVELOPE" });
            return { messageId: result.messageId };
        },
        close: () => transport.close(),
    };
}
