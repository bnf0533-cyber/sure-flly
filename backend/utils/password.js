import bcrypt from "bcryptjs";

export async function hashPassword(password) {
    const hash = await bcrypt.hash(password, 10);
    return hash;
}

export async function comparePassword(password, hashPass) {
    const compare = await bcrypt.compare(password, hashPass);
    return compare;
}
