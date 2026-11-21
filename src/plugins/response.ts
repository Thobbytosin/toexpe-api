import fp from "fastify-plugin";
import { FastifyReply } from "fastify";
import ApiResponse from "../utils/apiResponse";

export default fp(async (app) => {
  app.decorateReply(
    "apiSuccess",
    function (
      this: FastifyReply,
      data?: any,
      message?: string,
      statusCode = 200,
    ) {
      return this.code(statusCode).send(
        ApiResponse.success({ data, message, statusCode }),
      );
    },
  );

  app.decorateReply(
    "apiError",
    function (
      this: FastifyReply,
      error?: any,
      message?: string,
      statusCode?: number,
    ) {
      const code = statusCode ?? error?.statusCode ?? 500;
      return this.code(code).send(
        ApiResponse.error({
          message: message ?? error?.message,
          statusCode: code,
        }),
      );
    },
  );
});
