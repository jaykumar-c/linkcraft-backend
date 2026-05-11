import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type ApiSuccessResponse<T> = {
  message: string;
  errorCode: string;
  data: T;
  error: string;
  total?: number;
};

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((result: any) => {
        if (
          result &&
          typeof result === 'object' &&
          typeof result.message === 'string' &&
          typeof result.errorCode === 'string' &&
          'data' in result &&
          'error' in result
        ) {
          return result as ApiSuccessResponse<T>;
        }

        if (
          result &&
          typeof result === 'object' &&
          'data' in result &&
          (typeof result.total === 'number' || typeof result.total === 'undefined')
        ) {
          const { data, total } = result as { data: T; total?: number };
          return {
            message: '',
            errorCode: '',
            ...(typeof total === 'number' ? { total } : {}),
            data,
            error: '',
          };
        }

        return {
          message: '',
          errorCode: '',
          data: result as T,
          error: '',
        };
      }),
    );
  }
}