import dotenv from "dotenv";

// LOAD ENVIRONMENT VARIABLES
dotenv.config();

export const NODE_ENV = process.env.NODE_ENV;
export const PORT = process.env.PORT;
export const LOG_LEVEL = process.env.LOG_LEVEL;
export const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS!, 10);

// DATABASE
export const DATABASE_URL = process.env.DATABASE_URL;
export const DATABASE_NAME = process.env.DB_NAME;
export const DATABASE_USERNAME = process.env.DB_USER;
export const DATABASE_PASSWORD = process.env.DB_PASSWORD;
export const DATABASE_HOST = process.env.DB_HOST;
export const DATABASE_PORT = parseInt(process.env.DB_PORT || "", 10);

// URL
export const CORS_ORIGINS = process.env.CORS_ORIGINS;

// COOKIE_SECRET
export const COOKIE_SECRET = process.env.COOKIE_SECRET;

// JWT
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
export const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET!;

export const ACCESS_TOKEN_SECRET_KEY = process.env.ACCESS_TOKEN_SECRET_KEY;
export const ACCESS_TOKEN_EXPIRATION = process.env.ACCESS_TOKEN_EXPIRATION!;

export const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY;
export const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION!;

export const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

export const JWT_VERIFICATION_SECRET_KEY_EXPIRY = parseInt(
  process.env.JWT_VERIFICATION_SECRET_KEY_EXPIRY!,
);

export const JWT_RESET_SECRET_KEY_EXPIRY = parseInt(
  process.env.JWT_RESET_SECRET_KEY_EXPIRY!,
);

//   EMAILS
export const SMTP_HOST = process.env.SMTP_HOST;
export const SMTP_PRODUCTION_PORT = parseInt(
  process.env.SMTP_PRODUCTION_PORT!,
  10,
);
export const SMTP_DEVELOPMENT_PORT = parseInt(
  process.env.SMTP_DEVELOPMENT_PORT!,
  10,
);
export const SMTP_USER = process.env.SMTP_USER;
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
export const SMTP_SERVICE = process.env.SMTP_SERVICE;
export const SUPPORT_EMAIL_URL = process.env.SUPPORT_EMAIL_URL;

export const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET!;
export const UNSUBSCRIBE_EXPIRY = process.env.UNSUBSCRIBE_EXPIRY!;

// STATIC
export const LOGO_URL = process.env.LOGO_URL;

// PASSWORD HASH
export const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS!);

// LOGINS
export const LOCKOUT_DURATION =
  parseInt(process.env.LOCKOUT_DURATION!) * 60 * 1000; // convert minutes to milliseconds

// GOOGLE
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

// CLOUDINARY
export const CLOUDINARY_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_SECRET = process.env.CLOUDINARY_API_SECRET;
export const CLOUDINARY_KEY = process.env.CLOUDINARY_API_KEY;
