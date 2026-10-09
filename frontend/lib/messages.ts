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

export const registrationMessages = {
  workshop_full: "This workshop is full. No seats are left.",
  workshop_not_open: "Registration is closed for this workshop.",
  duplicate_registration: "This email is already registered for this workshop.",
  already_cancelled: "This registration is already cancelled.",
  forbidden: "You don't have permission to do this.",
  registered_success: "Attendee registered successfully.",
  cancelled_success: "Registration cancelled successfully.",
  confirm_cancel_title: "Cancel Registration",
  confirm_cancel_description:
    "Are you sure you want to cancel this registration? The seat will be freed immediately, but the registration record will be permanently retained in history.",
  no_registrations: "No registrations yet. Register the first attendee.",
  no_matching_registrations: "No registrations match your search filter.",
  full_workshop_disabled: "This workshop is full",
  closed_workshop_disabled: "Registration is closed for this workshop",
} as const;

export const userMessages = {
  created_success: "User created successfully.",
  updated_success: "User updated successfully.",
  deactivate_warning: "Their current sessions will be signed out.",
  role_change_warning: "Their current sessions will be signed out.",
  self_edit_forbidden: "You can't change your own role or deactivate yourself",
  password_hint: "Share this password with the user. There is no email sending.",
  no_users: "No users found.",
} as const;

export const auditActionLabels: Record<string, string> = {
  "user.created": "User created",
  "user.updated": "User updated",
  "user.role_changed": "Role changed",
  "user.deactivated": "User deactivated",
  "user.activated": "User activated",
  "user.password_reset": "Password reset",
  "workshop.created": "Workshop created",
  "workshop.updated": "Workshop updated",
  "workshop.status_changed": "Status changed",
  "workshop.capacity_changed": "Capacity changed",
};

export function getAuditActionLabel(action: string): string {
  return auditActionLabels[action] ?? action.replace(/[\._]/g, " ");
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
