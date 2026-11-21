import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import { FastifyReply, FastifyRequest } from "fastify";
import ErrorHandler from "../utils/errorHandler";
import { decryptObjectData } from "../utils/jwt";
import { ACCESS_TOKEN_SECRET_KEY } from "../config/env";
import BlacklistedTokens from "../models/v1/blacklistedTokens.model";
import { JwtPayload } from "../types/jwt.types";
import { handleGetUserInfo } from "../services/user.service";

// Step 1 (your checkBlacklistedTokens): extract the token, reject revoked ones
async function checkBlacklistedTokens(
  req: FastifyRequest,
  _reply: FastifyReply,
) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) throw new ErrorHandler("Unauthorized: Session has ended.", 401);

  req.authToken = token;

  const revoked = await BlacklistedTokens.findOne({
    where: { token },
    attributes: ["id"],
  });

  if (revoked)
    throw new ErrorHandler("Restricted: Token has been revoked", 401);
}

// Step 2 (your isUserAuthenticated): verify, decrypt, check role
async function isUserAuthenticated(req: FastifyRequest, _reply: FastifyReply) {
  const token = req.authToken;
  if (!token) throw new ErrorHandler("You are not currently logged in", 401);

  // throws TokenExpiredError / JsonWebTokenError, which the error plugin maps to 401
  const decoded = jwt.verify(
    token,
    ACCESS_TOKEN_SECRET_KEY as string,
  ) as JwtPayload;

  const decrypted = decryptObjectData(decoded.data);
  if (!decrypted) throw new ErrorHandler("Error decrypting access token", 401);

  const userData: NonNullable<FastifyRequest["userData"]> = decrypted;

  if (userData.role !== "user") {
    throw new ErrorHandler(
      "You are not a registered user on this platform",
      403,
    );
  }

  // Optional: your commented-out single-device session check
  const { user } = await handleGetUserInfo(userData.id);
  if (user.currentSessionId !== userData.sessionId) {
    throw new ErrorHandler("Session expired. Please log in again.", 401);
  }
  req.user = user;

  req.userData = userData;
}

export default fp(async (app) => {
  app.decorateRequest("authToken", null);
  app.decorateRequest("userData", null);
  app.decorateRequest("user", null);

  // Both steps in order: the equivalent of use(checkBlacklistedTokens, isUserAuthenticated)
  app.decorate(
    "authenticate",
    async (req: FastifyRequest, reply: FastifyReply) => {
      await checkBlacklistedTokens(req, reply);
      await isUserAuthenticated(req, reply);
    },
  );
});
