import { describe, it, expect } from 'vitest';
import { formatDuration } from '../formatDuration';

describe('formatDuration', () => {
  it('should return "-" for undefined duration', () => {
    expect(formatDuration(undefined)).toBe('-');
  });

  it('should return "-" for zero duration', () => {
    expect(formatDuration(0)).toBe('-');
  });

  it('should return "-" for negative duration', () => {
    expect(formatDuration(-10)).toBe('-');
  });

  it('should format seconds only', () => {
    expect(formatDuration(30)).toBe('30s');
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(59)).toBe('59s');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(3599)).toBe('59:59');
  });

  it('should format hours, minutes and seconds', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(7325)).toBe('2:02:05');
    expect(formatDuration(9000)).toBe('2:30:00');
  });

  it('should handle decimal values by flooring', () => {
    expect(formatDuration(30.7)).toBe('30s');
    expect(formatDuration(90.9)).toBe('1:30');
    expect(formatDuration(3661.5)).toBe('1:01:01');
  });
});
