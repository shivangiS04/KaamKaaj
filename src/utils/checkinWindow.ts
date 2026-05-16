export interface GoalCycleWindow {
  window_open_date: string;
  window_close_date: string;
}

export type CheckinWindowError =
  | 'No active goal cycle found'
  | 'Check-in window has not opened yet'
  | 'Check-in window is closed';

export function validateCheckinWindow(
  cycle: GoalCycleWindow | null | undefined,
  now: Date = new Date()
): { allowed: true } | { allowed: false; message: CheckinWindowError } {
  if (!cycle) {
    return { allowed: false, message: 'No active goal cycle found' };
  }

  const open = new Date(cycle.window_open_date);
  const close = new Date(cycle.window_close_date);
  open.setHours(0, 0, 0, 0);
  close.setHours(23, 59, 59, 999);

  if (now < open) {
    return { allowed: false, message: 'Check-in window has not opened yet' };
  }
  if (now > close) {
    return { allowed: false, message: 'Check-in window is closed' };
  }
  return { allowed: true };
}
