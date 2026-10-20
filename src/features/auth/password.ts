import "server-only";
import bcrypt from "bcryptjs";

// Password hashing and verification used by login and account recovery.
const COST = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

let dummy: string | undefined;
/** Burn the same CPU time as a real check so response time doesn't reveal unknown accounts. */
export async function dummyVerify(plain: string) {
  dummy ??= await bcrypt.hash("not-a-real-password", COST);
  await bcrypt.compare(plain, dummy);
}
