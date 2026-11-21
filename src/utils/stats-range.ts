import { StatsPeriod } from "../types/stats.types";

const pad = (n: number) => String(n).padStart(2, "0");

const wall = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getHours())}:00:00`;

const DAY_LABELS = ["12am", "4am", "8am", "12pm", "4pm", "8pm"];
const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thur", "Fri", "Sat", "Sun"];
const YEAR_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function isValidTimeZone(tz?: string): boolean {
  if (!tz) return false;

  try {
    new Intl.DateTimeFormat("en-Us", { timeZone: tz });

    return true;
  } catch (error) {
    return false;
  }
}

function localNow(timeZone: string, now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);

  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

export type PeriodRange = {
  start: string;
  end: string;
  labels: string[];
  bucketsql: string;
  currentIndex: number;
};

export function getPeriodRange(
  period: StatsPeriod[number],
  timeZone: string,
  now = new Date(),
): PeriodRange {
  const local = localNow(timeZone, now);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const h = local.getUTCHours();
  const col = `(t."date" AT TIME ZONE :tz)`;

  switch (period) {
    case "day":
      return {
        start: wall(new Date(Date.UTC(y, m, d))),
        end: wall(new Date(Date.UTC(y, m, d + 1))),
        labels: DAY_LABELS,
        bucketsql: `FLOOR(EXTRACT(HOUR FROM ${col}) / 4)::int`,
        currentIndex: Math.floor(h / 4),
      };

    case "week": {
      const dow = (local.getUTCDay() + 6) % 7;
      return {
        start: wall(new Date(Date.UTC(y, m, d - dow))),
        end: wall(new Date(Date.UTC(y, m, d - dow + 7))),
        labels: WEEK_LABELS,
        bucketsql: `(EXTRACT(ISODOW FROM ${col}) - 1)::int`,
        currentIndex: dow,
      };
    }

    case "month": {
      const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      const buckets = Math.ceil(daysInMonth / 7);

      return {
        start: wall(new Date(Date.UTC(y, m, 1))),
        end: wall(new Date(Date.UTC(y, m + 1, 1))),
        labels: Array.from({ length: buckets }, (_, i) => `W${i + 1}`),
        bucketsql: `FLOOR((EXTRACT(DAY FROM ${col}) - 1) / 7)::int`,
        currentIndex: Math.floor((d - 1) / 7),
      };
    }

    case "year":
      return {
        start: wall(new Date(Date.UTC(y, 0, 1))),
        end: wall(new Date(Date.UTC(y + 1, 0, 1))),
        labels: YEAR_LABELS,
        bucketsql: `(EXTRACT(MONTH FROM ${col}) - 1)::int`,
        currentIndex: m,
      };
  }
}
