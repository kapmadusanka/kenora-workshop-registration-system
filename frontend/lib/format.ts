/**
 * Date and time formatting helpers.
 *
 * Rules:
 * - API sends ISO 8601 UTC strings.
 * - Always display in user's local time.
 * - Single place for date formatting.
 */

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "—";
  }
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return "—";
  }
}

export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "—";
  }
}

export function formatDateRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined
): string {
  if (!startsAt) return "—";
  const startFormatted = formatDateTime(startsAt);
  if (!endsAt) return startFormatted;
  const timeEnd = formatTime(endsAt);
  return `${startFormatted} – ${timeEnd}`;
}

/**
 * Formats an ISO string to `YYYY-MM-DDTHH:mm` suitable for `<input type="datetime-local">` in local time.
 */
export function formatDateTimeLocal(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

/**
 * Formats a Date object to local YYYY-MM-DD string.
 */
export function formatLocalDateString(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${year}-${month}-${day}`;
}

export function getTodayDateString(): string {
  return formatLocalDateString(new Date());
}

/**
 * Returns Monday to Sunday in user's local time as YYYY-MM-DD.
 */
export function getThisWeekDateRange(): { from: string; to: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  return {
    from: formatLocalDateString(monday),
    to: formatLocalDateString(sunday),
  };
}

