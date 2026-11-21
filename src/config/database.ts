import { setDbReady } from "../middlewares/dbReady";
import User from "../models/v1/user.model";
import { getServiceLogger } from "../utils/createLogger";
import { getSequelize, resetSequelize } from "../utils/sequelize";
import { NODE_ENV } from "./env";

const logger = getServiceLogger("database");

const isProduction = NODE_ENV === "production";

// Fast — just verifies connection, sets dbReady, starts retry loop
export const connectDB = async (): Promise<void> => {
  const initialDelay = 5000;
  const maxDelay = 30000;
  const factor = 2;
  let delay = initialDelay;

  while (true) {
    try {
      const newSequelize = getSequelize();
      logger.info("📊 Attempting DB connection...");

      await newSequelize.authenticate(); // ✅ fast — just a ping

      setDbReady(true);
      return;
    } catch (error: any) {
      setDbReady(false);
      let friendlyMessage = "Unknown DB connection error";

      if (error?.name === "SequelizeConnectionRefusedError") {
        friendlyMessage =
          "Database is still sleeping or refusing connections ❌";
      } else if (error?.name === "SequelizeConnectionTimedOutError") {
        friendlyMessage = "Database connection attempt timed out ⏱️";
      } else if (error?.name === "SequelizeHostNotFoundError") {
        friendlyMessage =
          "Database host not found 🔍 — check your DATABASE_URL";
      } else if (error?.name === "SequelizeHostNotReachableError") {
        friendlyMessage =
          "Database host not reachable 🌐 — possible network/VPC issue";
      } else if (error?.name === "SequelizeInvalidConnectionError") {
        friendlyMessage = "Invalid DB connection parameters ⚙️";
      }

      logger.error(`❌ DB connection failed: ${friendlyMessage}`);
      logger.warn(`🔄 Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * factor, maxDelay);
    }
  }
};

// Slow — runs in background, non-blocking
export const syncDatabase = async (): Promise<void> => {
  const newSequelize = getSequelize();
  const queryInterface = newSequelize.getQueryInterface();
  const start = Date.now();

  if (isProduction) {
    logger.debug("LIVE: Database syncing...");
    const tablesBefore: string[] = await queryInterface.showAllTables();

    // Targeted syncs
    // await User.sync({ alter: true });

    const tablesAfterSync: string[] = await queryInterface.showAllTables();
    const newlyCreated = tablesAfterSync.filter(
      (t) => !tablesBefore.includes(t),
    );

    if (tablesBefore.length === 0) {
      await newSequelize.sync({ force: false });
      const tablesAfter: string[] = await queryInterface.showAllTables();
      logger.info(
        `LIVE: ${tablesAfter.length} new table(s) created: [${tablesAfter.join(", ")}]`,
      );
    } else {
      if (newlyCreated.length > 0) {
        logger.info(
          `LIVE: ${newlyCreated.length} new table(s) added: [${newlyCreated.join(", ")}]`,
        );
      }
      logger.info(`LIVE: Total tables in DB: ${tablesAfterSync.length}`);
    }
  } else {
    logger.debug("⏳ DEV: Database syncing...");
    const tablesBefore: string[] = await queryInterface.showAllTables();

    const executedQueries: string[] = [];

    await newSequelize.sync({
      alter: true,
      logging: (sql: string) => {
        executedQueries.push(sql);
      },
    });

    const tablesAfter: string[] = await queryInterface.showAllTables();
    const newlyCreated = tablesAfter.filter((t) => !tablesBefore.includes(t));

    // Extract table names touched by ALTER TABLE statements (existing tables modified)
    const alteredTables = new Set<string>();
    const createdTables = new Set<string>();

    for (const sql of executedQueries) {
      const alterMatch = sql.match(/ALTER TABLE\s+"?(\w+)"?/i);
      if (alterMatch) alteredTables.add(alterMatch[1]);

      const createMatch = sql.match(
        /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"?(\w+)"?/i,
      );
      if (createMatch) createdTables.add(createMatch[1]);
    }

    if (newlyCreated.length > 0) {
      logger.info(
        `✅ DEV: ${newlyCreated.length} new table(s) created: [${newlyCreated.join(", ")}]`,
      );
    }

    if (alteredTables.size > 0) {
      logger.info(
        `🔧 DEV: ${alteredTables.size} existing table(s) altered: [${[...alteredTables].join(", ")}]`,
      );
    } else {
      logger.debug(
        "DEV: No existing tables had ALTER statements run against them.",
      );
    }

    logger.info(`✅ DEV: Total tables in DB: ${tablesAfter.length}`);
  }

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  logger.info(`✅ Database SYNC COMPLETE (took ${duration}s)`);
};

let reconnecting = false;

let watchdogInterval: NodeJS.Timeout | null = null;

export const startDbWatchdog = (
  interval = isProduction ? 120000 : 15000,
  pingTimeout = 10000,
) => {
  const pingLoop = async () => {
    try {
      // ✅ Get FRESH instance every time
      const sequelize = getSequelize();

      // Ping DB with timeout protection
      await Promise.race([
        sequelize.query("SELECT 1"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("DB ping timeout")), pingTimeout),
        ),
      ]);

      setDbReady(true);
      logger.info("✅ Database is alive");
    } catch (err: any) {
      logger.error("⚠️ Database ping failed. Reconnecting...");

      if (reconnecting) {
        logger.warn("⏳ Reconnect already in progress, skipping...");
        return; // ← Use return instead of else
      }

      reconnecting = true;
      setDbReady(false);

      try {
        await resetSequelize();

        // ✅ Verify the new connection works
        const newSequelize = getSequelize();
        await newSequelize.query("SELECT 1");

        logger.info("🔄 Database reconnected successfully");
        setDbReady(true);
      } catch (reconnectErr: any) {
        logger.error("❌ Failed to reconnect:", reconnectErr.message);
        setDbReady(false);
      } finally {
        reconnecting = false;
      }
    }
  };

  // Start the loop immediately
  pingLoop();
  watchdogInterval = setInterval(pingLoop, interval);
};

export const stopDbWatchdog = () => {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
    logger.info("🛑 Database watchdog stopped");
  }
};

export const disconnectDB = async () => {
  const sequelize = getSequelize();
  try {
    logger.warn("Attempting to shutdown database connection...");
    await sequelize.close();
    logger.warn("Database connection closed");
  } catch (error) {
    logger.error("Failed to disconnect database" + error);
    throw new Error("Database FAILED to disconnect");
  }
};
