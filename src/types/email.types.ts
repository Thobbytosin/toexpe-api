export type TVerificationMailData = {
  name: string;
  otp: string;
  verificationUrl?: string;
};
export type TPasswordResetMailData = {
  name: string;
  otp: string;
  resetUrl: string;
};
export type TPasswordResetSuccessMailData = {
  name: string;
  loginUrl: string;
};

export type TVerificationSuccessMailData = {
  name: string;
};

export type TOnboardingSuccessMailData = {
  name: string;
  supportEmail?: string;
  dashboardUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
  helpCenterUrl?: string;
};
