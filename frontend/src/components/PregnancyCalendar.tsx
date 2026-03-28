"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarEvent } from "@/lib/types";
import { getTrimester, TRIMESTERS } from "@/lib/clinical-timeline";
import { getCurrentWeek } from "@/lib/utils";

interface Props {
  events: CalendarEvent[];
  lmpDate: string;
  onSelectDate: (date: Date) => void;
  selectedDate: Date | null;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_DOT_COLORS: Record<string, string> = {
  appointment: "bg-primary-500",
  scan: "bg-purple-500",
  test: "bg-amber-400",
  vaccine: "bg-blue-400",
  milestone: "bg-pink-400",
  reminder: "bg-sage-300",
  photo: "bg-green-400",
  journal: "bg-indigo-300",
};

export default function PregnancyCalendar({
  events,
  lmpDate,
  onSelectDate,
  selectedDate,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const currentWeek = getCurrentWeek(lmpDate);
  const trimester = getTrimester(currentWeek);
  const triInfo = TRIMESTERS[trimester];

  /** Get events for a given day */
  function eventsForDay(day: Date): CalendarEvent[] {
    const dayStr = format(day, "yyyy-MM-dd");
    return events.filter((e) => e.date === dayStr);
  }

  /** Trimester-accent border color for the header */
  const headerBorder =
    trimester === "first"
      ? "border-purple-300"
      : trimester === "second"
        ? "border-primary-300"
        : "border-sage-300";

  return (
    <div className="card p-4 md:p-6">
      {/* ── Header ── */}
      <div className={`flex items-center justify-between mb-4 pb-3 border-b-2 ${headerBorder}`}>
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-primary-50 transition"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-primary-600" />
        </button>

        <div className="text-center">
          <h2 className="text-lg font-bold text-primary-700">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <span className="text-xs font-medium text-purple-500">
            Week {currentWeek} · {triInfo.label}
          </span>
        </div>

        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-primary-50 transition"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-primary-600" />
        </button>
      </div>

      {/* ── Day names ── */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-purple-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* ── Day cells ── */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentMonth);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);
          const dayEvents = eventsForDay(day);
          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={`
                relative flex flex-col items-center justify-center
                rounded-xl p-1 min-h-[48px] transition-all text-sm
                ${!inMonth ? "opacity-30" : ""}
                ${selected ? "bg-primary-500 text-white shadow-md scale-105" : ""}
                ${!selected && today ? "bg-primary-100 ring-2 ring-primary-400" : ""}
                ${!selected && !today && inMonth ? "hover:bg-primary-50" : ""}
              `}
            >
              <span className={`font-medium ${selected ? "text-white" : today ? "text-primary-700" : "text-gray-700"}`}>
                {format(day, "d")}
              </span>

              {/* Event dots */}
              {hasEvents && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((evt) => (
                    <span
                      key={evt.eventId}
                      className={`w-1.5 h-1.5 rounded-full ${selected ? "bg-white/80" : EVENT_DOT_COLORS[evt.type] ?? "bg-gray-300"}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-primary-100 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary-500" /> Appointment</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Scan</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Test</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400" /> Milestone</span>
      </div>
    </div>
  );
}
