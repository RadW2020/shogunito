/**
 * Formats a duration in seconds to a human-readable string
 * @param duration - Duration in seconds
 * @returns Formatted duration string (e.g., "2:30", "1:05:45", "45s")
 */
export function formatDuration(duration?: number): string {
  if (!duration || duration <= 0) {
    return '-';
  }

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${seconds}s`;
  }
}
