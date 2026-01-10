import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interceptor that parses multipart/form-data fields and converts them to proper types
 * before validation. This runs after AnyFilesInterceptor but before ValidationPipe,
 * ensuring proper type conversion for form fields.
 *
 * Handles conversion of:
 * - Strings to numbers (when valid)
 * - Strings to booleans ('true'/'false', '1'/'0')
 * - Strings to Dates (ISO format)
 * - Empty strings to undefined (for optional fields)
 * - Preserves file objects from multer
 */
@Injectable()
export class MultipartFormDataInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MultipartFormDataInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    try {
      const request = context.switchToHttp().getRequest();
      const body = request.body;

      if (!body || typeof body !== 'object') {
        return next.handle();
      }

      // Check if this looks like multipart/form-data
      // In multipart/form-data, all non-file fields come as strings
      const hasStringFields = Object.entries(body).some(
        ([key, val]) =>
          typeof val === 'string' &&
          !this.isFile(val) &&
          !Buffer.isBuffer(val) &&
          key !== 'file' &&
          key !== 'thumbnail' &&
          key !== 'attachment',
      );

      // If no string fields found, likely JSON - continue as is
      if (!hasStringFields) {
        return next.handle();
      }

      // Parse multipart/form-data fields
      const parsed: any = {};

      for (const [key, val] of Object.entries(body)) {
        // Skip file fields (they're handled by FileInterceptor)
        if (this.isFile(val) || Buffer.isBuffer(val)) {
          parsed[key] = val;
          continue;
        }

        // Convert string values to appropriate types
        if (typeof val === 'string') {
          // Empty strings become undefined for optional fields
          if (val === '') {
            parsed[key] = undefined;
            continue;
          }

          // Try to parse as number
          const trimmed = val.trim();
          if (trimmed !== '' && !isNaN(Number(trimmed))) {
            const numVal = Number(trimmed);
            // Only convert if the string representation matches exactly
            if (trimmed === String(numVal)) {
              parsed[key] = numVal;
              continue;
            }
          }

          // Try to parse as boolean
          const lowerVal = trimmed.toLowerCase();
          if (lowerVal === 'true' || trimmed === '1') {
            parsed[key] = true;
            continue;
          }
          if (lowerVal === 'false' || trimmed === '0') {
            parsed[key] = false;
            continue;
          }

          // Try to parse as Date (ISO format)
          if (trimmed.match(/^\d{4}-\d{2}-\d{2}/)) {
            const dateVal = new Date(trimmed);
            if (!isNaN(dateVal.getTime())) {
              parsed[key] = dateVal;
              continue;
            }
          }

          // Keep as string (for enums, they'll be validated by class-validator)
          parsed[key] = trimmed;
        } else {
          // Keep non-string values as is
          parsed[key] = val;
        }
      }

      // Update request body with parsed values
      request.body = parsed;

      return next.handle();
    } catch (error) {
      // Log error but don't break the request flow
      // Let ValidationPipe handle validation errors
      this.logger.warn(
        'Error parsing multipart/form-data, continuing with original body',
        error instanceof Error ? error.message : String(error),
      );
      return next.handle();
    }
  }

  private isFile(value: any): boolean {
    // Check if it's a multer file object
    return (
      value &&
      typeof value === 'object' &&
      'fieldname' in value &&
      'originalname' in value &&
      'mimetype' in value &&
      'buffer' in value
    );
  }
}
