import nodemailer from "nodemailer";
import path from "path";
import ejs from "ejs";
import {
  NODE_ENV,
  SMTP_HOST,
  SMTP_PASSWORD,
  SMTP_PRODUCTION_PORT,
  SMTP_USER,
} from "./env";
import { getServiceLogger } from "../utils/createLogger";

interface EmailOptions {
  email: string;
  subject: string;
  templateName: string;
  transactional?: boolean;
  templateData: Record<string, any>;
  templateDir: string;
  attachments?: any;
}

const isProduction = NODE_ENV === "production";

const logger = getServiceLogger("mail-config");

const mailConfig = async (options: EmailOptions) => {
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PRODUCTION_PORT,
      secure: true,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
      logger: true,
    });

    // 1. Define global attachments (Logo)
    // Adjust the path to correctly point from this config file to your public folder
    const brandingAttachments = [
      {
        filename: "logo.png",
        path: path.join(__dirname, "../public/images/logo.png"),
        cid: "toexpe_logo",
      },
    ];

    const templatePath = path.join(options.templateDir, options.templateName);

    const html: string = await ejs.renderFile(
      templatePath,
      options.templateData,
    );

    const mailOptions = {
      from: SMTP_USER,
      to: options.email,
      subject: options.subject,
      html,
      attachments: [...brandingAttachments, ...(options.attachments || [])],
    };

    // send the mail
    const info = await transporter.sendMail(mailOptions);

    logger.info("Email sent successfully ✔️");
    return info;
  } catch (error: any) {
    logger.error(`Error sending email:", ${error?.message || error}`);
  }
};

export default mailConfig;
