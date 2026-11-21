import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import compress from "@fastify/compress";
import rateLimit from "@fastify/rate-limit";
import { CORS_ORIGINS, LOG_LEVEL } from "./config/env";
import { dbHook } from "./middlewares/dbReady";
import authRoutesV1 from "./routes/v1/authentication.route";
import { registerErrorHandlers } from "./plugins/errors";
import responsePlugin from "./plugins/response";
import authPlugin from "./plugins/auth";
import userRoutesV1 from "./routes/v1/user.route";

const allowedOrigins = (CORS_ORIGINS ?? "")
  .split(",")
  .map((o: string) => o.trim())
  .filter(Boolean);

export async function buildApp() {
  const app = Fastify({
    logger: { level: LOG_LEVEL ?? "info" },
    trustProxy: "1", // Render sits behind one proxy
    bodyLimit: 100 * 1024, // 100kb, down from 50mb
  });

  // 1. Security and transport
  await app.register(helmet);
  await app.register(cors, {
    origin: allowedOrigins.length ? allowedOrigins : false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await app.register(compress);
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
  });

  // 2. Shared helpers: reply.success(), app.authenticate, error handlers
  await app.register(responsePlugin);
  await app.register(authPlugin);
  registerErrorHandlers(app);

  // 3. Open routes: no DB needed, no rate limit, quiet logs (uptime pingers hit these)
  const open = {
    logLevel: "warn" as const,
    config: { rateLimit: false as const },
  };

  app.get("/favicon.ico", open, async (_req, reply) => reply.code(204).send());
  app.get("/api", open, async () => "Welcome to TOEXPE API");
  app.get("/api/ping", open, async () => "pong");
  app.get("/api/health", open, async (_req, reply) =>
    reply.apiSuccess(null, "API is healthy"),
  );

  // 4. API routes: the DB-ready check applies only inside this scope
  await app.register(
    async (api) => {
      api.addHook("onRequest", dbHook);
      await api.register(authRoutesV1, { prefix: "/auth" });
      await api.register(userRoutesV1, { prefix: "/user" });
    },
    { prefix: "/api/v1" },
  );

  return app;
}
