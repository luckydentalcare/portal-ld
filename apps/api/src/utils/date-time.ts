/**
 * Date and Time utilities strictly aligned with the clinic's local timezone: Asia/Dhaka (UTC+6).
 * Ensures zero UTC midnight off-by-one bugs and provides automated lifecycle determination
 * for appointments based on appointment date + time vs current Asia/Dhaka time.
 */

export const CLINIC_TIMEZONE = 'Asia/Dhaka';
export const DHAKA_OFFSET_HOURS = 6;
export const DHAKA_OFFSET_STRING = '+06:00';

/**
 * Returns the current date in Asia/Dhaka formatted as YYYY-MM-DD.
 */
export function getDhakaDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

/**
 * Returns tomorrow's date in Asia/Dhaka formatted as YYYY-MM-DD.
 */
export function getDhakaTomorrowDateString(): string {
  const now = new Date();
  // Add 24 hours
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return getDhakaDateString(tomorrow);
}

export const getDhakaTomorrowString = getDhakaTomorrowDateString;

/**
 * Parses appointment date (YYYY-MM-DD) and appointment time (e.g. "07:30 PM", "10:00 AM", "14:30")
 * into a precise timestamp in the Asia/Dhaka timezone (+06:00).
 *
 * Safe Fallback Rule:
 * If the legacy database record has an empty, missing, or unparseable appointment time,
 * the time falls back to 23:59:59 (end of clinic day in Asia/Dhaka), so an appointment
 * on today's date remains UPCOMING until the day concludes.
 */
export function parseAppointmentDateTime(
  dateStr: string,
  timeStr?: string
): { timestamp: number; isoString: string; isFallback: boolean } {
  if (!dateStr || typeof dateStr !== 'string') {
    return { timestamp: 0, isoString: '', isFallback: true };
  }

  const cleanDate = dateStr.trim();
  const dateMatch = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) {
    return { timestamp: 0, isoString: '', isFallback: true };
  }

  const [, year, month, day] = dateMatch;

  let hours = 23;
  let minutes = 59;
  let seconds = 59;
  let isFallback = true;

  if (timeStr && typeof timeStr === 'string' && timeStr.trim()) {
    const rawTime = timeStr.trim().toUpperCase();

    // Match 12-hour format: e.g. "07:30 PM", "7:30PM", "10:15 AM", "12:00 PM"
    const match12 = rawTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = parseInt(match12[2], 10);
      const meridian = match12[3];

      if (h >= 1 && h <= 12 && m >= 0 && m <= 59) {
        if (meridian === 'AM') {
          hours = h === 12 ? 0 : h;
        } else {
          hours = h === 12 ? 12 : h + 12;
        }
        minutes = m;
        seconds = 0;
        isFallback = false;
      }
    } else {
      // Match 24-hour format: e.g. "19:30", "09:15"
      const match24 = rawTime.match(/^(\d{1,2}):(\d{2})$/);
      if (match24) {
        const h = parseInt(match24[1], 10);
        const m = parseInt(match24[2], 10);
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          hours = h;
          minutes = m;
          seconds = 0;
          isFallback = false;
        }
      }
    }
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const isoString = `${year}-${month}-${day}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}${DHAKA_OFFSET_STRING}`;
  const timestamp = Date.parse(isoString);

  return {
    timestamp: isNaN(timestamp) ? 0 : timestamp,
    isoString,
    isFallback
  };
}

/**
 * Evaluates whether an appointment is in the past based on Asia/Dhaka time.
 */
export function isAppointmentPast(dateStr: string, timeStr?: string): boolean {
  const { timestamp } = parseAppointmentDateTime(dateStr, timeStr);
  if (!timestamp) return false;
  return timestamp < Date.now();
}

/**
 * Automatically computes appointment lifecycle status.
 * Replaces manual check/uncheck controls:
 * - If status is explicitly cancelled or no-show, preserve it.
 * - If appointment date/time < current Asia/Dhaka date/time -> 'completed'
 * - If appointment date/time >= current Asia/Dhaka date/time -> 'upcoming'
 */
export function getAppointmentLifecycle(
  dateStr: string,
  timeStr?: string,
  existingStatus?: string
): 'upcoming' | 'completed' | 'cancelled' | 'no-show' {
  if (existingStatus === 'cancelled') return 'cancelled';
  if (existingStatus === 'no-show') return 'no-show';

  return isAppointmentPast(dateStr, timeStr) ? 'completed' : 'upcoming';
}

/**
 * Formats a YYYY-MM-DD date into friendly Bangladesh display format:
 * e.g. "08 September 2026"
 */
export function formatDhakaDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: CLINIC_TIMEZONE
  });
}
