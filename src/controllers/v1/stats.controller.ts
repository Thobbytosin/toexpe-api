import { FastifyReply, FastifyRequest } from "fastify";
import { handleGetStats } from "../../services/stats.service";

export const getStats = async (req: FastifyRequest, reply: FastifyReply) => {
  const { period, type, tz } = req.query as {
    period: "day" | "week" | "month" | "year";
    type: "income" | "expense";
    tz: string;
  };

  const loggedInUser = req.user!;

  const stats = await handleGetStats({
    userId: loggedInUser.id,
    period,
    type,
    timeZone: tz,
  });

  return reply.apiSuccess(stats, "Stats fetched successfully");
};
