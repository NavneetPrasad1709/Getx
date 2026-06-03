import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Prisma } from '@getx/database';

/* DB-CRIT-001..005 migrated every money column from Float to Decimal. Prisma
   returns a Decimal as a Decimal.js instance whose JSON form is a STRING, so the
   API silently changed each money field from `number` to `"number"`. Frontends
   do `price.toFixed()` / arithmetic on those fields and crash at runtime
   ("z.toFixed is not a function"). This interceptor walks every response and
   converts Decimal -> number, restoring the original numeric contract so no
   frontend change is needed. DECIMAL(14,2) magnitudes are far inside JS
   safe-integer range, so toNumber() is lossless here. */
function deepConvertDecimals(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (Prisma.Decimal.isDecimal(value)) {
    return (value as Prisma.Decimal).toNumber();
  }
  if (typeof value !== 'object' || depth > 8) return value;
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = deepConvertDecimals(value[i], depth + 1);
    }
    return value;
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    obj[key] = deepConvertDecimals(obj[key], depth + 1);
  }
  return value;
}

@Injectable()
export class DecimalSerializeInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((data) => deepConvertDecimals(data)));
  }
}
