export const CLINIC_TIMEZONE = 'Asia/Dhaka';
export const DHAKA_OFFSET_STRING = '+06:00';

/**
 * Returns date in Asia/Dhaka formatted as YYYY-MM-DD
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
 * Returns tomorrow's date in Asia/Dhaka formatted as YYYY-MM-DD
 */
export function getDhakaTomorrowString(): string {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return getDhakaDateString(tomorrow);
}

/**
 * Add or subtract days from a YYYY-MM-DD string without timezone skew
 */
export function addDaysDhaka(dateStr: string, days: number): string {
  if (!dateStr) return getDhakaDateString();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  const date = new Date(Date.UTC(y, m, d + days, 12, 0, 0));
  return getDhakaDateString(date);
}

/**
 * Formats YYYY-MM-DD to "08 September 2026"
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

/**
 * Parses appointment date & time into a timestamp in Asia/Dhaka (+06:00)
 */
export function parseAppointmentDateTime(dateStr: string, timeStr?: string): number {
  if (!dateStr) return 0;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 0;

  const [, year, month, day] = match;
  let hours = 23;
  let minutes = 59;
  let seconds = 59;

  if (timeStr && typeof timeStr === 'string' && timeStr.trim()) {
    const raw = timeStr.trim().toUpperCase();
    const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = parseInt(match12[2], 10);
      const meridian = match12[3];

      if (h >= 1 && h <= 12 && m >= 0 && m <= 59) {
        hours = meridian === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
        minutes = m;
        seconds = 0;
      }
    } else {
      const match24 = raw.match(/^(\d{1,2}):(\d{2})$/);
      if (match24) {
        const h = parseInt(match24[1], 10);
        const m = parseInt(match24[2], 10);
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          hours = h;
          minutes = m;
          seconds = 0;
        }
      }
    }
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = `${year}-${month}-${day}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}${DHAKA_OFFSET_STRING}`;
  const ts = Date.parse(iso);
  return isNaN(ts) ? 0 : ts;
}

export function isAppointmentPast(dateStr: string, timeStr?: string): boolean {
  const ts = parseAppointmentDateTime(dateStr, timeStr);
  if (!ts) return false;
  return ts < Date.now();
}

export function getAppointmentLifecycle(
  dateStr: string,
  timeStr?: string,
  status?: string
): 'upcoming' | 'completed' | 'cancelled' | 'no-show' {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'no-show') return 'no-show';
  return isAppointmentPast(dateStr, timeStr) ? 'completed' : 'upcoming';
}
