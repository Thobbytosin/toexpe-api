import { NewTransaction } from "../types/transaction.types";

export function validateTransactionInput({
  type,
  idempotencyKey,
  categoryId,
  title,
  amount,
  date,
}: NewTransaction): string | null {
  // Check if any required field is missing or falsy
  for (const [key, value] of Object.entries({
    type,
    idempotencyKey,
    categoryId,
    title,
    amount,
    date,
  })) {
    if (value === null || value === undefined || String(value).trim() === "") {
      return `Required field "${key}" cannot be empty`;
    }
  }

  return null;
}
