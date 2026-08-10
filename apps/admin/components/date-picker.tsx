"use client";

import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Timezone-safe both ways. new Date("2026-08-15") parses as UTC midnight and
// .toISOString() converts back through UTC — both can roll the date by one
// day depending on the viewer's timezone. Build/read the string from the
// Date object's local getters instead, never through a UTC round trip.
function parseDateOnly(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabledBefore,
}: {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  disabledBefore?: string; // "YYYY-MM-DD" — dates before this are disabled
}) {
  const selected = parseDateOnly(value);
  const minDate = disabledBefore ? parseDateOnly(disabledBefore) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Same shape/weight as the text inputs next to it in the form —
            deliberately not the shadcn Button component, since this app has
            no shared Button anywhere else and one styled differently from
            its neighbors would stand out for the wrong reason. */}
        <button
          type="button"
          className={cn(
            "w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !value && "text-muted-foreground"
          )}
        >
          {selected ? format(selected, "d MMM yyyy") : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => date && onChange(formatDateOnly(date))}
          disabled={minDate ? { before: minDate } : undefined}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
