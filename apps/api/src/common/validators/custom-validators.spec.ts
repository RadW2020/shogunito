import { validate } from 'class-validator';
import {
  IsNotSQLInjection,
  IsNotXSS,
  IsTrimmedLength,
  IsSafeFilename,
  IsValidVideoCodec,
  IsReasonableNumber,
  IsStrictEmail,
  IsWhitelistedURL,
} from './custom-validators';

describe('Custom Validators', () => {
  describe('IsNotSQLInjection', () => {
    class TestDTO {
      @IsNotSQLInjection()
      value: string;
    }

    it('should pass for normal strings', async () => {
      const dto = new TestDTO();
      dto.value = 'Hello World';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for alphanumeric strings', async () => {
      const dto = new TestDTO();
      dto.value = 'Test123';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should detect OR-based SQL injection', async () => {
      const dto = new TestDTO();
      dto.value = "admin' OR '1'='1'--";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isNotSQLInjection).toContain('SQL');
    });

    it('should detect UNION SELECT injection', async () => {
      const dto = new TestDTO();
      dto.value = "' UNION SELECT * FROM users--";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect DROP TABLE injection', async () => {
      const dto = new TestDTO();
      dto.value = "'; DROP TABLE users;--";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect INSERT INTO injection', async () => {
      const dto = new TestDTO();
      dto.value = "'; INSERT INTO admins VALUES ('hacker','pass');--";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect DELETE FROM injection', async () => {
      const dto = new TestDTO();
      dto.value = "'; DELETE FROM users WHERE '1'='1";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect UPDATE SET injection', async () => {
      const dto = new TestDTO();
      dto.value = "'; UPDATE users SET role='admin' WHERE id=1;--";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect EXEC injection', async () => {
      const dto = new TestDTO();
      dto.value = "'; EXEC xp_cmdshell('dir');--";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect EXECUTE injection', async () => {
      const dto = new TestDTO();
      dto.value = "'; EXECUTE sp_executesql N'SELECT * FROM users';--";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect comment-based injection with OR clause', async () => {
      const dto = new TestDTO();
      dto.value = "admin' OR '1'='1'--";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass for non-string values', async () => {
      const dto = new TestDTO();
      dto.value = 123 as unknown as string;

      const errors = await validate(dto);
      expect(errors.length).toBe(0); // Non-strings pass through
    });

    it('should handle case-insensitive SQL keywords', async () => {
      const testCases = [
        "' OR '1'='1",
        "' or '1'='1",
        "' Or '1'='1",
        'UNION select',
        'union SELECT',
        'UnIoN SeLeCt',
      ];

      for (const testCase of testCases) {
        const dto = new TestDTO();
        dto.value = testCase;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('should pass for strings that look like SQL but are safe', async () => {
      const dto = new TestDTO();
      dto.value = 'I like to select my favorite items from the table';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('IsNotXSS', () => {
    class TestDTO {
      @IsNotXSS()
      value: string;
    }

    it('should pass for normal strings', async () => {
      const dto = new TestDTO();
      dto.value = 'Hello World';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should detect <script> tags', async () => {
      const dto = new TestDTO();
      dto.value = '<script>alert("XSS")</script>';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isNotXSS).toContain('XSS');
    });

    it('should detect javascript: protocol', async () => {
      const dto = new TestDTO();
      dto.value = 'javascript:alert("XSS")';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect onclick event', async () => {
      const dto = new TestDTO();
      dto.value = '<div onclick="alert(\'XSS\')">Click me</div>';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect onerror event', async () => {
      const dto = new TestDTO();
      dto.value = '<img src="x" onerror="alert(\'XSS\')">';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect onload event', async () => {
      const dto = new TestDTO();
      dto.value = '<body onload="maliciousCode()">';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect <iframe> tags', async () => {
      const dto = new TestDTO();
      dto.value = '<iframe src="http://evil.com"></iframe>';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect <object> tags', async () => {
      const dto = new TestDTO();
      dto.value = '<object data="http://evil.com"></object>';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect <embed> tags', async () => {
      const dto = new TestDTO();
      dto.value = '<embed src="http://evil.com">';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect vbscript: protocol', async () => {
      const dto = new TestDTO();
      dto.value = 'vbscript:msgbox("XSS")';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect data:text/html', async () => {
      const dto = new TestDTO();
      dto.value = 'data:text/html,<script>alert("XSS")</script>';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass for non-string values', async () => {
      const dto = new TestDTO();
      dto.value = 123 as unknown as string;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle case variations', async () => {
      const testCases = [
        '<SCRIPT>alert("XSS")</SCRIPT>',
        '<ScRiPt>alert("XSS")</ScRiPt>',
        'JAVASCRIPT:alert("XSS")',
        'JavaScript:alert("XSS")',
        '<IFRAME src="evil.com"></IFRAME>',
      ];

      for (const testCase of testCases) {
        const dto = new TestDTO();
        dto.value = testCase;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('should pass for safe HTML-like strings', async () => {
      const dto = new TestDTO();
      dto.value = 'I wrote a <script> tag in my document';

      const errors = await validate(dto);
      expect(errors.length).toBe(0); // Without closing tag, it's safe
    });
  });

  describe('IsTrimmedLength', () => {
    class TestDTO {
      @IsTrimmedLength(3, 10)
      value: string;
    }

    it('should pass for strings within length range', async () => {
      const dto = new TestDTO();
      dto.value = 'Hello';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for strings at minimum length', async () => {
      const dto = new TestDTO();
      dto.value = 'ABC';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for strings at maximum length', async () => {
      const dto = new TestDTO();
      dto.value = '1234567890';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for strings too short', async () => {
      const dto = new TestDTO();
      dto.value = 'AB';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isTrimmedLength).toContain('between');
    });

    it('should fail for strings too long', async () => {
      const dto = new TestDTO();
      dto.value = '12345678901';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should trim whitespace before checking length', async () => {
      const dto = new TestDTO();
      dto.value = '  ABC  '; // 3 chars after trim

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail if trimmed length is too short', async () => {
      const dto = new TestDTO();
      dto.value = '  A  '; // 1 char after trim

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for non-string values', async () => {
      const dto = new TestDTO();
      dto.value = 123 as unknown as string;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty string', async () => {
      const dto = new TestDTO();
      dto.value = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle string with only whitespace', async () => {
      const dto = new TestDTO();
      dto.value = '     ';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters correctly', async () => {
      const dto = new TestDTO();
      dto.value = 'café'; // 4 chars

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle emojis correctly', async () => {
      const dto = new TestDTO();
      dto.value = '😀😁😂'; // 3 emojis

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('IsSafeFilename', () => {
    class TestDTO {
      @IsSafeFilename()
      value: string;
    }

    it('should pass for simple filenames', async () => {
      const dto = new TestDTO();
      dto.value = 'document.pdf';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for filenames with underscores', async () => {
      const dto = new TestDTO();
      dto.value = 'my_document.txt';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for filenames with dashes', async () => {
      const dto = new TestDTO();
      dto.value = 'my-document.txt';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for alphanumeric filenames', async () => {
      const dto = new TestDTO();
      dto.value = 'file123.txt';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should detect path traversal with ..', async () => {
      const dto = new TestDTO();
      dto.value = '../../../etc/passwd';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isSafeFilename).toContain('safe');
    });

    it('should detect forward slash', async () => {
      const dto = new TestDTO();
      dto.value = 'path/to/file.txt';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect backward slash', async () => {
      const dto = new TestDTO();
      dto.value = 'path\\to\\file.txt';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect null bytes', async () => {
      const dto = new TestDTO();
      dto.value = 'file\0.txt';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject spaces', async () => {
      const dto = new TestDTO();
      dto.value = 'my file.txt';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject special characters', async () => {
      const testCases = [
        'file!.txt',
        'file@.txt',
        'file#.txt',
        'file$.txt',
        'file%.txt',
        'file^.txt',
        'file&.txt',
        'file*.txt',
        'file(.txt',
        'file).txt',
      ];

      for (const testCase of testCases) {
        const dto = new TestDTO();
        dto.value = testCase;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('should fail for non-string values', async () => {
      const dto = new TestDTO();
      dto.value = 123 as unknown as string;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass for multiple extensions', async () => {
      const dto = new TestDTO();
      dto.value = 'archive.tar.gz';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for files without extension', async () => {
      const dto = new TestDTO();
      dto.value = 'README';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('IsValidVideoCodec', () => {
    class TestDTO {
      @IsValidVideoCodec()
      value: string;
    }

    it('should pass for h264', async () => {
      const dto = new TestDTO();
      dto.value = 'h264';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for h265', async () => {
      const dto = new TestDTO();
      dto.value = 'h265';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for hevc', async () => {
      const dto = new TestDTO();
      dto.value = 'hevc';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for prores', async () => {
      const dto = new TestDTO();
      dto.value = 'prores';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for vp8', async () => {
      const dto = new TestDTO();
      dto.value = 'vp8';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for vp9', async () => {
      const dto = new TestDTO();
      dto.value = 'vp9';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for av1', async () => {
      const dto = new TestDTO();
      dto.value = 'av1';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for dnxhd', async () => {
      const dto = new TestDTO();
      dto.value = 'dnxhd';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for dnxhr', async () => {
      const dto = new TestDTO();
      dto.value = 'dnxhr';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for mpeg2', async () => {
      const dto = new TestDTO();
      dto.value = 'mpeg2';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for mpeg4', async () => {
      const dto = new TestDTO();
      dto.value = 'mpeg4';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle case insensitivity', async () => {
      const testCases = ['H264', 'H265', 'ProRes', 'HEVC', 'VP9', 'AV1'];

      for (const testCase of testCases) {
        const dto = new TestDTO();
        dto.value = testCase;
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should fail for invalid codecs', async () => {
      const dto = new TestDTO();
      dto.value = 'xvid';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isValidVideoCodec).toContain('codec');
    });

    it('should fail for empty string', async () => {
      const dto = new TestDTO();
      dto.value = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for non-string values', async () => {
      const dto = new TestDTO();
      dto.value = 123 as unknown as string;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for partial matches', async () => {
      const dto = new TestDTO();
      dto.value = 'h26';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('IsReasonableNumber', () => {
    class TestDTO {
      @IsReasonableNumber(1, 100)
      value: number;
    }

    it('should pass for numbers within range', async () => {
      const dto = new TestDTO();
      dto.value = 50;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for minimum value', async () => {
      const dto = new TestDTO();
      dto.value = 1;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for maximum value', async () => {
      const dto = new TestDTO();
      dto.value = 100;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for numbers below minimum', async () => {
      const dto = new TestDTO();
      dto.value = 0;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isReasonableNumber).toContain('between');
    });

    it('should fail for numbers above maximum', async () => {
      const dto = new TestDTO();
      dto.value = 101;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for negative numbers outside range', async () => {
      const dto = new TestDTO();
      dto.value = -10;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for Infinity', async () => {
      const dto = new TestDTO();
      dto.value = Infinity;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for -Infinity', async () => {
      const dto = new TestDTO();
      dto.value = -Infinity;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for NaN', async () => {
      const dto = new TestDTO();
      dto.value = NaN;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for non-number values', async () => {
      const dto = new TestDTO();
      dto.value = 'not a number' as unknown as number;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass for decimal numbers in range', async () => {
      const dto = new TestDTO();
      dto.value = 50.5;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for zero when in range', async () => {
      class TestDTOZero {
        @IsReasonableNumber(0, 100)
        value: number;
      }

      const dto = new TestDTOZero();
      dto.value = 0;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for negative numbers when in range', async () => {
      class TestDTONegative {
        @IsReasonableNumber(-100, 100)
        value: number;
      }

      const dto = new TestDTONegative();
      dto.value = -50;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('IsStrictEmail', () => {
    class TestDTO {
      @IsStrictEmail()
      value: string;
    }

    it('should pass for valid emails', async () => {
      const validEmails = [
        'user@example.com',
        'john.doe@example.com',
        'user+tag@example.co.uk',
        'test_user@example.com',
        'user123@test-domain.com',
      ];

      for (const email of validEmails) {
        const dto = new TestDTO();
        dto.value = email;
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should fail for emails without @', async () => {
      const dto = new TestDTO();
      dto.value = 'userexample.com';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isStrictEmail).toContain('email');
    });

    it('should fail for emails without domain', async () => {
      const dto = new TestDTO();
      dto.value = 'user@';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for emails without local part', async () => {
      const dto = new TestDTO();
      dto.value = '@example.com';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for emails without TLD', async () => {
      const dto = new TestDTO();
      dto.value = 'user@example';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for emails with spaces', async () => {
      const dto = new TestDTO();
      dto.value = 'user @example.com';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for emails longer than 254 characters', async () => {
      const dto = new TestDTO();
      dto.value = 'a'.repeat(250) + '@example.com'; // 263 chars total

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for local part longer than 64 characters', async () => {
      const dto = new TestDTO();
      dto.value = 'a'.repeat(65) + '@example.com';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for multiple @ symbols', async () => {
      const dto = new TestDTO();
      dto.value = 'user@@example.com';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for invalid characters', async () => {
      const dto = new TestDTO();
      dto.value = 'user#@example.com';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for non-string values', async () => {
      const dto = new TestDTO();
      dto.value = 123 as unknown as string;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass for emails with subdomain', async () => {
      const dto = new TestDTO();
      dto.value = 'user@mail.example.com';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for emails with numbers', async () => {
      const dto = new TestDTO();
      dto.value = 'user123@example123.com';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for email with dots in local part', async () => {
      const dto = new TestDTO();
      dto.value = 'user.name@example.com';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for short TLD', async () => {
      const dto = new TestDTO();
      dto.value = 'user@example.io';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('IsWhitelistedURL', () => {
    class TestDTO {
      @IsWhitelistedURL()
      value: string;
    }

    it('should pass for http URLs', async () => {
      const dto = new TestDTO();
      dto.value = 'http://example.com';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for https URLs', async () => {
      const dto = new TestDTO();
      dto.value = 'https://example.com';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for URLs with paths', async () => {
      const dto = new TestDTO();
      dto.value = 'https://example.com/path/to/resource';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for URLs with query parameters', async () => {
      const dto = new TestDTO();
      dto.value = 'https://example.com/search?q=test&page=1';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for URLs with fragments', async () => {
      const dto = new TestDTO();
      dto.value = 'https://example.com/page#section';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for URLs with ports', async () => {
      const dto = new TestDTO();
      dto.value = 'http://example.com:8080';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for ftp URLs', async () => {
      const dto = new TestDTO();
      dto.value = 'ftp://example.com';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isWhitelistedURL).toContain('HTTP');
    });

    it('should fail for file URLs', async () => {
      const dto = new TestDTO();
      dto.value = 'file:///etc/passwd';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for javascript URLs', async () => {
      const dto = new TestDTO();
      dto.value = 'javascript:alert("XSS")';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for data URLs', async () => {
      const dto = new TestDTO();
      dto.value = 'data:text/html,<script>alert("XSS")</script>';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for invalid URLs', async () => {
      const dto = new TestDTO();
      dto.value = 'not a url';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for empty string', async () => {
      const dto = new TestDTO();
      dto.value = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for non-string values', async () => {
      const dto = new TestDTO();
      dto.value = 123 as unknown as string;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass for URLs with authentication', async () => {
      const dto = new TestDTO();
      dto.value = 'https://user:pass@example.com';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for localhost URLs', async () => {
      const dto = new TestDTO();
      dto.value = 'http://localhost:3000';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for IP address URLs', async () => {
      const dto = new TestDTO();
      dto.value = 'http://192.168.1.1';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for relative URLs', async () => {
      const dto = new TestDTO();
      dto.value = '/path/to/resource';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
