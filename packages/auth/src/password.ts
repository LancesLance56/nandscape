import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const CURRENT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

function memoryCeiling(N: number, r: number): number {
  return 128 * N * r * 2;
}

function scryptAsync(password: string, salt: Buffer, keylen: number, N: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, { N, r, p, maxmem: memoryCeiling(N, r) }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const { N, r, p, keylen } = CURRENT_PARAMS;
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, keylen, N, r, p);
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");

  const derived = await scryptAsync(password.normalize("NFKC"), salt, expected.length, N, r, p);

  return timingSafeEqual(derived, expected);
}

export function needsRehash(stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return true;
  const [, nStr, rStr, pStr] = parts;
  return (
    Number(nStr) !== CURRENT_PARAMS.N ||
    Number(rStr) !== CURRENT_PARAMS.r ||
    Number(pStr) !== CURRENT_PARAMS.p
  );
}
