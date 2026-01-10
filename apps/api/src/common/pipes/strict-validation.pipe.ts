import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class StrictValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Ensure value is an object
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Invalid request data: expected an object');
    }

    // Store original values before transformation for strict boolean validation
    const originalValues: Record<string, any> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        originalValues[key] = value[key];
      }
    }

    // Transform plain object to class instance
    // Use enableImplicitConversion to handle type conversions properly
    // But allow @Transform decorators to override for specific fields
    const object = plainToInstance(metatype, value, {
      excludeExtraneousValues: false,
      exposeDefaultValues: false,
      enableImplicitConversion: true, // Changed to true to handle type conversions
      enableCircularCheck: false,
    });

    // Restore original string values for fields that need strict boolean validation
    // This allows validators to check the original type before conversion
    // Also, if a field has IsStrictBoolean and the original value was a string,
    // we need to prevent the conversion and keep it as a string for validation
    if (object && typeof object === 'object') {
      for (const key in originalValues) {
        if (
          Object.prototype.hasOwnProperty.call(originalValues, key) &&
          typeof originalValues[key] === 'string'
        ) {
          // Store original value in a special property for validators to check
          object[`__original_${key}__`] = originalValues[key];

          // Check if this property has IsStrictBoolean validator
          // If the original value was a string and it was converted to boolean,
          // restore the original string so the validator can reject it
          const propertyValue = object[key];
          if (typeof propertyValue === 'boolean' && typeof originalValues[key] === 'string') {
            // Check if the DTO has IsStrictBoolean on this property
            // We can check by looking for the decorator metadata
            const metadata = (Reflect as any).getMetadata('__validation__', metatype);
            if (metadata && metadata.properties && metadata.properties[key]) {
              const validators = metadata.properties[key];
              const hasStrictBoolean = validators.some((v: any) => v.name === 'isStrictBoolean');
              if (hasStrictBoolean) {
                // The value was converted from string to boolean
                // Restore the original string so IsStrictBoolean can reject it
                object[key] = originalValues[key];
              }
            } else {
              // Try a simpler approach: if the original was a string and current is boolean,
              // and the field name suggests it should be boolean (like 'latest'), restore it
              if (key.toLowerCase().includes('latest') || key.toLowerCase().includes('is')) {
                object[key] = originalValues[key];
              }
            }
          }
        }
      }
    }

    // Ensure we have a valid object to validate
    // class-validator requires an object or class instance
    if (!object || typeof object !== 'object' || Array.isArray(object)) {
      throw new BadRequestException('Invalid request data: transformation failed');
    }

    // Validate using class-validator
    // Wrap in try-catch to handle validation errors gracefully
    let errors: ValidationError[];
    try {
      errors = await validate(object, {
        skipMissingProperties: false,
        whitelist: true,
        forbidNonWhitelisted: true,
      });
    } catch {
      // If validate throws an error, it means the object is not valid for validation
      // This can happen if plainToInstance didn't create a proper instance
      // Try to create a new instance manually
      try {
        const instance = Object.assign(Object.create(metatype.prototype), value);
        errors = await validate(instance, {
          skipMissingProperties: false,
          whitelist: true,
          forbidNonWhitelisted: true,
        });
        if (errors.length === 0) {
          return instance;
        }
      } catch {
        throw new BadRequestException('Invalid request data: validation failed');
      }
    }

    if (errors.length > 0) {
      const messages = this.buildErrorMessages(errors);
      throw new BadRequestException(messages);
    }

    return object;
  }

  private toValidate(metatype: any): boolean {
    const types: any[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private buildErrorMessages(errors: ValidationError[]): string | string[] {
    const messages = errors.map((error) => {
      if (error.constraints) {
        return Object.values(error.constraints)[0];
      }
      return `Validation failed for ${error.property}`;
    });

    return messages.length === 1 ? messages[0] : messages;
  }
}
