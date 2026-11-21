import { FastifyReply, FastifyRequest } from "fastify";
import {
  handleEmailVerification,
  handleForgotPassword,
  handleLogin,
  handleRegisterUser,
  handleResendOTP,
  handleResetPassword,
  handleVerifyResetPasswordToken,
} from "../../services/auth.service";
import { getServiceLogger } from "../../utils/createLogger";
import { IUserRegister } from "../../types/user.types";
import { sanitizeUser } from "../../utils/helpers";

const logger = getServiceLogger("auth-controller");

export const registerUser = async (
  req: FastifyRequest<{ Body: IUserRegister }>,
  reply: FastifyReply,
) => {
  const { token, user } = await handleRegisterUser(req.body);

  logger.info(`Verification code sent to user's email: ${user.email}`);

  return reply.apiSuccess(
    { token, email: user.email },
    "A verification code has been sent to your email. Please check your inbox and verify your account.",
    201,
  );
};

export const verifyUserEmail = async (
  req: FastifyRequest<{ Body: { otp: string; token: string } }>,
  reply: FastifyReply,
) => {
  const { otp, token } = req.body;

  const { accessToken, user } = await handleEmailVerification(
    reply,
    otp,
    token,
  );

  return reply.apiSuccess(
    { accessToken, user: sanitizeUser(user) },
    "Your email has been successfully verified.",
  );
};

// 3. Resend OTP
export const resendOTP = async (
  req: FastifyRequest<{
    Body: {
      email: string;
      type: "email_verification" | "password_reset";
      existingToken: string;
    };
  }>,
  reply: FastifyReply,
) => {
  const { email, type, existingToken } = req.body;

  const { newToken } = await handleResendOTP(email, type, existingToken);

  return reply.apiSuccess(
    { token: newToken, email },
    "A new One Time Password (OTP) has been sent to your email address.",
  );
};

// 4. Login User
export const loginUser = async (
  req: FastifyRequest<{ Body: { email: string; password: string } }>,
  reply: FastifyReply,
) => {
  const { email, password } = req.body;

  const { user, accessToken, verificationToken } = await handleLogin(
    { email, password },
    reply,
  );

  logger.info("You have signed in successfully");

  return reply.apiSuccess(
    {
      user: sanitizeUser(user),
      verificationToken: verificationToken ? verificationToken : null,
      accessToken,
    },
    `Welcome back, ${user.fullName.split(" ")[0]}! You have signed in successfully.`,
  );
};

// 5. Forgot Password
export const forgotUserPassword = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  const { email } = req.body as { email: string };

  const { token, user } = await handleForgotPassword(email);

  return reply.apiSuccess(
    { token, email: user.email },
    "A Password Reset One-Time-Password has been sent to your email.",
  );
};

// 6. Verify Reset Password token
export const verifyResetPasswordToken = async (
  req: FastifyRequest<{ Body: { otp: string; token: string } }>,
  reply: FastifyReply,
) => {
  const { token, user } = await handleVerifyResetPasswordToken(
    req.body.otp,
    req.body.token,
  );

  return reply.apiSuccess(
    { token, email: user.email },
    "OTP verified successfully.",
    200,
  );
};

// 7. Reset Password
export const resetUserPassword = async (
  req: FastifyRequest<{
    Body: {
      newPassword: string;
      confirmPassword: string;
      email: string;
      token: string;
    };
  }>,
  reply: FastifyReply,
) => {
  await handleResetPassword(
    req.body.newPassword,
    req.body.confirmPassword,
    req.body.email,
    req.body.token,
  );

  return reply.apiSuccess(
    null,
    "Your password has been updated successfully. Proceed to login.",
  );
};
