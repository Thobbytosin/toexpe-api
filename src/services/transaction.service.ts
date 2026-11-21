import Transaction from "../models/v1/transaction.model";
import User from "../models/v1/user.model";
import Wallet from "../models/v1/wallet.model";
import { ITransaction, NewTransaction } from "../types/transaction.types";
import ErrorHandler from "../utils/errorHandler";
import { validateTransactionInput } from "../validators/transaction.validators";
import { v4 as uuidv4 } from "uuid";
import { creditUserWallet, handleCreateUserWallet } from "./user.service";

export const handleCreateTransaction = async (
  { type, idempotencyKey, categoryId, title, amount, date }: NewTransaction,
  userId: string,
) => {
  const errorMessage = validateTransactionInput({
    type,
    idempotencyKey,
    categoryId,
    title,
    amount,
    date,
  } as NewTransaction);

  if (errorMessage) throw new ErrorHandler(errorMessage, 400);

  const where = { userId, idempotencyKey: idempotencyKey };

  const existingTx = await Transaction.findOne({ where });

  if (existingTx) throw new ErrorHandler(`This ${type} already exists`, 422);

  const newTransaction = await Transaction.create({
    id: uuidv4(),
    userId,
    title: title,
    type: type,
    amount: amount,
    idempotencyKey: idempotencyKey,
    category: categoryId,
    date: date,
  });

  if (!newTransaction) throw new ErrorHandler(`Failed to create ${type}`, 400);

  const userWallet = await Wallet.findOne({ where: { userId } });

  if (!userWallet) {
    const newWallet = await handleCreateUserWallet(userId);
    await creditUserWallet(amount, newWallet, type);
  } else {
    await creditUserWallet(amount, userWallet, type);
  }

  return { tx: newTransaction };
};

export async function handleGetUserTxs(
  userId: string,
  page: number = 1,
  limit: number = 5,
  filter?: "all" | "expense" | "income", // Add filter parameter
): Promise<{
  txs: ITransaction[];
  hasMore: boolean;
  total: number;
  expenseCount: number;
  incomeCount: number;
  amountTotal: number;
}> {
  const offset = (page - 1) * limit;

  // Base where condition
  const baseWhere: any = {
    userId,
  };

  // Apply filter
  const where: any = {
    ...baseWhere,
    ...(filter === "expense" && { type: "expense" }),
    ...(filter === "income" && { type: "income" }),
  };

  // Get total count always from base,
  const total = await Transaction.count({ where: baseWhere });

  const sum = await Transaction.sum("amount", { where });
  const amountTotal = Math.round(Number(sum ?? 0));

  // Get unread count (always from base, not filtered)
  const expenseCount = await Transaction.count({
    where: { ...baseWhere, type: "expense" },
  });

  // Get read count (always from base, not filtered)
  const incomeCount = await Transaction.count({
    where: { ...baseWhere, type: "income" },
  });

  const userTxs = await Transaction.findAll({
    where,
    include: [
      {
        model: User, // Assuming your User model name
        as: "user", // Adjust based on your user alias
        attributes: ["id"], // Only fetch what you need
        required: false, // LEFT JOIN - notifications without users still show
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  const trxs = userTxs.map((n) => ({
    id: n.id,
    title: n.title,
    userId: n.userId,
    category: n.category,
    idempotencyKey: n.idempotencyKey,
    type: n.type,
    amount: n.amount,
    date: n.date,
    currency: n.currency,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    user: n.user,
  }));

  const filteredTotal =
    filter === "expense"
      ? expenseCount
      : filter === "income"
        ? incomeCount
        : total;

  return {
    txs: trxs,
    hasMore: offset + trxs.length < filteredTotal,
    total,
    expenseCount,
    incomeCount,
    amountTotal,
  };
}

export const handleGetRecentTxs = async (userId: string | undefined) => {
  if (!userId)
    throw new ErrorHandler(
      `Could not process this request. Session has ended`,
      401,
    );
  const recentTxs = await Transaction.findAll({
    where: { userId },
    order: [["updatedAt", "DESC"]],
    limit: 10,
  });

  return recentTxs;
};

export const handleGetTransactionById = async (
  userId: string,
  txId: string,
) => {
  const tx = await Transaction.findOne({ where: { id: txId, userId } });

  if (!tx) throw new ErrorHandler("Transaction not found", 404);

  return tx;
};
