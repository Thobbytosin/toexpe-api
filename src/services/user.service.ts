import { validate as isUuid } from "uuid";
import ErrorHandler from "../utils/errorHandler";
import { checkUserExistence } from "../validators/user.validator";
import { blacklistToken } from "../helpers/blacklistTokens";
import Wallet from "../models/v1/wallet.model";

// logout service
export const handleSignOutUser = async ({
  accessToken,
  userId,
}: {
  userId: string;
  accessToken: string;
}) => {
  const user = await checkUserExistence({ userId }, true);

  user.currentSessionId = null; // Clear session ID on logout
  user.lastLogout = new Date();

  await user.save();

  // Blacklist tokens
  blacklistToken("accessToken", accessToken);
};

export const handleGetUserInfo = async (userId: string) => {
  if (!isUuid(userId)) {
    throw new ErrorHandler("Unrecognized user resource", 400);
  }

  const user = await checkUserExistence({ userId }, true);

  if (!user) throw new ErrorHandler("This account does not exists.", 404);

  return { user };
};

export const handleCreateUserWallet = async (userId: string) => {
  // Check if wallet already exists
  const existingWallet = await Wallet.findOne({ where: { userId } });
  if (existingWallet) {
    throw new ErrorHandler("You have an existing wallet", 409);
  }

  // Create wallet
  const wallet = await Wallet.create({
    userId,
    expenseBalance: 0,
    incomeBalance: 0,
    currency: "NGN",
  });

  return wallet;
};

export async function creditUserWallet(
  amount: number,
  wallet: InstanceType<typeof Wallet>,
  type: "income" | "expense",
) {
  if (type === "expense") {
    wallet.expenseBalance = Number(wallet.expenseBalance) + Number(amount);
  } else {
    wallet.incomeBalance = Number(wallet.incomeBalance) + Number(amount);
  }

  await wallet.save();
}
