export const authMessages = {
  invalid_credentials: "Email or password is incorrect.",
  account_deactivated: "This account is deactivated. Please contact an admin.",
  too_many_attempts: "Too many attempts. Please wait a minute and try again.",
  server_error: "Something went wrong. Please try again.",
  unknown: "Something went wrong. Please try again.",
} as const;

export type AuthErrorCode = keyof typeof authMessages;

export function getAuthErrorMessage(code: string | null | undefined): string {
  if (!code) return authMessages.unknown;
  const normalized = code.toLowerCase();
  if (normalized.includes("account_deactivated")) {
    return authMessages.account_deactivated;
  }
  if (normalized.includes("too_many_attempts")) {
    return authMessages.too_many_attempts;
  }
  if (
    normalized.includes("invalid_credentials") ||
    normalized.includes("credentialssignin") ||
    normalized.includes("credentials")
  ) {
    return authMessages.invalid_credentials;
  }
  if (normalized.includes("server_error")) {
    return authMessages.server_error;
  }
  if (code in authMessages) {
    return authMessages[code as AuthErrorCode];
  }
  return authMessages.unknown;
}

export const uiMessages = {
  appName: "Workshop Manager",
  loginTitle: "Sign in",
  loginSubtitle: "Use the account your admin created for you.",
  accessDeniedTitle: "Access Denied",
  accessDeniedMessage: "You don't have access to this page.",
  backToHome: "Back to Home",
  signOut: "Sign out",
  workshopsComingSoon: "Workshops management is coming soon.",
  usersComingSoon: "User management is coming soon.",
} as const;
