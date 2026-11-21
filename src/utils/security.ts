import crypto from "crypto";
import ErrorHandler from "./errorHandler";
import { ENCRYPTION_SECRET } from "../config/env";

const secret = Buffer.from(ENCRYPTION_SECRET!, "base64");

export const encryptData = (plainText: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(secret), iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
};

export const decryptData = (encryptedData: string | null): string => {
  if (!encryptedData) return "Null data";

  const [ivHex, encryptedText] = encryptedData.split(":");

  if (!ivHex || !encryptedText) {
    throw new ErrorHandler("Invalid encrypted data format", 400);
  }

  const iv = Buffer.from(ivHex, "hex");
  if (iv.length !== 16) {
    throw new ErrorHandler("Invalid IV length: expected 16 bytes", 400);
  }

  const decipher = crypto.createDecipheriv("aes-256-cbc", secret, iv);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
