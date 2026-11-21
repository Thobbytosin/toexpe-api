import "reflect-metadata";
import "dotenv/config";
import { getServiceLogger } from "./utils/createLogger";
import {
  connectDB,
  disconnectDB,
  startDbWatchdog,
  syncDatabase,
} from "./config/database";
import { getDbReady } from "./middlewares/dbReady";
import { PORT } from "./config/env";
import { buildApp } from "./app";

const logger = getServiceLogger("server");
let shuttingDown = false;

const startServer = async () => {
  try {
    logger.info("🚀 Starting server initialization...");

    const app = await buildApp();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      if (shuttingDown) return; // ignore repeated signals
      shuttingDown = true;

      logger.warn(`${signal} received. Server shutdown initiated...`);
      try {
        // stops accepting new requests and waits for in-flight ones to finish
        await app.close();

        logger.info("Disconnecting Database...");
        await disconnectDB();

        logger.warn("HTTP server closed. Exiting now.");
        process.exit(0);
      } catch (err: any) {
        logger.error("Error during shutdown: " + err.message);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    // 1. Open the port first (0.0.0.0 so your phone and Render can reach it)
    await app.listen({ port: Number(PORT), host: "0.0.0.0" });
    logger.info(`SERVER IS RUNNING ON PORT ${PORT}`);

    // 2. Connect to DB (authenticate only, fast)
    try {
      await connectDB();

      if (getDbReady()) {
        logger.info("✅ Database CONNECTED");

        // 3. Start the watchdog right after connecting (not after sync)
        startDbWatchdog();

        // 4. Run the slow sync in the background, non-blocking
        syncDatabase()
          .then(() => logger.info("📊 Database fully synced"))
          .catch((err) =>
            logger.error("❌ Background DB sync failed: " + err.message),
          );
      }
    } catch (err: any) {
      logger.error(
        "❌ Could not connect to database on startup: " + err.message,
      );
    }
  } catch (error: any) {
    logger.error("Failed to start server: " + error.message);
    process.exit(1);
  }
};

startServer();
