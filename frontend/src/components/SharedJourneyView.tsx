"use client";

import React, { useMemo } from "react";
import { Baby, Heart, Calendar, CheckCircle, Clock, ArrowLeft } from "lucide-react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import type { SharedJourney } from "@/lib/types";

interface SharedJourneyViewProps {
  journey: SharedJourney;
  onClose: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  appointment: "🩺",
  scan: "📷",
  test: "🧪",
  vaccine: "💉",
  milestone: "⭐",
  reminder: "🔔",
  photo: "📸",
  journal: "📝",
};

const SharedJourneyView: React.FC<SharedJourneyViewProps> = ({ journey, onClose }) => {
  const lmp = parseISO(journey.lmpDate);
  const edd = parseISO(journey.eddDate);
  const today = new Date();
  const totalDays = 280;
  const daysIn = differenceInDays(today, lmp);
  const daysLeft = Math.max(0, differenceInDays(edd, today));
  const progress = Math.min(Math.max((daysIn / totalDays) * 100, 0), 100);
  const currentWeek = Math.min(Math.max(Math.floor(daysIn / 7), 0), 42);

  const trimester =
    currentWeek < 14 ? "1st Trimester" : currentWeek < 28 ? "2nd Trimester" : "3rd Trimester";

  const upcomingEvents = useMemo(() => {
    const todayStr = format(today, "yyyy-MM-dd");
    return journey.events
      .filter((e) => e.date >= todayStr && !e.completed)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);
  }, [journey.events]);

  const completedEvents = journey.events.filter((e) => e.completed).length;

  const sharedDate = journey.sharedAt
    ? format(parseISO(journey.sharedAt), "d MMM yyyy 'at' HH:mm")
    : "recently";

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-pink-100 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Baby className="w-6 h-6 text-pink-500" />
            <div>
              <h1 className="text-lg font-bold text-pink-700">
                {journey.senderName}&apos;s Journey
              </h1>
              <p className="text-[10px] text-gray-400">Shared with you on {sharedDate}</p>
            </div>
          </div>
          <span className="text-xs bg-pink-100 text-pink-600 px-3 py-1 rounded-full font-medium">
            👀 Read-only
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Hero card */}
        <div className="card p-6 bg-gradient-to-br from-pink-50 to-purple-50 text-center space-y-3">
          <div className="text-5xl">🤰</div>
          {journey.babyNickname && (
            <p className="text-lg font-bold text-pink-700">
              Baby &ldquo;{journey.babyNickname}&rdquo;
            </p>
          )}
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-bold text-purple-600">Week {currentWeek}</span>
            <span className="text-sm text-gray-500">· {trimester}</span>
          </div>
          <p className="text-sm text-gray-500">
            Due {format(edd, "d MMMM yyyy")} · {daysLeft} days to go
          </p>

          {/* Progress bar */}
          <div className="w-full bg-pink-100 rounded-full h-3 mt-2">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400">{Math.round(progress)}% of the journey</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{journey.events.length}</p>
            <p className="text-[10px] text-gray-500">Total Events</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{completedEvents}</p>
            <p className="text-[10px] text-gray-500">Completed</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-pink-600">{journey.photoCount}</p>
            <p className="text-[10px] text-gray-500">Photos</p>
          </div>
        </div>

        <div className="card p-4 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Read-only data source</h3>
          <p className="text-xs text-gray-500">
            Source: {journey.dataSource === "remote" ? "Cloud records" : "Device snapshot"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Included records: {journey.sourceRecords?.events ?? journey.events.length} events,
            {" "}{journey.sourceRecords?.symptomsLast7Days ?? journey.recentSymptoms.length} recent symptom tags,
            {" "}{journey.sourceRecords?.photos ?? journey.photoCount} photos.
          </p>
        </div>

        {/* Recent symptoms */}
        {journey.recentSymptoms.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-bold text-pink-700 mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4" /> Recent Check-ins
            </h3>
            <div className="flex flex-wrap gap-2">
              {journey.recentSymptoms.map((s) => (
                <span
                  key={s}
                  className="text-xs bg-pink-50 text-pink-600 px-3 py-1 rounded-full"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Upcoming
            </h3>
            <div className="space-y-2">
              {upcomingEvents.map((evt, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="text-center shrink-0">
                    <p className="text-xs text-purple-400 font-medium">
                      {format(parseISO(evt.date), "MMM")}
                    </p>
                    <p className="text-xl font-bold text-purple-600">
                      {format(parseISO(evt.date), "d")}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-700 truncate">
                      {TYPE_ICONS[evt.type] ?? "📌"} {evt.title}
                    </p>
                    <p className="text-[10px] text-gray-400 capitalize">{evt.type}</p>
                  </div>
                  <Clock className="w-4 h-4 text-gray-300 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed milestones */}
        {completedEvents > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Completed
            </h3>
            <div className="space-y-2">
              {journey.events
                .filter((e) => e.completed)
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 5)
                .map((evt, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-600 truncate">
                        {TYPE_ICONS[evt.type] ?? "📌"} {evt.title}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {format(parseISO(evt.date), "d MMM")}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="card p-4 bg-gradient-to-br from-purple-50 to-pink-50 text-center space-y-2">
          <Baby className="w-8 h-8 text-pink-400 mx-auto" />
          <p className="text-sm text-gray-600">
            This is a read-only view shared by <strong>{journey.senderName}</strong>.
          </p>
          <p className="text-xs text-gray-400">
            Download Baby&apos;s Calendar to track your own pregnancy journey.
          </p>
        </div>
      </main>
    </div>
  );
};

export default SharedJourneyView;
