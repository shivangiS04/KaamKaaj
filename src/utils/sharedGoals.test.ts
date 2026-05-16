import { describe, it, expect } from 'vitest';
import { canViewSharedAssignment } from './sharedGoalsRls';

describe('shared goal RLS visibility', () => {
  it('employee can only view own assignments', () => {
    const employees = ['emp-a', 'emp-b', 'emp-c'];
    for (const viewer of employees) {
      for (const assignedTo of employees) {
        const canView = canViewSharedAssignment(assignedTo, viewer);
        expect(canView).toBe(viewer === assignedTo);
      }
    }
  });

  it('property: random UUID pairs enforce self-only access', () => {
    for (let i = 0; i < 100; i++) {
      const viewer = `user-${Math.floor(Math.random() * 50)}`;
      const assigned = `user-${Math.floor(Math.random() * 50)}`;
      expect(canViewSharedAssignment(assigned, viewer)).toBe(viewer === assigned);
    }
  });
});
