import { FastifyReply, FastifyRequest } from "fastify";
import ErrorHandler from "../utils/errorHandler";
import { checkUserExistence } from "../validators/user.validator";

const DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * DAY_MS;

export async function emailChangeLimiter(
  req: FastifyRequest,
  _reply: FastifyReply,
) {
  const { oldEmail, newEmail } = (req.body ?? {}) as {
    oldEmail?: string;
    newEmail?: string;
  };

  if (!oldEmail || !newEmail) {
    throw new ErrorHandler("Email fields are required", 400);
  }

  const user = await checkUserExistence({ email: oldEmail }, true);

  // the account must belong to the logged-in user (needs the authenticate hook first)
  if (req.userData && user.id !== req.userData.id) {
    throw new ErrorHandler("You can only change your own email", 403);
  }

  // first time ever, or never set
  if (user.lastEmailReset == null) {
    req.user = user;
    return;
  }

  const elapsed = Date.now() - new Date(user.lastEmailReset).getTime();

  if (elapsed > THIRTY_DAYS_MS) {
    req.user = user;
    return;
  }

  const daysRemaining = Math.ceil((THIRTY_DAYS_MS - elapsed) / DAY_MS);

  throw new ErrorHandler(
    `You can only change your email once in 30 days. Please try again in ${daysRemaining} day(s). Contact support for further assistance`,
    400,
  );
}
