import BlacklistedTokens from "../models/v1/blacklistedTokens.model";
import Transaction from "../models/v1/transaction.model";
import User from "../models/v1/user.model";
import VerificationTokens from "../models/v1/verificationTokens.model";
import Wallet from "../models/v1/wallet.model";

export const modelList = [
  User,
  VerificationTokens,
  BlacklistedTokens,
  Transaction,
  Wallet,
];
