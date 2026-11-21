import {
  JWT_RESET_SECRET_KEY_EXPIRY,
  JWT_SECRET_KEY,
  JWT_VERIFICATION_SECRET_KEY_EXPIRY,
} from "../config/env";
import BlacklistedTokens from "../models/v1/blacklistedTokens.model";
import User from "../models/v1/user.model";
import VerificationTokens from "../models/v1/verificationTokens.model";
import { JwtPayload } from "../types/jwt.types";
import { IUser, IUserRegister } from "../types/user.types";
import ErrorHandler from "./errorHandler";
import { decryptObjectData, encryptObjectData } from "./jwt";
import { decryptData, encryptData } from "./security";
import jwt from "jsonwebtoken";

export function extractBearerToken(authHeader: string): string | undefined {
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
}

export function trimString(word: string): string {
  return word.trim();
}

export function capitalizedText(str: string): string {
  return str
    .replace(/[_-]+/g, " ") // replace _ and - with space
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function createVerificationToken(user: IUserRegister) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // generates random 6 digit code

  // extra security layer
  const encryptedOtp = encryptData(otp);
  const encryptedUser = encryptObjectData(user);

  const payload = encryptObjectData({ user: encryptedUser, otp: encryptedOtp });

  const verificationToken = jwt.sign(
    { data: payload },
    JWT_SECRET_KEY as string,
    { expiresIn: `${JWT_VERIFICATION_SECRET_KEY_EXPIRY as any}m` },
  );

  return { otp: encryptedOtp, verificationToken };
}

export async function isTokenBlacklisted(
  name: string,
  token: string,
): Promise<void> {
  if (!token) {
    throw new ErrorHandler("Unauthorized: No token provided", 403);
  }

  // If Redis is down, fallback to DB
  const isBlacklistedDB = await BlacklistedTokens.findOne({
    where: { token },
  });

  if (isBlacklistedDB) {
    throw new ErrorHandler("Restricted: Token has been revoked", 403);
  }
}

export async function validateVerificationOTP(otp: string, token: string) {
  if (!token) {
    throw new ErrorHandler("OTP has expired", 401);
  }

  if (!otp || otp.trim() === "") {
    throw new ErrorHandler("All fields are required", 400);
  }

  const decodeToken = jwt.verify(token, JWT_SECRET_KEY as string) as JwtPayload;

  const decrypted = decryptObjectData(decodeToken.data);

  if (!decrypted) {
    throw new ErrorHandler("Token is invalid", 400);
  }

  const encryptedVerificationData: { user: string; otp: string } = decrypted;

  const decryptedOTP = decryptData(encryptedVerificationData.otp);

  // otp from the verification tokens record
  const dbOTP = await VerificationTokens.findOne({
    where: { otp: encryptedVerificationData.otp },
  });

  if (!dbOTP)
    throw new ErrorHandler(
      "Your OTP has expired/invalid. Please check again",
      400,
    );

  // check if otp matches
  if (decryptedOTP !== otp) {
    throw new ErrorHandler("You entered a wrong otp", 400);
  }

  const decryptedUser = decryptObjectData(encryptedVerificationData.user);

  return decryptedUser;
}

export const sanitizeUser = (user: User): IUser => {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    avatar: user.avatar,
    wallet: user.wallet,
  };
};

export async function verifyVerificationToken(token: string) {
  if (!token) {
    throw new ErrorHandler("Session has expired", 401);
  }

  const decodeToken = jwt.verify(token, JWT_SECRET_KEY as string) as JwtPayload;

  const decrypted = decryptObjectData(decodeToken.data);

  if (!decrypted) {
    throw new ErrorHandler("Error decrypting token", 403);
  }

  return { tokenValid: true };
}

export const sanitizeUserRegistration = (user: User): IUserRegister => {
  return {
    fullName: user.fullName,
    email: user.email,
    password: user.password,
    acceptedTerms: user.acceptedTerms,
  };
};

export function createResetPasswordToken(user: User) {
  const resetOTP = Math.floor(100000 + Math.random() * 900000).toString();

  // extra security layer
  const encryptedOtp = encryptData(resetOTP);
  const encryptedUser = encryptObjectData(user);

  const payload = encryptObjectData({ user: encryptedUser, otp: encryptedOtp });

  const resetToken = jwt.sign({ data: payload }, JWT_SECRET_KEY as string, {
    expiresIn: `${JWT_RESET_SECRET_KEY_EXPIRY as any}m`,
  });

  return { resetOTP: encryptedOtp, resetToken };
}
