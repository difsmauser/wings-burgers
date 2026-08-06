import { describe, it, expect } from 'vitest';
import { APP_CONFIG } from './index';

describe('APP_CONFIG', () => {
  it('should have correct app name', () => {
    expect(APP_CONFIG.name).toBe('Wings & Burgers');
  });

  it('should have a version string', () => {
    expect(APP_CONFIG.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
