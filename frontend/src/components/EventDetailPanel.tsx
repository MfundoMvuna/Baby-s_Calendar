"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  Circle,
  X,
  Stethoscope,
  Camera,
  Syringe,
  Baby,
  Bell,
  Activity,
  MessageCircle,
} from "lucide-react";
import type { CalendarEvent } from "@/lib/types";

interface Props {
  date: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onToggleComplete: (eventId: string) => void;
  onSaveNote: (eventId: string, notes: string) => void;
  onSaveAnswer: (eventId: string, question: string, answer: string) => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  appointment: <Stethoscope className="w-4 h-4" />,
  scan: <Camera className="w-4 h-4" />,
  test: <Activity className="w-4 h-4" />,
  vaccine: <Syringe className="w-4 h-4" />,
  milestone: <Baby className="w-4 h-4" />,
  reminder: <Bell className="w-4 h-4" />,
  photo: <Camera className="w-4 h-4" />,
  journal: <MessageCircle className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  appointment: "text-primary-600 bg-primary-50",
  scan: "text-purple-600 bg-purple-50",
  test: "text-amber-600 bg-amber-50",
  vaccine: "text-blue-600 bg-blue-50",
  milestone: "text-pink-600 bg-pink-50",
  reminder: "text-sage-600 bg-sage-50",
  photo: "text-green-600 bg-green-50",
  journal: "text-indigo-600 bg-indigo-50",
};

export default function EventDetailPanel({
  date,
  events,
  onClose,
  onToggleComplete,
  onSaveNote,
  onSaveAnswer,
}: Props) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(
    events.length === 1 ? events[0].eventId : null
  );
  const [noteText, setNoteText] = useState<Record<string, string>>({});

  return (
    <div className="card p-5 animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-primary-700">
          {format(date, "EEEE, d MMMM")}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-primary-50 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {events.length === 0 ? (
        <p className="text-gray-400 text-sm italic">
          No events scheduled. Tap + to add one.
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((evt) => {
            const isExpanded = expandedEvent === evt.eventId;
            const colorClass = TYPE_COLORS[evt.type] ?? "text-gray-600 bg-gray-50";

            return (
              <div
                key={evt.eventId}
                className={`rounded-xl border transition-all ${
                  evt.completed ? "border-green-200 bg-green-50/30" : "border-primary-100"
                }`}
              >
                {/* Event summary row */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedEvent(isExpanded ? null : evt.eventId)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedEvent(isExpanded ? null : evt.eventId); } }}
                  className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
                >
                  <span className={`p-2 rounded-lg ${colorClass}`}>
                    {TYPE_ICONS[evt.type] ?? <Circle className="w-4 h-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${evt.completed ? "line-through text-gray-400" : "text-gray-700"}`}>
                      {evt.title}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{evt.description}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete(evt.eventId);
                    }}
                    className="shrink-0"
                    aria-label={evt.completed ? "Mark incomplete" : "Mark complete"}
                  >
                    {evt.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-primary-300" />
                    )}
                  </button>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-primary-50 pt-3">
                    <p className="text-sm text-gray-600">{evt.description}</p>

                    {/* Questions */}
                    {evt.questions && evt.questions.length > 0 && (
                      <div className="space-y-2">
                        {evt.questions.map((q) => (
                          <div key={q}>
                            <label className="text-xs font-medium text-primary-600 block mb-1">
                              {q}
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Tell me more…"
                                defaultValue={evt.answers?.[q] ?? ""}
                                className="flex-1 text-sm !p-2"
                                onBlur={(e) => onSaveAnswer(evt.eventId, q, e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">
                        Your notes
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Add any notes or thoughts…"
                        className="text-sm !p-2"
                        value={noteText[evt.eventId] ?? evt.notes ?? ""}
                        onChange={(e) =>
                          setNoteText((prev) => ({ ...prev, [evt.eventId]: e.target.value }))
                        }
                        onBlur={() => {
                          const text = noteText[evt.eventId];
                          if (text !== undefined) onSaveNote(evt.eventId, text);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
