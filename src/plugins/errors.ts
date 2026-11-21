import { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import ErrorHandler from "../utils/errorHandler";
import { NODE_ENV } from "../config/env";
import { getServiceLogger } from "../utils/createLogger";

const logger = getServiceLogger("central-app-error");

// Same mappings as your old centralAppErrors, as a pure function
function normalizeError(err: any): ErrorHandler {
  // someone threw a string or other non-object
  if (typeof err !== "object" || err === null) {
    return new ErrorHandler(String(err), 500);
  }

  const name: string = err.name ?? "";
  const message: string =
    err.message || "Something went wrong. Please try again later.";
  const statusCode: number = err.statusCode || 500;

  // validation (zod, thrown from route handlers)
  if (err instanceof ZodError) {
    return new ErrorHandler(err.issues[0]?.message ?? "Invalid request", 400);
  }

  // JWT
  if (name === "TokenExpiredError" || message === "jwt expired") {
    return new ErrorHandler("Session ID has expired", 401);
  }
  if (message === "jwt must be provided") {
    return new ErrorHandler("Session has no valid ID.", 401);
  }
  if (message === "invalid signature") {
    return new ErrorHandler("Session is not authorized.", 401);
  }
  if (name === "JsonWebTokenError") {
    return new ErrorHandler("Session can not be validated.", 401);
  }

  // Database
  if (name === "SequelizeHostNotFoundError") {
    return new ErrorHandler(
      "Network error. Please check you network and reconnect",
      503,
    );
  }
  if (name === "SequelizeDatabaseError") {
    return new ErrorHandler(
      "Something went wrong while processing your request. Please try again.",
      500,
    );
  }
  if (message.startsWith("ConnectionManager.getConnection")) {
    return new ErrorHandler(
      "Database is busy. Please try again in a moment.",
      503,
    );
  }
  if (name === "SequelizeUniqueConstraintError") {
    return new ErrorHandler("This record already exists.", 409);
  }

  // Everything else: ErrorHandler instances and Fastify's own errors
  // (413 body too large, 429 rate limit, 400 bad JSON) keep their status and message.
  // Unexpected raw errors (TypeError, etc.) must not leak details in production.
  if (
    statusCode >= 500 &&
    !(err instanceof ErrorHandler) &&
    NODE_ENV === "production"
  ) {
    return new ErrorHandler(
      "Something went wrong. Please try again later.",
      statusCode,
    );
  }

  return new ErrorHandler(message, statusCode);
}

export function registerErrorHandlers(app: FastifyInstance) {
  app.setErrorHandler((err, _request, reply) => {
    if (NODE_ENV === "development") console.log(err);

    const error = normalizeError(err);

    if (error.statusCode >= 500) logger.error(error.message);
    else logger.warn(error.message);

    return reply.apiError(error);
  });

  app.setNotFoundHandler((_req, reply) => {
    return reply.apiError(
      new ErrorHandler("The requested resource could not be found", 404),
    );
  });
}
