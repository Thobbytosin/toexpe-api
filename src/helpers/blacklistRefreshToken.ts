import jwt from "jsonwebtoken";
import BlacklistedTokens from "../models/v1/blacklistedTokens.model";

export const blacklistRefreshToken = async (token: string) => {
  const decodedRefresh = jwt.decode(token) as jwt.JwtPayload;
  const refreshExp = decodedRefresh?.exp;

  if (!refreshExp) return;

  const refreshTTL = refreshExp - Math.floor(Date.now() / 1000);

  if (refreshTTL <= 0) return;

  // Save to DB
  await BlacklistedTokens.create({
    token,
    expiresAt: new Date(refreshExp * 1000),
  });
};
