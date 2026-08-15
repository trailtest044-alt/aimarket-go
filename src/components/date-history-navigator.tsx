import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const DHAKA_TIME_ZONE = "Asia/Dhaka";

function dateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DHAKA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const read = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value || "";
  return { year: read("year"), month: read("month"), day: read("day") };
}

export function dhakaDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function todayDhakaKey() {
  return dhakaDateKey(new Date());
}

export function shiftDateKey(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return todayDhakaKey();
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12));
  return shifted.toISOString().slice(0, 10);
}

export function filterByDhakaDate<T>(
  items: T[],
  selectedDate: string,
  getDate: (item: T) => string | Date,
) {
  return items.filter((item) => dhakaDateKey(getDate(item)) === selectedDate);
}

function labelForDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return key;
  return new Intl.DateTimeFormat("en-BD", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: DHAKA_TIME_ZONE,
  }).format(new Date(Date.UTC(year, month - 1, day, 6)));
}

export function DateHistoryNavigator({
  value,
  onChange,
  visibleCount,
  totalCount,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  visibleCount: number;
  totalCount: number;
  className?: string;
}) {
  const today = todayDhakaKey();
  const isToday = value === today;
  return (
    <div className={`rounded-2xl border border-border bg-secondary/25 p-3 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-sm">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-black">{isToday ? "Today" : labelForDate(value)}</div>
            <div className="text-[11px] text-muted-foreground">Dhaka time · {visibleCount} of {totalCount} records</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onChange(shiftDateKey(value, -1))} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card hover:bg-secondary" aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input type="date" value={value} max={today} onChange={(event) => event.target.value && onChange(event.target.value)} className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-bold outline-none focus:border-primary" aria-label="History date" />
          <button type="button" disabled={isToday} onClick={() => onChange(shiftDateKey(value, 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isToday && <button type="button" onClick={() => onChange(today)} className="h-9 rounded-xl bg-foreground px-3 text-xs font-bold text-background">Today</button>}
        </div>
      </div>
    </div>
  );
}
