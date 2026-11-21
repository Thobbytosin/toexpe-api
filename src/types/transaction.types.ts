import { IUser } from "./user.types";

export type TransactionType = "income" | "expense";

export type NewTransaction = {
  type: TransactionType;
  idempotencyKey: string;
  categoryId: string; // see constants/categories.ts
  title: string; // category label, or the custom text when "Other" was chosen
  amount: number; // minor units (cents/kobo)
  date: string; // ISO string
  userId: string;
};

export type ITransaction = {
  id: string;
  idempotencyKey: string;
  title: string;
  category: string;
  date: Date;
  amount: number;
  type: "income" | "expense";
  currency: string;
  userId: string | null;
  user: IUser;
  createdAt: string;
  updatedAt: string;
};

export type IWallet = {
  id: string;
  incomeBalance: number;
  expenseBalance: number;
  currency: string;
  userId: string | null;
  user: IUser;
};
