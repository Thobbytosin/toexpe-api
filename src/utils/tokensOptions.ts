import {
  ACCESS_TOKEN_EXPIRATION,
  JWT_RESET_SECRET_KEY_EXPIRY,
  JWT_VERIFICATION_SECRET_KEY_EXPIRY,
  NODE_ENV,
} from "../config/env";
import { ITokenOptions } from "../types/auth.types";

const isProduction = NODE_ENV === "production";

// create the tokens expiration time
const accessTokenExpiration: number = Number(ACCESS_TOKEN_EXPIRATION);

export const verificationTokenOptions: ITokenOptions = {
  maxAge: JWT_VERIFICATION_SECRET_KEY_EXPIRY * 60 * 1000,
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  path: "/",
};

export const passwordResetTokenOptions: ITokenOptions = {
  maxAge: JWT_RESET_SECRET_KEY_EXPIRY! * 60 * 1000,
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  path: "/",
};

// cookies options
export const accessTokenOptions: ITokenOptions = {
  maxAge: accessTokenExpiration * 60 * 1000, // minutes
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  path: "/",
};
