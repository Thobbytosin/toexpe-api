import { IWallet } from "./transaction.types";

export interface IUserRegister {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  acceptedTerms: boolean;
}

export interface IUser {
  id: string;
  fullName: string;
  email: string;
  avatar: string;
  wallet: IWallet;
}
