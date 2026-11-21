import "fastify";
import ErrorHandler from "../utils/errorHandler";
import User from "../models/v1/user.model";

declare module "fastify" {
  interface FastifyRequest {
    user: User | null;
    userData: { id: string; role: string; sessionId: string } | null;
    authToken: string | null;
  }

  interface FastifyReply {
    apiSuccess(data?: any, message?: string, statusCode?: number): FastifyReply;
    apiError(
      error?: ErrorHandler,
      message?: string,
      statusCode?: number,
    ): FastifyReply;
  }

  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
