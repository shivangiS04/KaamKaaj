import { describe, it, expect } from 'vitest';
import { calculateScore } from './scoreCalculator';

describe('calculateScore', () => {
  it('numeric_min: score = (actual / target) * 100 capped at 100', () => {
    expect(calculateScore({ uomType: 'numeric_min', targetValue: 100, actualValue: 80 })).toBe(80);
    expect(calculateScore({ uomType: 'numeric_min', targetValue: 100, actualValue: 120 })).toBe(100);
  });

  it('numeric_max: score = (target / actual) * 100 capped at 100', () => {
    expect(calculateScore({ uomType: 'numeric_max', targetValue: 5, actualValue: 4 })).toBe(100);
    expect(calculateScore({ uomType: 'numeric_max', targetValue: 5, actualValue: 10 })).toBe(50);
  });

  it('handles zero edge cases', () => {
    expect(calculateScore({ uomType: 'numeric_min', targetValue: 0, actualValue: 50 })).toBe(0);
    expect(calculateScore({ uomType: 'numeric_max', targetValue: 5, actualValue: 0 })).toBe(0);
  });

  it('property: numeric scores stay in [0, 100] for positive inputs', () => {
    for (let i = 0; i < 200; i++) {
      const target = Math.random() * 1000 + 0.01;
      const actual = Math.random() * 1000;

      const minScore = calculateScore({ uomType: 'numeric_min', targetValue: target, actualValue: actual });
      const maxScore = calculateScore({ uomType: 'numeric_max', targetValue: target, actualValue: actual });

      if (minScore !== null) {
        expect(minScore).toBeGreaterThanOrEqual(0);
        expect(minScore).toBeLessThanOrEqual(100);
        const expected = Math.min((actual / target) * 100, 100);
        expect(minScore).toBeCloseTo(expected, 5);
      }
      if (maxScore !== null && actual > 0) {
        expect(maxScore).toBeGreaterThanOrEqual(0);
        expect(maxScore).toBeLessThanOrEqual(100);
        const expected = Math.min((target / actual) * 100, 100);
        expect(maxScore).toBeCloseTo(expected, 5);
      }
    }
  });
});
