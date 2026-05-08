import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

type ErrorResponseBody = {
  statusCode: number;
  errorCode: string;
  message: string;
  errors?: unknown[];
  path: string;
  timestamp: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const looksLikeErrorCode = (value: string) =>
      /^[A-Z][A-Z0-9_]*\d{2,}$/.test(value) && !value.includes(" ");

    let errorCode = "INTERNAL_SERVER_ERROR";
    let message = "Internal server error";
    let errors: unknown[] | undefined = undefined;

    if (exception instanceof HttpException) {
      // Nest default: { statusCode, message, error }
      if (typeof rawResponse === "string") {
        message = rawResponse;
        errorCode = looksLikeErrorCode(rawResponse) ? rawResponse : "HTTP_ERROR";
      } else if (rawResponse && typeof rawResponse === "object") {
        const resp = rawResponse as any;
        if (typeof resp?.errorCode === "string" && resp.errorCode.length > 0) {
          errorCode = resp.errorCode;
        }
        const rawMessage = resp?.message;

        // class-validator ValidationPipe: message is an array of strings
        if (Array.isArray(rawMessage)) {
          errorCode = "VALIDATION_ERROR";
          message = "Validation failed";
          errors = rawMessage;
        } else if (typeof rawMessage === "string") {
          message = rawMessage;
          errorCode = looksLikeErrorCode(rawMessage)
            ? rawMessage
            : resp?.errorCode || resp?.error || "HTTP_ERROR";
        } else if (typeof resp === "string") {
          message = resp;
          errorCode = looksLikeErrorCode(resp) ? resp : "HTTP_ERROR";
        } else {
          message = "Request failed";
          errorCode = resp?.errorCode || resp?.error || "HTTP_ERROR";
        }
      } else {
        message = "Request failed";
        errorCode = "HTTP_ERROR";
      }
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      errorCode,
      message,
      ...(errors ? { errors } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }
}
