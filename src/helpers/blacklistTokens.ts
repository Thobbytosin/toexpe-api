import BlacklistedTokens from "../models/v1/blacklistedTokens.model";
import jwt from "jsonwebtoken";
import { getServiceLogger } from "../utils/createLogger";

const logger = getServiceLogger("BLACKLISTED-TOKEN");

export const blacklistToken = async (name: string, token: string) => {
  const decoded = jwt.decode(token) as jwt.JwtPayload;
  const exp = decoded?.exp;

  if (!exp) return;

  const ttl = exp - Math.floor(Date.now() / 1000);
  if (ttl <= 0) return; // already expired

  // Save to DB safely (idempotent)
  await BlacklistedTokens.findOrCreate({
    where: { token },
    defaults: {
      token,
      expiresAt: new Date(exp * 1000),
    },
  });

  logger.info(`Blacklisted ${name} with TTL of ${ttl} seconds`);
};
