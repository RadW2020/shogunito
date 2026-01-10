import { BadRequestException, Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { getMetadataStorage } from 'class-validator';

/**
 * Custom pipe that ensures required fields (marked with @IsDefined) are present
 * in the request body before class-validator runs.
 *
 * This solves the issue where class-validator decorators don't execute
 * for properties that don't exist in the object.
 */
@Injectable()
export class RequiredFieldsPipe implements PipeTransform {
  constructor(private dto: Type<any>) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: any, _metadata: ArgumentMetadata) {
    // Get validation metadata for the DTO
    const validationMetadata = getMetadataStorage().getTargetValidationMetadatas(
      this.dto,
      this.dto.name,
      false,
      false,
    );

    // Extract only properties with @IsDefined() decorator
    const requiredProps = validationMetadata
      .filter((m) => m.type === 'isDefined')
      .map((m) => m.propertyName);

    // Check which required properties are missing
    const missing = requiredProps.filter((prop) => !(prop in value));

    if (missing.length > 0) {
      const messages = missing.map((f) => `${f} should not be missing`);
      throw new BadRequestException(messages.length === 1 ? messages[0] : messages);
    }

    return value;
  }
}
