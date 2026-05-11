import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { Response } from "express";

type ErrorResponseBody = {
  message: string;
  errorCode: string;
  data: Record<string, unknown>;
  error: string;
};

const STATUS_ERROR_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "VAL001",
  [HttpStatus.UNAUTHORIZED]: "ERR401",
  [HttpStatus.FORBIDDEN]: "ERR403",
  [HttpStatus.NOT_FOUND]: "ERR404",
  [HttpStatus.CONFLICT]: "ERR409",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "VAL001",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "ERR500",
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const rawResponse = isHttpException ? exception.getResponse() : null;

    const { errorCode, message, errorDetail } = this.parseException(exception, rawResponse, status);

    const body: ErrorResponseBody = {
      message,
      errorCode,
      data: {},
      error: errorDetail,
    };

    response.status(status).json(body);
  }

  private parseException(
    exception: unknown,
    rawResponse: string | object | null,
    status: number,
  ): { errorCode: string; message: string; errorDetail: string } {
    const looksLikeErrorCode = (value: string) =>
      /^[A-Z][A-Z0-9_]*\d{3,}$/.test(value) && !value.includes(" ");

    const defaultErrorCode = STATUS_ERROR_CODES[status] || "ERR500";

    if (!exception || !(exception instanceof HttpException)) {
      return {
        errorCode: "ERR500",
        message: "Internal server error",
        errorDetail: exception instanceof Error 
          ? exception.message
          : String(exception),
      };
    }

    if (typeof rawResponse === "string") {
      return {
        errorCode: looksLikeErrorCode(rawResponse) ? rawResponse : defaultErrorCode,
        message: rawResponse,
        errorDetail: rawResponse,
      };
    }

    if (typeof rawResponse !== "object" || rawResponse === null) {
      return {
        errorCode: defaultErrorCode,
        message: "Request failed",
        errorDetail: "Request failed",
      };
    }

    const resp = rawResponse as any;
    const existingErrorCode = typeof resp?.errorCode === "string" && resp.errorCode ? resp.errorCode : null;

    if (exception instanceof BadRequestException || status === HttpStatus.BAD_REQUEST) {
      const rawMsg = resp?.message;
      const customErrorCode = typeof resp?.errorCode === 'string' && resp.errorCode ? resp.errorCode : null;
      
      if (Array.isArray(rawMsg)) {
        const validationErrors = rawMsg.map((err: any) => {
          if (typeof err === 'string') return err;
          if (err.property && err.constraints) {
            return `${err.property}: ${Object.values(err.constraints).join(', ')}`;
          }
          return typeof err === 'object' ? JSON.stringify(err) : String(err);
        }).filter(Boolean).join('; ');
        
        return {
          errorCode: customErrorCode || "VAL001",
          message: "Validation failed",
          errorDetail: validationErrors || 'Validation failed',
        };
      }
      
      const errorMsg = typeof rawMsg === 'string' ? rawMsg : "Validation failed";
      return {
        errorCode: customErrorCode || "VAL001",
        message: customErrorCode ? errorMsg : "Validation failed",
        errorDetail: errorMsg,
      };
    }

    const message = typeof resp?.message === "string" ? resp.message : "Request failed";
    const errorCode = existingErrorCode || (looksLikeErrorCode(message) ? message : defaultErrorCode);

    return {
      errorCode,
      message,
      errorDetail: typeof resp?.error === 'string' ? resp.error : message,
    };
  }
}