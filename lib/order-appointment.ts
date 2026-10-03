const CAIRO_TIME_ZONE = "Africa/Cairo";

const STANDARD_RANGES: Record<
  string,
  { start: string; end: string }
> = {
  "10 ص - 1 م": { start: "10:00", end: "13:00" },
  "1 م - 4 م": { start: "13:00", end: "16:00" },
  "4 م - 7 م": { start: "16:00", end: "19:00" },
  "7 م - 10 م": { start: "19:00", end: "22:00" },
};

function normalizeRange(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function to24Hour(
  hourValue: number,
  minuteValue: number,
  marker: string,
) {
  let hour = hourValue % 12;
  if (marker === "م") hour += 12;

  return `${String(hour).padStart(2, "0")}:${String(
    minuteValue,
  ).padStart(2, "0")}`;
}

function parseArabicRange(value: string) {
  const normalized = normalizeRange(value);
  const match = normalized.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(ص|م)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(ص|م)$/,
  );

  if (!match) return null;

  return {
    start: to24Hour(
      Number(match[1]),
      Number(match[2] || 0),
      match[3],
    ),
    end: to24Hour(
      Number(match[4]),
      Number(match[5] || 0),
      match[6],
    ),
  };
}

function parse24HourRange(value: string) {
  const normalized = normalizeRange(value);
  const match = normalized.match(
    /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/,
  );

  if (!match) return null;

  return {
    start: `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`,
    end: `${String(Number(match[3])).padStart(2, "0")}:${match[4]}`,
  };
}

function offsetMinutes(date: Date, timeZone: string) {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((item) => item.type === "timeZoneName")?.value;

  if (!part || part === "GMT") return 0;

  const match = part.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  return (
    sign *
    (Number(match[2]) * 60 + Number(match[3] || 0))
  );
}

function cairoLocalToUtc(dateKey: string, timeKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = timeKey.split(":").map(Number);

  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return null;
  }

  const wallClockUtc = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    0,
    0,
  );

  let guess = new Date(wallClockUtc);

  for (let index = 0; index < 2; index += 1) {
    const offset = offsetMinutes(guess, CAIRO_TIME_ZONE);
    guess = new Date(wallClockUtc - offset * 60 * 1000);
  }

  return guess;
}

export function parsePreferredAppointment(
  preferredDate?: string | null,
  preferredTime?: string | null,
) {
  const dateKey = String(preferredDate || "").trim();
  const rawTime = String(preferredTime || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !rawTime) {
    return null;
  }

  const normalized = normalizeRange(rawTime);
  const range =
    STANDARD_RANGES[normalized] ||
    parseArabicRange(normalized) ||
    parse24HourRange(normalized);

  if (!range) return null;

  const startsAt = cairoLocalToUtc(dateKey, range.start);
  let endsAt = cairoLocalToUtc(dateKey, range.end);

  if (!startsAt || !endsAt) return null;

  if (endsAt <= startsAt) {
    endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
  }

  return {
    startsAt,
    endsAt,
  };
}

function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAIRO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const read = (type: string) =>
    parts.find((item) => item.type === type)?.value || "";

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: Number(read("hour")),
    minute: Number(read("minute")),
  };
}

function arabicClock(hour24: number, minute: number) {
  const marker = hour24 < 12 ? "ص" : "م";
  let hour = hour24 % 12;
  if (hour === 0) hour = 12;

  return minute
    ? `${hour}:${String(minute).padStart(2, "0")} ${marker}`
    : `${hour} ${marker}`;
}

export function formatAppointmentForOrder(
  startsAt: Date,
  endsAt: Date,
) {
  const start = localParts(startsAt);
  const end = localParts(endsAt);

  return {
    preferredDate: `${start.year}-${start.month}-${start.day}`,
    preferredTime: `${arabicClock(
      start.hour,
      start.minute,
    )} - ${arabicClock(end.hour, end.minute)}`,
  };
}
