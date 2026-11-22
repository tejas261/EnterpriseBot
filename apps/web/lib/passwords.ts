import bcrypt from "bcryptjs";

const BCRYPT_COST = 10;
// Used to keep failed-login timing similar whether or not the username exists.
const DUMMY_HASH = bcrypt.hashSync("timing-only-placeholder-password", BCRYPT_COST);

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function burnPasswordCheck(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_HASH);
}
