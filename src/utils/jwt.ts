import dotenv from "dotenv";
import crypto from "crypto";
import { ENCRYPTION_KEY } from "../config/env";

dotenv.config();

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY = crypto.createHash("sha256").update(ENCRYPTION_KEY!).digest();

export function encryptObjectData(payload: object): string {
  const plaintext = JSON.stringify(payload);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, encrypted, authTag]);

  return combined.toString("base64");
}

export function decryptObjectData(encryptedToken: string): any {
  const data = Buffer.from(encryptedToken, "base64");

  const iv = data.subarray(0, 12);
  const authTag = data.subarray(data.length - 16);
  const encrypted = data.subarray(12, data.length - 16);

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}
