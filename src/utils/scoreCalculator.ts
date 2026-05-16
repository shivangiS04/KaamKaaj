/**
 * Score Calculator Utility
 * Computes achievement scores based on UoM type
 */

export type UomType = 'numeric_min' | 'numeric_max' | 'timeline' | 'zero';

export interface ScoreInput {
  uomType: UomType;
  targetValue?: number | null;
  actualValue?: number | null;
  targetDate?: string | null;
  actualDate?: string | null;
}

/**
 * Calculate achievement score based on UoM type
 * @param input - Score calculation input parameters
 * @returns Score as a percentage (0-100) or null if insufficient data
 */
export function calculateScore(input: ScoreInput): number | null {
  const { uomType, targetValue, actualValue, targetDate, actualDate } = input;

  switch (uomType) {
    case 'numeric_min':
      // Higher is better: score = (actual / target) * 100, capped at 100%
      if (actualValue === null || actualValue === undefined || targetValue === null || targetValue === undefined) {
        return null;
      }
      if (targetValue === 0) return 0;
      const minScore = (actualValue / targetValue) * 100;
      return Math.min(minScore, 100);

    case 'numeric_max':
      // Lower is better: score = (target / actual) * 100, capped at 100%
      if (actualValue === null || actualValue === undefined || targetValue === null || targetValue === undefined) {
        return null;
      }
      if (actualValue === 0) return 0;
      const maxScore = (targetValue / actualValue) * 100;
      return Math.min(maxScore, 100);

    case 'timeline':
      // Date-based: 100% if on or before deadline, 0% otherwise
      if (!actualDate || !targetDate) {
        return null;
      }
      const actual = new Date(actualDate);
      const target = new Date(targetDate);
      return actual <= target ? 100 : 0;

    case 'zero':
      // Zero-based: 100% if actual equals 0, 0% otherwise
      if (actualValue === null || actualValue === undefined) {
        return null;
      }
      return actualValue === 0 ? 100 : 0;

    default:
      return null;
  }
}

/**
 * Format score for display
 * @param score - Score value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted score string
 */
export function formatScore(score: number | null, decimals: number = 1): string {
  if (score === null || score === undefined) {
    return '-';
  }
  return `${score.toFixed(decimals)}%`;
}

/**
 * Get score color class based on score value
 * @param score - Score value (0-100)
 * @returns Tailwind CSS color class
 */
export function getScoreColorClass(score: number | null): string {
  if (score === null || score === undefined) {
    return 'text-gray-400';
  }
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  if (score >= 50) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get score badge color class based on score value
 * @param score - Score value (0-100)
 * @returns Tailwind CSS badge color class
 */
export function getScoreBadgeClass(score: number | null): string {
  if (score === null || score === undefined) {
    return 'bg-gray-100 text-gray-800';
  }
  if (score >= 90) return 'bg-green-100 text-green-800';
  if (score >= 70) return 'bg-yellow-100 text-yellow-800';
  if (score >= 50) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}
