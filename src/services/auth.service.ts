import {
  BCRYPT_SALT_ROUNDS,
  JWT_RESET_SECRET_KEY_EXPIRY,
  JWT_VERIFICATION_SECRET_KEY_EXPIRY,
  LOCKOUT_DURATION,
  MAX_LOGIN_ATTEMPTS,
} from "../config/env";
import { blacklistToken } from "../helpers/blacklistTokens";
import User from "../models/v1/user.model";
import VerificationTokens from "../models/v1/verificationTokens.model";
import { IUser, IUserRegister } from "../types/user.types";
import ErrorHandler from "../utils/errorHandler";
import {
  createResetPasswordToken,
  createVerificationToken,
  isTokenBlacklisted,
  sanitizeUserRegistration,
  trimString,
  validateVerificationOTP,
  verifyVerificationToken,
} from "../utils/helpers";
import { decryptData } from "../utils/security";
import { getSequelize } from "../utils/sequelize";
import {
  isEmailValid,
  validateRegisterInput,
  validateSignInInput,
} from "../validators/input.validators";
import { checkUserExistence } from "../validators/user.validator";
import bcrypt from "bcryptjs";
import { signInCredentials } from "./signin.service";
import { getServiceLogger } from "../utils/createLogger";
import { FastifyReply } from "fastify";
import { sendVerificationEmail } from "./email.service";
import { v4 as uuidv4 } from "uuid";
import { validatePasswordStrength } from "../validators/password.validator";
import { handleCreateUserWallet } from "./user.service";

const logger = getServiceLogger("auth-service");

export const handleRegisterUser = async (registerData: IUserRegister) => {
  const { fullName, email, password, acceptedTerms } = registerData;

  const inputValidationError = validateRegisterInput(registerData);

  if (inputValidationError) throw new ErrorHandler(inputValidationError, 400);

  await checkUserExistence({ email }, false);

  const hashedPassword = await bcrypt.hash(password.trim(), BCRYPT_SALT_ROUNDS);

  const user: IUserRegister = {
    fullName: trimString(fullName),
    email: trimString(email),
    password: hashedPassword,
    acceptedTerms,
  };

  const { otp, verificationToken } = createVerificationToken(user);

  const decryptedOTP = decryptData(otp); // for mail

  const now = new Date();

  const expiryTime = new Date(
    now.getTime() + JWT_VERIFICATION_SECRET_KEY_EXPIRY * 60 * 1000,
  );

  const sequelize = getSequelize();

  //   create record and user
  await sequelize.transaction(async (transaction) => {
    await VerificationTokens.create(
      {
        otp,
        type: "email-verification",
        expiresAt: expiryTime,
      },
      { transaction },
    );

    await User.create(
      {
        ...user,
      },
      { transaction },
    );
  });

  // send after the response
  setImmediate(() => {
    sendVerificationEmail(user, decryptedOTP)
      .then(() => {
        logger.info(
          `OTP verification: ${decryptedOTP} email sent to: ${user.email}`,
        );
      })
      .catch((error) => {
        logger.error(
          `Failed to send otp verification email to: ${user.email}:`,
          error,
        );
      });
  });

  return { token: verificationToken, user };
};

export const handleEmailVerification = async (
  reply: FastifyReply,
  otp: string,
  token: string,
) => {
  const credentials = await validateVerificationOTP(otp, token);

  // user info from credentials
  const { fullName, email, password, acceptedTerms } =
    credentials as IUserRegister;

  const user = await checkUserExistence({ email }, true);

  if (user.flagged)
    throw new ErrorHandler(
      "Your account is under restriction. Contact support for assistance",
      403,
    );

  if (user.accountVerified)
    throw new ErrorHandler(
      "Your account is already verified. If this is not authorized by you, contact support",
      403,
    );

  const userFields = [
    user.fullName,
    user.email,
    user.password,
    user.acceptedTerms,
  ];
  const credentialFields = [fullName, email, password, acceptedTerms];

  const isMatch = userFields.every(
    (field, index) => field === credentialFields[index],
  );

  // extra security check
  // Handle security mismatch
  if (!isMatch) {
    // Flag user and handle in background to not slow down the error response
    setImmediate(async () => {
      try {
        user.flagged = true;
        await user.save();

        logger.info("User Account flagged due to unmatched credentials");
      } catch (error) {
        logger.error("Failed to flag user account:", error);
      }
    });

    throw new ErrorHandler(
      "Account details do not match. Account has been flagged.",
      403,
    );
  }

  // update user
  user.accountVerified = true;
  await user.save();

  await handleCreateUserWallet(user.id);

  logger.info("Wallet created");

  // // generate credentials
  const { accessToken } = await signInCredentials(reply, "user", user);

  // send after the response
  setImmediate(() => {
    // sendVerificationSuccessEmail(user.firstName, user.email)
    //   .then(() => {
    //     logger.info(`Verification success email sent to ${user.email}`);
    //   })
    //   .catch((error) => {
    //     logger.error(
    //       `Verification success email failed for ${user.email}:`,
    //       error,
    //     );
    //   });

    // blacklist that token
    blacklistToken("verificationToken", token);
  });

  return { user, accessToken };
};

// resend otp service
export const handleResendOTP = async (
  email: string,
  type: "email_verification" | "password_reset",
  existingToken: string,
) => {
  if (!email || !type) {
    throw new ErrorHandler("Email is required", 400);
  }

  if (!existingToken) {
    throw new ErrorHandler(
      "No existing session, kindly initiate a new verification request",
      400,
    );
  }

  await verifyVerificationToken(existingToken);

  // blacklist old token
  await blacklistToken("verificationToken", existingToken);

  const user = await checkUserExistence({ email }, true);

  let otp: string;
  let token: string;
  let expiryTime: Date;

  const now = new Date();

  if (type === "email_verification") {
    if (user.accountVerified) {
      throw new ErrorHandler(
        "Account is already verified. Kindly log in. If this is not authorized by you, contact support.",
        400,
      );
    }

    // generate a new verification otp
    const { otp: verifyOtp, verificationToken } = createVerificationToken(
      sanitizeUserRegistration(user),
    );

    otp = verifyOtp;
    token = verificationToken;

    expiryTime = new Date(
      now.getTime() + JWT_VERIFICATION_SECRET_KEY_EXPIRY * 60 * 1000,
    );
  } else if (type === "password_reset") {
    // generate the reset token and code
    const { resetOTP, resetToken } = createResetPasswordToken(user);

    otp = resetOTP;
    token = resetToken;

    expiryTime = new Date(
      now.getTime() + JWT_RESET_SECRET_KEY_EXPIRY * 60 * 1000,
    );
  } else {
    // This ensures TypeScript knows all cases are handled
    throw new ErrorHandler("Invalid OTP type", 400);
  }

  // for mail
  const decryptedOTP = decryptData(otp);

  // create record
  await VerificationTokens.create({
    otp,
    type: "resend-otp",
    expiresAt: expiryTime,
  });

  // send after the response
  setImmediate(() => {
    sendVerificationEmail(user, decryptedOTP)
      .then(() => {
        logger.info(
          `OTP verification: ${decryptedOTP} email sent to: ${user.email}`,
        );
      })
      .catch((error) => {
        logger.error(
          `Failed to send otp verification email to: ${user.email}:`,
          error,
        );
      });
  });

  return { newToken: token };
};

// login service
export const handleLogin = async (
  body: { email: string; password: string },
  reply: FastifyReply,
) => {
  const { email, password } = body;

  const errorMessage = validateSignInInput({ email, password });
  if (errorMessage) throw new ErrorHandler(errorMessage, 400);

  // 🔥 Run user fetch + settings fetch in parallel
  const [user] = await Promise.all([checkUserExistence({ email }, true)]);

  // --- Account status guards (cheap, no DB) ---
  if (user.deactivated)
    throw new ErrorHandler(
      "Your account has been temporarily suspended. Kindly contact support for assistance",
      403,
    );

  if (user.flagged)
    throw new ErrorHandler(
      "Your account has been temporarily locked for suspicious activity. Kindly contact support for assistance",
      403,
    );

  // --- Lockout check ---
  const now = new Date();
  const isCurrentlyLocked =
    user.lockoutUntil && new Date(user.lockoutUntil) > now;

  if (isCurrentlyLocked) {
    const diffMs = new Date(user.lockoutUntil!).getTime() - Date.now();
    const remainingMinutes = Math.ceil(diffMs / 60_000);

    logger.warn(`Login attempt on locked account`, {
      email: user.email,
      remainingMinutes,
      totalAttempts: user.loginAttempts || 0,
    });

    throw new ErrorHandler(
      `Account is temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minute(s).`,
      423,
    );
  }

  // Reset expired lockout + run bcrypt in parallel — no wasted wait
  const [isPasswordSame] = await Promise.all([
    bcrypt.compare(password, user.password),
    user.lockoutUntil // lockout just expired
      ? ((user.lockoutUntil = null), (user.loginAttempts = 0), user.save())
      : Promise.resolve(),
  ]);

  // --- Wrong password ---
  if (!isPasswordSame) {
    user.loginAttempts += 1;

    logger.warn(`Failed login attempt`, {
      email: user.email,
      attempt: user.loginAttempts,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
    });

    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION);
      await user.save();

      const lockoutMinutes = Math.ceil(LOCKOUT_DURATION / (1000 * 60)); // Convert milliseconds to minutes

      logger.error(`Account locked automatically`, {
        email: user.email,
        totalAttempts: user.loginAttempts,
        lockoutUntil: user.lockoutUntil,
        lockoutDuration: lockoutMinutes,
      });

      setImmediate(() => {
        logger.info("Account lock notification mail");
        // sendAccountLockoutNotification(user.email, user.lockoutUntil, user.loginAttempts);
      });

      throw new ErrorHandler(
        `Account locked due to ${user.loginAttempts} failed login attempts. Try again in ${lockoutMinutes} minutes.`,
        423,
      );
    }

    await user.save();

    const remainingAttempts = MAX_LOGIN_ATTEMPTS - user.loginAttempts;
    throw new ErrorHandler(
      `Invalid credentials. ${remainingAttempts} attempts remaining before account lockout.`,
      422,
    );
  }

  // --- Unverified account ---
  if (!user.accountVerified) {
    // Run token generation + credential signing in parallel
    const [{ accessToken }, { otp, verificationToken }] = await Promise.all([
      signInCredentials(reply, "user", user),
      Promise.resolve(createVerificationToken(sanitizeUserRegistration(user))),
    ]);

    const decryptedOTP = decryptData(otp);
    const expiryTime = new Date(
      now.getTime() + JWT_VERIFICATION_SECRET_KEY_EXPIRY * 60 * 1000,
    );

    // 🔥 Don't await this — fire and continue
    setImmediate(async () => {
      await VerificationTokens.create({
        otp,
        type: "resend-otp",
        expiresAt: expiryTime,
      });

      sendVerificationEmail(user, decryptedOTP)
        .then(() => {
          logger.info(
            `OTP verification: ${decryptedOTP} email sent to: ${user.email}`,
          );
        })
        .catch((error) => {
          logger.error(
            `Failed to send otp verification email to: ${user.email}:`,
            error,
          );
        });
    });

    return { user, verificationToken, accessToken };
  }

  // --- Successful login ---
  // Batch all user mutations into one save
  user.loginCount = user.accountVerified ? user.loginCount + 1 : 0;
  user.loginAttempts = 0;
  user.lastLogin = now;
  if (user.resetTokenVerified) user.resetTokenVerified = false;
  user.lockoutUntil = null;

  // Generate a new session ID for the user
  const sessionId = uuidv4();
  user.currentSessionId = sessionId;

  // 🔥 Run save + credential signing in parallel
  const [{ accessToken }] = await Promise.all([
    signInCredentials(reply, "user", user),
    user.save(),
  ]);

  setImmediate(async () => {
    logger.info("User cache set");
  });

  return { user, accessToken, isAccountVerified: true };
};

// forot password service
export const handleForgotPassword = async (email: string) => {
  if (!email) throw new ErrorHandler("Email is required", 400);

  if (!isEmailValid.test(email))
    throw new ErrorHandler("Enter a valid email address", 400);

  const user = await checkUserExistence({ email }, true);

  if (user.deactivated)
    throw new ErrorHandler(
      "Your account has been temporarily deactivated. Kindly contact support for assistance",
      403,
    );

  if (user.flagged)
    throw new ErrorHandler(
      "Your account has been temporarily locked for suspicious activity. Kindly contact support for assistance",
      403,
    );

  if (user.loginLockedTimes >= 2)
    throw new ErrorHandler(
      "Your account has been temporarily locked for breaking the login attempts limit. Kindly contact support for assistance",
      423,
    );

  // generate the reset token and code
  const { resetOTP, resetToken } = createResetPasswordToken(user);

  const now = new Date();

  const expiryTime = new Date(
    now.getTime() + JWT_RESET_SECRET_KEY_EXPIRY * 60 * 1000,
  );

  // create record
  await VerificationTokens.create({
    otp: resetOTP,
    type: "forgot-password",
    expiresAt: expiryTime,
  });

  const decryptedOTP = decryptData(resetOTP); // for mail

  // send email after response
  setImmediate(async () => {
    try {
      // await sendPasswordResetEmail(user, decryptedOTP, url);
      logger.info(
        `PASSWORD RESET OTP: ${decryptedOTP} email sent to: ${user.email}`,
      );
      logger.info(`Password reset email sent`);
    } catch (error) {
      logger.warn("Failed to send password reset email: " + error);
    }
  });

  return { token: resetToken, user };
};

// verify reset password token
export const handleVerifyResetPasswordToken = async (
  otp: string,
  token: string,
) => {
  if (!token) {
    throw new ErrorHandler("No session authorization token", 400);
  }

  await isTokenBlacklisted("resetToken", token);

  //  validate otp
  const credentials = await validateVerificationOTP(otp, token);

  const { email } = credentials as unknown as IUser;

  const user = await checkUserExistence({ email }, true);

  // set the user resetTokenVerified to true
  user.resetTokenVerified = true;

  await user.save();

  return { user, token };
};

// reset password
export const handleResetPassword = async (
  newPassword: string,
  confirmPassword: string,
  email: string,
  token: string,
) => {
  await isTokenBlacklisted("resetToken", token);
  //   validate password
  const errorMessage = validatePasswordStrength(newPassword);
  if (errorMessage) {
    throw new ErrorHandler(errorMessage, 400);
  }

  if (newPassword !== confirmPassword) {
    throw new ErrorHandler("Password and Confirm password do not match", 400);
  }

  const user = await checkUserExistence({ email }, true);

  if (user.flagged)
    throw new ErrorHandler(
      "Your account is under restriction. Contact support for assistance",
      404,
    );

  if (user.loginLockedTimes >= 2)
    throw new ErrorHandler(
      "Your account has been temporarily locked for breaking the login attempts limit. Kindly contact support for assistance",
      423,
    );

  if (!user.resetTokenVerified) {
    throw new ErrorHandler("Session has expired.", 400);
  }

  const timestamp = new Date();
  // encrypt password
  const encryptedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  // set the user last password reset time
  user.lastPasswordReset = timestamp;
  user.passwordResetAttempt = user.passwordResetAttempt + 1;
  user.resetTokenVerified = false;

  // set the password as the new user password
  user.password = encryptedPassword;
  await user.save();

  setImmediate(async () => {
    try {
      // await sendPasswordResetSuccessEmail(user.firstName, user.email, url);
      // blacklist that token
      blacklistToken("resetToken", token);
      logger.info(`Password reset success email sent successfully`);
    } catch (error) {
      logger.warn("Password reset success mail not sent: " + error);
    }
  });
};
