import { FastifyPluginAsync } from "fastify";
import { getUserData, logoutUser } from "../../controllers/v1/user.controller";
import {
  createTransaction,
  getRecentTransactions,
  getTransactionById,
  getTransactions,
} from "../../controllers/v1/transaction.controller";
import { getStats } from "../../controllers/v1/stats.controller";

const userRoutesV1: FastifyPluginAsync = async (app) => {
  // requires a logged-in user
  app.addHook("onRequest", app.authenticate);

  app.post("/logout", logoutUser);
  app.get("/me", getUserData);
  app.post("/create-transaction", createTransaction);
  app.get("/transactions", getTransactions);
  app.get("/transaction/:txId", getTransactionById);
  app.get("/recent-transactions", getRecentTransactions);
  app.get("/stats", getStats);
};

export default userRoutesV1;
