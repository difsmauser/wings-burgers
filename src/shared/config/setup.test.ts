import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Project setup verification', () => {
  it('fast-check is configured correctly', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (n) => {
        return n >= 1 && n <= 100;
      })
    );
  });

  it('path aliases resolve correctly', async () => {
    const { APP_CONFIG } = await import('@/shared/config/index');
    expect(APP_CONFIG.name).toBe('Wings & Burgers');
  });
});
