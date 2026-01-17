import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Custom Validators for Enhanced Input Validation
 *
 * These validators provide additional security and data integrity checks
 * beyond the standard class-validator decorators.
 */

/**
 * Validates that a string doesn't contain SQL injection patterns
 */
export function IsNotSQLInjection(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotSQLInjection',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (typeof value !== 'string') return true;

          const sqlPatterns = [
            /(\bor\b|\band\b).*=.*--/i,
            /union.*select/i,
            /drop\s+table/i,
            /insert\s+into/i,
            /delete\s+from/i,
            /update\s+.*\s+set/i,
            /exec(\s|\()/i,
            /execute(\s|\()/i,
            /;.*(\/\*|--)/i,
            /'.*or.*'.*='/i,
          ];

          return !sqlPatterns.some((pattern) => pattern.test(value));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contains potentially dangerous SQL patterns`;
        },
      },
    });
  };
}

/**
 * Validates that a string doesn't contain XSS patterns
 */
export function IsNotXSS(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotXSS',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (typeof value !== 'string') return true;

          const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi, // onclick, onerror, etc.
            /<iframe/gi,
            /<object/gi,
            /<embed/gi,
            /vbscript:/gi,
            /data:text\/html/gi,
          ];

          return !xssPatterns.some((pattern) => pattern.test(value));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contains potentially dangerous XSS patterns`;
        },
      },
    });
  };
}

/**
 * Validates string length with trimming
 */
export function IsTrimmedLength(min: number, max: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isTrimmedLength',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [min, max],
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (typeof value !== 'string') return false;
          const trimmed = value.trim();
          return trimmed.length >= min && trimmed.length <= max;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be between ${min} and ${max} characters (after trimming)`;
        },
      },
    });
  };
}

/**
 * Validates that a string is a safe filename
 */
export function IsSafeFilename(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSafeFilename',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (typeof value !== 'string') return false;

          // Check for path traversal
          if (value.includes('..') || value.includes('/') || value.includes('\\')) {
            return false;
          }

          // Check for null bytes
          if (value.includes('\0')) {
            return false;
          }

          // Only allow alphanumeric, dots, dashes, underscores
          const safePattern = /^[a-zA-Z0-9._-]+$/;
          return safePattern.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a safe filename (alphanumeric, dots, dashes, underscores only)`;
        },
      },
    });
  };
}

/**
 * Validates that a number is within a reasonable range
 */
export function IsReasonableNumber(
  min: number,
  max: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isReasonableNumber',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [min, max],
      options: validationOptions,
      validator: {
        validate(value: number) {
          if (typeof value !== 'number') return false;
          if (!isFinite(value) || isNaN(value)) return false;
          return value >= min && value <= max;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a reasonable number between ${min} and ${max}`;
        },
      },
    });
  };
}

/**
 * Validates email with stricter rules
 */
export function IsStrictEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrictEmail',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (typeof value !== 'string') return false;

          // RFC 5322 compliant email regex (simplified)
          const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailPattern.test(value)) return false;

          // Additional checks
          if (value.length > 254) return false; // Max email length
          const [local] = value.split('@');
          if (local.length > 64) return false; // Max local part length

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid email address`;
        },
      },
    });
  };
}

/**
 * Validates URL with protocol whitelist
 */
export function IsWhitelistedURL(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isWhitelistedURL',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (typeof value !== 'string') return false;

          try {
            const url = new URL(value);
            // Only allow http and https
            return ['http:', 'https:'].includes(url.protocol);
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid HTTP/HTTPS URL`;
        },
      },
    });
  };
}

/**
 * Validates that a string is not empty or only whitespace
 */
export function IsNotBlank(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotBlank',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (typeof value !== 'string') return false;
          return value.trim().length > 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} cannot be empty or contain only whitespace`;
        },
      },
    });
  };
}

/**
 * Validates that a value is strictly a boolean (not a string that gets converted)
 * This is stricter than @IsBoolean() which may accept truthy/falsy strings
 */
export function IsStrictBoolean(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrictBoolean',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Check if the original value was a string (stored by StrictValidationPipe or ValidationPipe)
          const originalKey = `__original_${args.property}__`;
          const originalValue = (args.object as any)[originalKey];

          // If original value was a string, reject it
          if (originalValue !== undefined && typeof originalValue === 'string') {
            return false;
          }

          // Also check if Transform returned the special invalid value
          if (value === 'INVALID_BOOLEAN_TYPE') {
            return false;
          }

          // If value is a string (even after conversion attempts), reject it
          // This handles the case where enableImplicitConversion converts 'yes' to true
          // but we want to reject all string inputs
          if (typeof value === 'string') {
            return false;
          }

          // Only accept actual boolean values
          return typeof value === 'boolean';
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a boolean value (true or false), not a string or number`;
        },
      },
    });
  };
}
