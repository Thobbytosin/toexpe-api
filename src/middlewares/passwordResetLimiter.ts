import { FastifyReply, FastifyRequest } from "fastify";
import ErrorHandler from "../utils/errorHandler";
import { checkUserExistence } from "../validators/user.validator";

export const passwordResetLimiter = async (
  req: FastifyRequest,
  _reply: FastifyReply,
) => {
  const { email } = req.body as { email?: string };

  if (!email) throw new ErrorHandler("Email field is required", 403);

  const user = await checkUserExistence({ email }, true);

  // for first time
  if (user.lastPasswordReset === null) {
    req.user = user;
    return;
  }

  const userLastResetDate: Date = new Date(user.lastPasswordReset || "");

  const presentDate: Date = new Date();

  const timeDifference = presentDate.getTime() - userLastResetDate.getTime();

  const twentFourHours = 24 * 60 * 60 * 1000; // milliseconds

  if (timeDifference > twentFourHours) {
    req.user = user;
    return;
  } else {
    throw new ErrorHandler(
      `You can only reset your password once in 24 hours. Contact support for further assistance`,
      403,
    );
  }
};
