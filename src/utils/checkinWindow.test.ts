import { describe, it, expect } from 'vitest';
import { validateCheckinWindow } from './checkinWindow';

describe('validateCheckinWindow', () => {
  const cycle = {
    window_open_date: '2026-01-01',
    window_close_date: '2026-12-31',
  };

  it('allows dates inside the window', () => {
    expect(validateCheckinWindow(cycle, new Date('2026-06-15'))).toEqual({ allowed: true });
  });

  it('rejects before open', () => {
    const result = validateCheckinWindow(cycle, new Date('2025-12-31'));
    expect(result).toEqual({ allowed: false, message: 'Check-in window has not opened yet' });
  });

  it('rejects after close', () => {
    const result = validateCheckinWindow(cycle, new Date('2027-01-01'));
    expect(result).toEqual({ allowed: false, message: 'Check-in window is closed' });
  });

  it('rejects when no cycle', () => {
    expect(validateCheckinWindow(null)).toEqual({
      allowed: false,
      message: 'No active goal cycle found',
    });
  });

  it('property: timestamps outside range are rejected', () => {
    const open = new Date('2026-03-01');
    const close = new Date('2026-03-31');
    const testCycle = {
      window_open_date: open.toISOString().slice(0, 10),
      window_close_date: close.toISOString().slice(0, 10),
    };

    for (let i = 0; i < 100; i++) {
      const offsetDays = Math.floor(Math.random() * 120) - 60;
      const testDate = new Date('2026-03-15');
      testDate.setDate(testDate.getDate() + offsetDays);
      const result = validateCheckinWindow(testCycle, testDate);

      const day = testDate.getTime();
      const inRange = day >= new Date('2026-03-01').setHours(0, 0, 0, 0) &&
        day <= new Date('2026-03-31').setHours(23, 59, 59, 999);

      if (inRange) {
        expect(result.allowed).toBe(true);
      } else {
        expect(result.allowed).toBe(false);
      }
    }
  });
});
