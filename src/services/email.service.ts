import mailConfig from "../config/mailConfig";
import { IUserRegister } from "../types/user.types";
import path from "path";

const mailDirectory = path.resolve(__dirname, "../views/emails");

export const sendVerificationEmail = async (
  user: IUserRegister,
  otp: string,
): Promise<void> => {
  const mailData: { name: string; otp: string } = {
    name: user.fullName,
    otp,
  };

  await mailConfig({
    email: user.email,
    subject: "Email Verification",
    templateName: "verify-email.ejs",
    templateData: mailData,
    templateDir: mailDirectory,
  });
};
