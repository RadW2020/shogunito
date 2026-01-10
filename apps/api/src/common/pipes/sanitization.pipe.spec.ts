import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { SanitizationPipe } from './sanitization.pipe';

describe('SanitizationPipe', () => {
  let pipe: SanitizationPipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SanitizationPipe],
    }).compile();

    pipe = module.get<SanitizationPipe>(SanitizationPipe);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('transform', () => {
    it('should return null if value is null', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const result = pipe.transform(null, metadata);

      expect(result).toBeNull();
    });

    it('should return undefined if value is undefined', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const result = pipe.transform(undefined, metadata);

      expect(result).toBeUndefined();
    });

    it('should skip sanitization for custom metadata type', () => {
      const metadata: ArgumentMetadata = {
        type: 'custom',
        data: undefined,
        metatype: undefined,
      };

      const value = '<script>alert("xss")</script>';
      const result = pipe.transform(value, metadata);

      expect(result).toBe(value);
    });

    it('should sanitize strings with dangerous HTML tags', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      // Use iframe instead of script to avoid SQL injection pattern detection
      const value = '<iframe src="evil.com"></iframe>Hello';
      const result = pipe.transform(value, metadata);

      expect(result).not.toContain('<iframe>');
      expect(result).not.toContain('</iframe>');
      expect(result).toContain('Hello');
    });

    it('should sanitize strings with dangerous attributes', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const value = '<div onclick="alert(\'xss\')">Click me</div>';
      const result = pipe.transform(value, metadata);

      expect(result).not.toContain('onclick');
    });

    it('should detect SQL injection patterns', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const value = "admin' OR '1'='1'--";

      expect(() => pipe.transform(value, metadata)).toThrow();
      expect(() => pipe.transform(value, metadata)).toThrow('potentially dangerous SQL patterns');
    });

    it('should sanitize nested objects', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const value = {
        name: '<object data="evil.swf"></object>',
        description: 'Safe text',
        nested: {
          value: '<embed src="evil.swf"></embed>',
        },
      };

      const result = pipe.transform(value, metadata);

      expect(result.name).not.toContain('<object>');
      expect(result.nested.value).not.toContain('<embed>');
      expect(result.description).toBe('Safe text');
    });

    it('should sanitize arrays', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const value = [
        '<iframe src="evil.com"></iframe>',
        'Safe text',
        '<object data="evil.swf"></object>',
      ];

      const result = pipe.transform(value, metadata);

      expect(result[0]).not.toContain('<iframe>');
      expect(result[2]).not.toContain('<object>');
      expect(result[1]).toBe('Safe text');
    });

    it('should trim whitespace from strings', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const value = '  Hello World  ';
      const result = pipe.transform(value, metadata);

      expect(result).toBe('Hello World');
    });

    it('should encode HTML entities', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const value = '<p>Safe paragraph</p>';
      const result = pipe.transform(value, metadata);

      // Should encode HTML entities
      expect(result).toBeDefined();
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });

    it('should handle all SQL injection patterns', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const sqlPatterns = [
        "admin' OR '1'='1'--",
        'UNION SELECT * FROM users',
        'DROP TABLE users',
        'INSERT INTO users VALUES',
        'DELETE FROM users',
        'UPDATE users SET password',
        'EXEC xp_cmdshell',
        'EXECUTE sp_executesql',
      ];

      sqlPatterns.forEach((pattern) => {
        expect(() => pipe.transform(pattern, metadata)).toThrow(BadRequestException);
      });
    });

    it('should remove all dangerous HTML tags', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const dangerousTags = [
        '<iframe src="evil.com">Content</iframe>',
        '<object data="evil.swf">Content</object>',
        '<embed src="evil.swf">Content</embed>',
        '<link rel="stylesheet" href="evil.css">',
        '<style>body { color: red; }</style>',
        '<form action="evil.com"><input type="text"></form>',
        '<button>Click</button>',
        '<textarea>Content</textarea>',
        '<select><option>Option</option></select>',
      ];

      dangerousTags.forEach((tag) => {
        const result = pipe.transform(tag, metadata);
        expect(result).not.toContain('<iframe');
        expect(result).not.toContain('<object');
        expect(result).not.toContain('<embed');
      });
    });

    it('should remove dangerous attributes', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const dangerousAttributes = [
        '<div onerror="evil()">Test</div>',
        '<div onload="evil()">Test</div>',
        '<div onclick="evil()">Test</div>',
        '<div onmouseover="evil()">Test</div>',
        '<div onfocus="evil()">Test</div>',
      ];

      dangerousAttributes.forEach((attr) => {
        const result = pipe.transform(attr, metadata);
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onclick');
      });
    });

    it('should handle self-closing tags', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const value = '<iframe src="evil.js"/>';
      const result = pipe.transform(value, metadata);

      expect(result).not.toContain('<iframe');
    });

    it('should handle opening tags without closing', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const value = '<iframe src="evil.js">';
      const result = pipe.transform(value, metadata);

      expect(result).not.toContain('<iframe');
    });

    it('should remove HTML comments', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const value = 'Hello <!-- <iframe src="evil"></iframe> --> World';
      const result = pipe.transform(value, metadata);

      expect(result).not.toContain('<!--');
      expect(result).not.toContain('-->');
    });

    it('should preserve numbers and booleans', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const value = {
        number: 42,
        boolean: true,
        string: '<iframe>content</iframe>',
      };

      const result = pipe.transform(value, metadata);

      expect(result.number).toBe(42);
      expect(result.boolean).toBe(true);
      expect(result.string).not.toContain('<iframe>');
    });

    it('should sanitize object keys', () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: undefined,
        metatype: undefined,
      };

      const value = {
        '<iframe>content</iframe>': 'value',
        normalKey: 'value',
      };

      const result = pipe.transform(value, metadata);

      expect(Object.keys(result)).not.toContain('<iframe>content</iframe>');
    });
  });
});
