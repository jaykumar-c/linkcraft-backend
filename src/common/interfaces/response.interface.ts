export interface ApiResponse<T = unknown> {
  message: string;
  errorCode: string;
  data: T;
  error: string;
}

export function createSuccessResponse<T>(
  message: string,
  errorCode: string,
  data: T = {} as T,
): ApiResponse<T> {
  return {
    message,
    errorCode,
    data: data as T,
    error: '',
  };
}

export function createErrorResponse<T = unknown>(
  message: string,
  errorCode: string,
  error: string | object = '',
  data: T = {} as T,
): ApiResponse<T> {
  return {
    message,
    errorCode,
    data: data as T,
    error: typeof error === 'string' ? error : JSON.stringify(error),
  };
}