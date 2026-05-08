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
  total?: number;
  data: T;
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
        // If controller already returned the desired envelope, pass through.
        if (
          result &&
          typeof result === 'object' &&
          typeof result.message === 'string' &&
          typeof result.errorCode === 'string' &&
          'data' in result
        ) {
          return result as ApiSuccessResponse<T>;
        }

        // If controller returned `{ data, total }`, preserve total.
        if (
          result &&
          typeof result === 'object' &&
          'data' in result &&
          (typeof result.total === 'number' || typeof result.total === 'undefined')
        ) {
          const { data, total } = result as { data: T; total?: number };
          return {
            message: 'Success',
            errorCode: '',
            ...(typeof total === 'number' ? { total } : {}),
            data,
          };
        }

        // Default: wrap raw value into the envelope.
        return {
          message: 'Success',
          errorCode: '',
          data: result as T,
        };
      }),
    );
  }
}
