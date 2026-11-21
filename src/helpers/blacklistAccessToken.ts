import BlacklistedTokens from "../models/v1/blacklistedTokens.model";
import jwt from "jsonwebtoken";

export const blacklistAccessToken = async (token: string) => {
  const decoded = jwt.decode(token) as jwt.JwtPayload;
  const exp = decoded?.exp;

  if (!exp) return;

  const ttl = exp - Math.floor(Date.now() / 1000);
  if (ttl <= 0) return; // has already expired

  // Save to DB
  await BlacklistedTokens.create({
    token,
    expiresAt: new Date(exp * 1000),
  });
};
