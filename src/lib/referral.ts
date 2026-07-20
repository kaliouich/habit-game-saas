import { randomBytes } from "node:crypto";

// Sans caractères ambigus (0/O, 1/I/L) — codes lisibles à l'oral/à l'écrit.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(length = 7): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}
