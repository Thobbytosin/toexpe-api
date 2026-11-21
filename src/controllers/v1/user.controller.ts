import { FastifyReply, FastifyRequest } from "fastify";
import ErrorHandler from "../../utils/errorHandler";
import { IUser } from "../../types/user.types";
import { extractBearerToken, sanitizeUser } from "../../utils/helpers";
import { handleSignOutUser } from "../../services/user.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("user-controller");

// 1. Logout
export const logoutUser = async (req: FastifyRequest, reply: FastifyReply) => {
  if (!req.user || !req.authToken)
    throw new ErrorHandler("You are not currently logged in", 401);

  if (!req.user || !req.authToken)
    throw new ErrorHandler("You are not currently logged in", 401);

  const loggedInUser: IUser = sanitizeUser(req.user);

  await handleSignOutUser({
    accessToken: req.authToken,
    userId: loggedInUser.id,
  });

  logger.info(`User ${loggedInUser.email} has signed out successfully`);

  return reply.apiSuccess(null, "You have signed out successfully");
};

//2. Get User
export const getUserData = async (req: FastifyRequest, reply: FastifyReply) => {
  const user = req.user;
  const token = req.authToken;

  if (!user || !token)
    throw new ErrorHandler("You are not currently logged in", 401);

  logger.info("User profile fetched");

  return reply.apiSuccess({ user: sanitizeUser(user), token: token });
};
