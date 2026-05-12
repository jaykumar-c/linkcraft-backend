export const MAIL_EVENTS = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
} as const;

export type MailEvent = typeof MAIL_EVENTS[keyof typeof MAIL_EVENTS];
