import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readFile } from "fs/promises";
import { join } from "path";
import { EMAIL_TEMPLATES } from "./templates/email-templates.config";
import { MailEvent } from "../../common/config/constants/mail-events.constants";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly templateBasePath: string;

  constructor(private readonly configService: ConfigService) {
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

      const templatePath = join(
        this.templateBasePath,
        templateConfig.templateFile,
      );

      const templateContent = await readFile(templatePath, "utf-8");
      const processedHtml = this.processTemplate(templateContent, replacements);

      const apiKey = this.configService.get<string>("MAIL_API_KEY")!;
      const from = this.configService.get<string>("MAIL_FROM")!;
      const recipients = Array.isArray(to) ? to : [to];

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { email: from },
          to: recipients.map((email) => ({ email })),
          subject: options?.subject || templateConfig.subject,
          htmlContent: processedHtml,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Brevo API error ${response.status}: ${body}`);
      }

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
