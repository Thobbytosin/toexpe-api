import { FastifyReply, FastifyRequest } from "fastify";
import {
  handleCreateTransaction,
  handleGetRecentTxs,
  handleGetTransactionById,
  handleGetUserTxs,
} from "../../services/transaction.service";
import { NewTransaction, TransactionType } from "../../types/transaction.types";
import { capitalizedText } from "../../utils/helpers";

export const createTransaction = async (
  req: FastifyRequest<{
    Body: {
      type: TransactionType;
      idempotencyKey: string;
      categoryId: string; // see constants/categories.ts
      title: string; // category label, or the custom text when "Other" was chosen
      amount: number; // minor units (cents/kobo)
      date: string; // ISO string
      userId: string;
    };
  }>,
  reply: FastifyReply,
) => {
  const loggedInUser = req.user!;

  const { tx } = await handleCreateTransaction(req.body, loggedInUser.id);

  return reply.apiSuccess(
    { tx },
    `${capitalizedText(req.body.type)} saved successfully`,
  );
};

export const getTransactions = async (
  req: FastifyRequest<{
    Querystring: { page: string; limit: string; filter: string };
  }>,
  reply: FastifyReply,
) => {
  const loggedInUser = req.user!;

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const filter = req.query.filter as "all" | "income" | "expense" | undefined;

  const { txs, hasMore, total, incomeCount, expenseCount, amountTotal } =
    await handleGetUserTxs(loggedInUser?.id, page, limit, filter);

  return reply.apiSuccess({
    txs,
    hasMore,
    total,
    expenseCount,
    incomeCount,
    amountTotal,
  });
};

export const getRecentTransactions = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  const loggedInUser = req.user!;

  const txs = await handleGetRecentTxs(loggedInUser?.id);

  return reply.apiSuccess({ txs });
};

export const getTransactionById = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  const loggedInUser = req.user!;

  const { txId } = req.params as { txId: string };

  const txs = await handleGetTransactionById(loggedInUser?.id, txId);

  return reply.apiSuccess(txs);
};
