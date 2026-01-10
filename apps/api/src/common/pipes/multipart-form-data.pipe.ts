import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { File } from 'multer';

/**
 * Pipe that parses multipart/form-data fields and converts them to proper types
 * before validation. This is needed because multipart/form-data sends all fields
 * as strings, but DTOs expect specific types (numbers, enums, booleans, etc.).
 */
@Injectable()
export class MultipartFormDataPipe implements PipeTransform {
  transform(value: any, { metatype }: ArgumentMetadata) {
    if (!value || typeof value !== 'object') {
      return value;
    }

    // Check if this looks like multipart/form-data
    // In multipart/form-data, all non-file fields come as strings
    const hasStringFields = Object.entries(value).some(
      ([key, val]) =>
        typeof val === 'string' &&
        !this.isFile(val) &&
        !Buffer.isBuffer(val) &&
        key !== 'file' && // Common file field names
        key !== 'thumbnail' &&
        key !== 'attachment',
    );

    // If no string fields found, likely JSON - return as is
    if (!hasStringFields) {
      return value;
    }

    // Parse multipart/form-data fields
    const parsed: any = {};

    for (const [key, val] of Object.entries(value)) {
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

    // Transform to class instance if metatype is provided
    if (metatype && metatype !== Object) {
      return plainToInstance(metatype, parsed, {
        enableImplicitConversion: true,
        excludeExtraneousValues: false,
      });
    }

    return parsed;
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
