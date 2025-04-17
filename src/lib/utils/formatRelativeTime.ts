/**
 * Formats a date into a relative time string with custom increments
 * Follows specific format:
 * - Less than 15 min: "a few minutes ago"
 * - 15-45 min: "X minutes ago" in 15 min increments
 * - 1-24 hours: "X hours ago"
 * - 1-7 days: "X days ago"
 * - 1-4 weeks: "X weeks ago"
 * - 1-12 months: "X months ago"
 * - 1+ years: "X years ago"
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30.44); // Average month length
  const diffYears = Math.floor(diffDays / 365.25); // Account for leap years

  // Minutes
  if (diffMins < 15) {
    return 'a few minutes ago';
  }
  if (diffMins < 60) {
    const roundedMins = Math.floor(diffMins / 15) * 15;
    return `${roundedMins} minutes ago`;
  }

  // Hours
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  // Days
  if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }

  // Weeks
  if (diffWeeks < 4) {
    return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
  }

  // Months
  if (diffMonths < 12) {
    return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
  }

  // Years
  return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
}

/**
 * Formats a duration in milliseconds to a human readable string
 * Example: "2h 15m 30s" or "15m 30s" or "30s"
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
} 