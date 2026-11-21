import { IUserRegister } from "../types/user.types";
import { validatePasswordStrength } from "./password.validator";

export const isEmailValid: RegExp =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateRegisterInput(data: IUserRegister): string | null {
  const { fullName, email, password, confirmPassword, acceptedTerms } = data;

  const requiredFields = {
    fullName,
    email,
    password,
    confirmPassword,
  };

  // Check if any required field is missing or falsy
  for (const [key, value] of Object.entries(requiredFields)) {
    if (value === null || value === undefined || String(value).trim() === "") {
      return `Required field "${key}" cannot be empty`;
    }
  }

  if (password !== confirmPassword) {
    return "Password and confirm password do not match";
  }

  if (!acceptedTerms) {
    return "You must accept the terms and conditions";
  }

  if (!isEmailValid.test(email)) {
    return "Email is not valid. Please enter a valid email";
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return passwordError;
  }

  return null;
}

export function validateSignInInput(data: {
  email: string;
  password: string;
}): string | null {
  const { email, password } = data;

  const requiredFields = {
    email,
    password,
  };

  // Check if any required field is missing or falsy
  for (const [key, value] of Object.entries(requiredFields)) {
    if (value === null || value === undefined || String(value).trim() === "") {
      return `Required field "${key}" cannot be empty`;
    }
  }

  if (!isEmailValid.test(email)) {
    return "Please enter a valid email";
  }

  return null;
}
