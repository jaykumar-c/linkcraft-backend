import { MAIL_EVENTS } from '../constants/mail-events.constants';

export interface EmailTemplateConfig {
  templateFile: string;
  subject: string;
  requiredFields: string[];
}

export const EMAIL_TEMPLATES: Record<string, EmailTemplateConfig> = {
  [MAIL_EVENTS.WELCOME]: {
    templateFile: 'welcome.html',
    subject: 'Welcome to LinkCraft AI! 🎉',
    requiredFields: ['name'],
  },
  [MAIL_EVENTS.EMAIL_VERIFICATION]: {
    templateFile: 'email-verification.html',
    subject: 'Verify Your Email Address ✉️',
    requiredFields: ['name', 'otp'],
  },
  [MAIL_EVENTS.PASSWORD_RESET]: {
    templateFile: 'password-reset.html',
    subject: 'Reset Your Password 🔐',
    requiredFields: ['name', 'otp'],
  },
};
