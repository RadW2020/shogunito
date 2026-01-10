import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

/**
 * Sanitization Pipe
 *
 * Automatically sanitizes all incoming request data to prevent XSS attacks
 * and other injection vulnerabilities.
 *
 * Features:
 * - Removes potentially dangerous HTML tags and attributes
 * - Trims whitespace from strings
 * - Recursively sanitizes nested objects and arrays
 * - Preserves legitimate data structures
 * - Validates against SQL injection patterns
 *
 * Usage: Applied globally in main.ts
 *
 * @example
 * // In main.ts
 * app.useGlobalPipes(new SanitizationPipe());
 */
@Injectable()
export class SanitizationPipe implements PipeTransform {
  /**
   * Dangerous HTML tags that should be stripped
   */
  private readonly dangerousTags = [
    'script',
    'iframe',
    'object',
    'embed',
    'link',
    'style',
    'form',
    'input',
    'button',
    'textarea',
    'select',
  ];

  /**
   * Dangerous HTML attributes that should be stripped
   */
  private readonly dangerousAttributes = [
    'onerror',
    'onload',
    'onclick',
    'onmouseover',
    'onfocus',
    'onblur',
    'onchange',
    'onsubmit',
    'javascript:',
    'vbscript:',
    'data:text/html',
  ];

  /**
   * SQL injection patterns to detect
   */
  private readonly sqlInjectionPatterns = [
    /(\bor\b|\band\b).*=.*--/i,
    /union.*select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /update\s+.*\s+set/i,
    /exec(\s|\()/i,
    /execute(\s|\()/i,
    /script.*>/i,
    /<.*script/i,
  ];

  transform(value: any, metadata: ArgumentMetadata): any {
    // Don't sanitize if value is not provided
    if (value === null || value === undefined) {
      return value;
    }

    // Skip sanitization for certain metadata types
    if (metadata.type === 'custom') {
      return value;
    }

    return this.sanitize(value);
  }

  /**
   * Recursively sanitize data
   */
  private sanitize(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const key of Object.keys(data)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitize(data[key]);
      }
      return sanitized;
    }

    // Return primitive types as-is (numbers, booleans, etc.)
    return data;
  }

  /**
   * Sanitize a string value
   */
  private sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return str;
    }

    // Remove null bytes and other dangerous control characters
    // Null bytes can be used for injection attacks
    // Build regex dynamically to avoid linter errors with control characters
    const controlChars: number[] = [];
    // Add 0x00-0x08
    for (let i = 0; i <= 0x08; i++) controlChars.push(i);
    // Add 0x0B, 0x0C
    controlChars.push(0x0b, 0x0c);
    // Add 0x0E-0x1F
    for (let i = 0x0e; i <= 0x1f; i++) controlChars.push(i);

    // Create character class pattern by escaping control characters
    const controlCharPattern = controlChars
      .map((code) => `\\u${code.toString(16).padStart(4, '0')}`)
      .join('');

    let sanitized = str.replace(new RegExp(`[${controlCharPattern}]`, 'g'), '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Check for SQL injection patterns
    for (const pattern of this.sqlInjectionPatterns) {
      if (pattern.test(sanitized)) {
        throw new BadRequestException('Input contains potentially dangerous SQL patterns');
      }
    }

    // Remove dangerous HTML tags
    for (const tag of this.dangerousTags) {
      const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi');
      sanitized = sanitized.replace(regex, '');

      // Also remove self-closing tags
      const selfClosingRegex = new RegExp(`<${tag}[^>]*/>`, 'gi');
      sanitized = sanitized.replace(selfClosingRegex, '');

      // Remove opening tags without closing
      const openingRegex = new RegExp(`<${tag}[^>]*>`, 'gi');
      sanitized = sanitized.replace(openingRegex, '');
    }

    // Remove dangerous attributes
    for (const attr of this.dangerousAttributes) {
      const regex = new RegExp(`\\s*${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
      sanitized = sanitized.replace(regex, '');

      // Also check for attributes without quotes
      const noQuotesRegex = new RegExp(`\\s*${attr}\\s*=\\s*\\S+`, 'gi');
      sanitized = sanitized.replace(noQuotesRegex, '');

      // Check for inline event handlers and protocols
      if (attr.includes(':')) {
        const protocolRegex = new RegExp(attr, 'gi');
        sanitized = sanitized.replace(protocolRegex, '');
      }
    }

    // Remove any remaining script tags with variations
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove HTML comments that might contain malicious code
    sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');

    // Encode special HTML characters to prevent XSS
    sanitized = this.encodeHtmlEntities(sanitized);

    return sanitized;
  }

  /**
   * Encode HTML entities to prevent XSS
   */
  private encodeHtmlEntities(str: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return str.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
  }
}
