import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { EMAIL_TEMPLATES } from './templates/email-templates.config';
import { MailEvent } from './constants/mail-events.constants';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Global sendEmail function with event-based template system
   * @param event - The email event name from MAIL_EVENTS constants
   * @param to - Recipient email address(es)
   * @param replacements - Object containing template variable replacements
   * @param options - Additional options (optional subject override, etc.)
   */
  async sendEmail(
    event: MailEvent,
    to: string | string[],
    replacements: Record<string, any>,
    options?: {
      subject?: string;
    }
  ): Promise<void> {
    try {
      // Get template configuration
      const templateConfig = EMAIL_TEMPLATES[event];
      if (!templateConfig) {
        throw new Error(`Email template not found for event: ${event}`);
      }

      // console.log(templateConfig);

      // Validate required fields
      const missingFields = templateConfig.requiredFields.filter(
        field => !(field in replacements)
      );
      if (missingFields.length > 0) {
        throw new Error(`Missing required template fields: ${missingFields.join(', ')}`);
      }

      // Load template file
      const templatePath = join(__dirname, 'templates', templateConfig.templateFile);
      const templateContent = await readFile(templatePath, 'utf-8');

      // Process template with replacements
      const processedHtml = this.processTemplate(templateContent, replacements);

      // Send email
      await this.mailerService.sendMail({
        to,
        subject: options?.subject || templateConfig.subject,
        html: processedHtml,
      });

      this.logger.log(`Email sent successfully for event '${event}' to ${to}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(`Failed to send email for event '${event}' to ${to}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    let processedTemplate = template;
    
    // Simple template engine: replace {{key}} with values from data
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const replacement = value !== null && value !== undefined ? String(value) : '';
      processedTemplate = processedTemplate.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        replacement
      );
    });

    return processedTemplate;
  }
}
