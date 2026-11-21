import { FastifyReply } from "fastify";
import User from "../models/v1/user.model";
import { encryptObjectData } from "../utils/jwt";
import {
  ACCESS_TOKEN_EXPIRATION,
  ACCESS_TOKEN_SECRET_KEY,
} from "../config/env";
import jwt from "jsonwebtoken";
import ErrorHandler from "../utils/errorHandler";

export interface TokenResponse {
  type: "user";
  accessToken: string;
}

export const signInCredentials = async (
  reply: FastifyReply,
  type: "user",
  user: User,
): Promise<TokenResponse> => {
  let payload: any;

  payload = encryptObjectData({
    id: user.id,
    role: "user",
    sessionId: user.currentSessionId,
    onboardingComplete: user.onboardingComplete,
  });

  let accessToken: string;

  switch (type) {
    case "user":
      accessToken = jwt.sign(
        { data: payload, typ: "user" },
        ACCESS_TOKEN_SECRET_KEY as string,
        { expiresIn: `${ACCESS_TOKEN_EXPIRATION as any}d` },
      );
      break;

    default:
      throw new ErrorHandler("Unrecognized type", 403);
  }

  return { type, accessToken };
};
