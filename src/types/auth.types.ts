export interface IRegistration {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  termsAccepted: boolean;
  disbursementAccountName?: string;
  disbursementBankCode?: string;
  disbursementAccountNumber?: string;
  disbursementBankName?: string;
}

export interface ITokenOptions {
  maxAge: number;
  httpOnly: boolean;
  sameSite: "none" | "lax" | "strict";
  secure?: boolean;
  path: string;
}

export interface ILoginOptions {
  email: string;
  password: string;
}
