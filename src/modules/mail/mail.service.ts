import { Injectable, Logger } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";
import { readFile } from "fs/promises";
import { join } from "path";
import { EMAIL_TEMPLATES } from "./templates/email-templates.config";
import { MailEvent } from "../../common/config/constants/mail-events.constants";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly templateBasePath: string;

  constructor(private readonly mailerService: MailerService) {
    this.templateBasePath =
      process.env.NODE_ENV === "production"
        ? join(process.cwd(), "dist", "src", "modules", "mail", "templates")
        : join(process.cwd(), "src", "modules", "mail", "templates");
  }

  async sendEmail(
    event: MailEvent,
    to: string | string[],
    replacements: Record<string, any>,
    options?: {
      subject?: string;
    },
  ): Promise<void> {
    try {
      // get email templates based on the email-event
      const templateConfig = EMAIL_TEMPLATES[event];
      if (!templateConfig) {
        throw new Error(`Email template not found for event: ${event}`);
      }

      const missingFields = templateConfig.requiredFields.filter(
        (field) => !(field in replacements),
      );

      if (missingFields.length > 0) {
        throw new Error(
          `Missing required template fields: ${missingFields.join(", ")}`,
        );
      }

      // find the template path
      const templatePath = join(
        this.templateBasePath,
        templateConfig.templateFile,
      );

      const templateContent = await readFile(templatePath, "utf-8");

      // process the template
      const processedHtml = this.processTemplate(templateContent, replacements);

      // call the service to send email
      await this.mailerService.sendMail({
        to,
        subject: options?.subject || templateConfig.subject,
        html: processedHtml,
      });

      this.logger.log(`Email sent successfully for event '${event}' to ${to}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to send email for event '${event}' to ${to}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    let processedTemplate = template;

    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const replacement =
        value !== null && value !== undefined ? String(value) : "";
      processedTemplate = processedTemplate.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        replacement,
      );
    });

    return processedTemplate;
  }
}
