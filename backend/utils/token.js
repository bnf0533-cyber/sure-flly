import jwt from "jsonwebtoken";

export function signToken(user, jwtSecret) {
    const token = jwt.sign({ role: user.role }, jwtSecret, {
        subject: user.id,
        expiresIn: "12h",
        issuer: "sureflight",
        audience: "sureflight-client",
        algorithm: "HS256",
    });
    return token;
}

export function verifyToken(token, jwtSecret) {
    const verify = jwt.verify(token, jwtSecret, {
        issuer: "sureflight",
        audience: "sureflight-client",
        algorithms: ["HS256"],
    });
    return verify;
}
