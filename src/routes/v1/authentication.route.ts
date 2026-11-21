import { FastifyPluginAsync } from "fastify";
import {
  forgotUserPassword,
  loginUser,
  registerUser,
  resendOTP,
  resetUserPassword,
  verifyResetPasswordToken,
  verifyUserEmail,
} from "../../controllers/v1/auth.controller";
import { passwordResetLimiter } from "../../middlewares/passwordResetLimiter";

const authRoutesV1: FastifyPluginAsync = async (app) => {
  // Stricter limits than the global 300/min, to slow down brute-force attempts
  const registerLimit = {
    config: { rateLimit: { max: 10, timeWindow: "5 minutes" } },
  };
  const verifyLimit = {
    config: { rateLimit: { max: 15, timeWindow: "5 minutes" } },
  };
  const passwordResetLimit = {
    config: { rateLimit: { max: 15, timeWindow: "5 minutes" } },
    preHandler: passwordResetLimiter,
  };

  app.post("/register", registerLimit, registerUser);
  app.post("/verify-email", verifyLimit, verifyUserEmail);
  app.post("/resend-otp", verifyLimit, resendOTP);
  app.post("/login", verifyLimit, loginUser);
  app.post("/forgot-password", passwordResetLimit, forgotUserPassword);
  app.post(
    "/verify-reset-password-token",
    verifyLimit,
    verifyResetPasswordToken,
  );
  app.post("/reset-password", verifyLimit, resetUserPassword);
};

export default authRoutesV1;
