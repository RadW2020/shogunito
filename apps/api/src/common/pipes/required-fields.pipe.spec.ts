import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { RequiredFieldsPipe } from './required-fields.pipe';
import { IsDefined } from 'class-validator';

class TestDTO {
  @IsDefined()
  name: string;

  @IsDefined()
  email: string;

  optionalField?: string;
}

describe('RequiredFieldsPipe', () => {
  let pipe: RequiredFieldsPipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RequiredFieldsPipe,
          useFactory: () => new RequiredFieldsPipe(TestDTO),
        },
      ],
    }).compile();

    pipe = module.get<RequiredFieldsPipe>(RequiredFieldsPipe);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('transform', () => {
    it('should pass when all required fields are present', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: TestDTO,
      };

      const value = {
        name: 'Test User',
        email: 'test@example.com',
      };

      const result = pipe.transform(value, metadata);

      expect(result).toEqual(value);
    });

    it('should throw BadRequestException when required field is missing', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: TestDTO,
      };

      const value = {
        email: 'test@example.com',
        // name is missing
      };

      expect(() => pipe.transform(value, metadata)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when multiple required fields are missing', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: TestDTO,
      };

      const value = {
        optionalField: 'optional',
        // name and email are missing
      };

      expect(() => pipe.transform(value, metadata)).toThrow(BadRequestException);
    });

    it('should allow optional fields to be missing', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: TestDTO,
      };

      const value = {
        name: 'Test User',
        email: 'test@example.com',
        // optionalField is missing but that's OK
      };

      const result = pipe.transform(value, metadata);

      expect(result).toEqual(value);
    });
  });
});
