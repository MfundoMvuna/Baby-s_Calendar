"use client";

import { useCallback, useEffect, useState } from "react";
import { format, addDays, parseISO } from "date-fns";
import { Plus, Baby, Heart, Menu, X, LogOut } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import AuthScreen from "@/components/AuthScreen";
import OnboardingFlow from "@/components/OnboardingFlow";
import PregnancyCalendar from "@/components/PregnancyCalendar";
import TrimesterProgress from "@/components/TrimesterProgress";
import EventDetailPanel from "@/components/EventDetailPanel";
import PhotoGallery from "@/components/PhotoGallery";
import DailyCheckIn from "@/components/DailyCheckIn";

import type { CalendarEvent, OnboardingData, PhotoRecord, PregnancyRecord, SymptomEntry } from "@/lib/types";
import { DEFAULT_MILESTONES } from "@/lib/clinical-timeline";
import {
  getPregnancyRecord,
  savePregnancyRecord,
  getEvents,
  saveEvent,
  updateEvent,
  getPhotos,
  savePhotoRecord,
  getSymptomEntries,
  saveSymptomEntry,
} from "@/lib/api";
import { calculateEDD, dateForWeek, formatDate, generateId, getCurrentWeek } from "@/lib/utils";

type Tab = "calendar" | "checkin" | "photos";

export default function HomePage() {
  const { user, loading: authLoading, handleSignOut } = useAuth();
  const [record, setRecord] = useState<PregnancyRecord | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("calendar");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // New event form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<CalendarEvent["type"]>("appointment");

  // Load data from localStorage on mount
  useEffect(() => {
    setRecord(getPregnancyRecord());
    setEvents(getEvents());
    setPhotos(getPhotos());
    setMounted(true);
  }, []);

  /** Seed default milestone events once on first setup */
  const seedDefaults = useCallback(
    (lmpDate: string) => {
      const existing = getEvents();
      if (existing.length > 0) return existing;

      const seeded: CalendarEvent[] = DEFAULT_MILESTONES.map((m) => ({
        eventId: generateId(),
        userId: "local-user",
        date: dateForWeek(lmpDate, m.weekNumber),
        title: m.title,
        description: m.description,
        type: m.type,
        completed: false,
        questions: m.questions,
      }));
      localStorage.setItem("calendar_events", JSON.stringify(seeded));
      return seeded;
    },
    []
  );

  /** Onboarding complete handler */
  function handleOnboarding(data: OnboardingData) {
    // If user gave weeks instead of LMP, approximate LMP
    let lmpDate = data.lmpDate;
    if (!lmpDate && data.weeksPregnant) {
      const approxLmp = addDays(new Date(), -(data.weeksPregnant * 7));
      lmpDate = format(approxLmp, "yyyy-MM-dd");
      data.lmpDate = lmpDate;
    }

    const rec = savePregnancyRecord(data);
    setRecord(rec);
    const seeded = seedDefaults(rec.lmpDate);
    setEvents(seeded);
  }

  /** Refresh events from storage */
  function refreshEvents() {
    setEvents(getEvents());
  }

  /** Toggle event completion */
  function handleToggleComplete(eventId: string) {
    const evt = events.find((e) => e.eventId === eventId);
    if (!evt) return;
    updateEvent(eventId, { completed: !evt.completed });
    refreshEvents();
  }

  /** Save a note on an event */
  function handleSaveNote(eventId: string, notes: string) {
    updateEvent(eventId, { notes });
    refreshEvents();
  }

  /** Save an answer to a question */
  function handleSaveAnswer(eventId: string, question: string, answer: string) {
    const evt = events.find((e) => e.eventId === eventId);
    if (!evt) return;
    const answers = { ...(evt.answers ?? {}), [question]: answer };
    updateEvent(eventId, { answers });
    refreshEvents();
  }

  /** Add a new custom event */
  function handleAddEvent() {
    if (!selectedDate || !newTitle.trim()) return;
    saveEvent({
      date: format(selectedDate, "yyyy-MM-dd"),
      title: newTitle,
      description: newDesc,
      type: newType,
      completed: false,
    });
    refreshEvents();
    setNewTitle("");
    setNewDesc("");
    setShowAddEvent(false);
  }

  /** Photo upload handler (stores data URL in localStorage for offline demo) */
  function handlePhotoUpload(
    file: File,
    weekNumber: number,
    type: PhotoRecord["type"],
    caption: string
  ) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      savePhotoRecord({
        date: format(new Date(), "yyyy-MM-dd"),
        s3Key: `local/${file.name}`,
        caption,
        weekNumber,
        type,
        presignedUrl: dataUrl,
      });
      setPhotos(getPhotos());
    };
    reader.readAsDataURL(file);
  }

  /** Symptom check-in handler */
  function handleCheckIn(entry: Omit<SymptomEntry, "entryId" | "userId">) {
    saveSymptomEntry(entry);
  }

  /** Events for the currently selected date */
  const selectedEvents = selectedDate
    ? events.filter((e) => e.date === format(selectedDate, "yyyy-MM-dd"))
    : [];

  // ── Render ──

  // Wait for client-side hydration
  if (!mounted) return null;

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="flex items-center gap-3 animate-pulse">
          <Baby className="w-10 h-10 text-primary-500" />
          <span className="text-primary-400 font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return <AuthScreen />;
  }

  // Onboarding
  if (!record) {
    return <OnboardingFlow onComplete={handleOnboarding} />;
  }

  const currentWeek = getCurrentWeek(record.lmpDate);

  return (
    <div className="min-h-screen">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-primary-100 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Baby className="w-6 h-6 text-primary-500" />
            <h1 className="text-lg font-bold text-primary-700">
              Baby&apos;s Calendar
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-purple-500 font-medium">
              Week {currentWeek}
            </span>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-2 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-500"
            >
              <LogOut className="w-4 h-4" />
            </button>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="sm:hidden p-2 rounded-lg hover:bg-primary-50"
            >
              {menuOpen ? <X className="w-5 h-5 text-primary-600" /> : <Menu className="w-5 h-5 text-primary-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <nav className="sticky top-[57px] z-20 bg-white/80 backdrop-blur-md border-b border-primary-50">
        <div className="max-w-5xl mx-auto flex">
          {(
            [
              { key: "calendar", label: "Calendar" },
              { key: "checkin", label: "Check-in" },
              { key: "photos", label: "Photos" },
            ] as { key: Tab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium text-center transition-all border-b-2 ${
                activeTab === tab.key
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-400 hover:text-primary-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="max-w-5xl mx-auto p-4 space-y-4">
        {activeTab === "calendar" && (
          <>
            {/* Trimester progress */}
            <TrimesterProgress
              lmpDate={record.lmpDate}
              currentWeek={currentWeek}
              eddDate={formatDate(record.eddDate)}
              babyNickname={record.babyNickname}
            />

            {/* Calendar + Detail side-by-side on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-3">
                <PregnancyCalendar
                  events={events}
                  lmpDate={record.lmpDate}
                  onSelectDate={setSelectedDate}
                  selectedDate={selectedDate}
                />
              </div>

              <div className="md:col-span-2 space-y-4">
                {selectedDate ? (
                  <>
                    <EventDetailPanel
                      date={selectedDate}
                      events={selectedEvents}
                      onClose={() => setSelectedDate(null)}
                      onToggleComplete={handleToggleComplete}
                      onSaveNote={handleSaveNote}
                      onSaveAnswer={handleSaveAnswer}
                    />

                    {/* Add event button */}
                    {!showAddEvent ? (
                      <button
                        onClick={() => setShowAddEvent(true)}
                        className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add event for{" "}
                        {format(selectedDate, "d MMM")}
                      </button>
                    ) : (
                      <div className="card p-4 space-y-3">
                        <h4 className="font-semibold text-sm text-primary-700">
                          New Event
                        </h4>
                        <input
                          type="text"
                          placeholder="Event title"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="text-sm"
                        />
                        <textarea
                          rows={2}
                          placeholder="Description (optional)"
                          value={newDesc}
                          onChange={(e) => setNewDesc(e.target.value)}
                          className="text-sm"
                        />
                        <select
                          value={newType}
                          onChange={(e) => setNewType(e.target.value as CalendarEvent["type"])}
                          className="text-sm"
                        >
                          <option value="appointment">Appointment</option>
                          <option value="scan">Scan</option>
                          <option value="test">Test</option>
                          <option value="vaccine">Vaccine</option>
                          <option value="milestone">Milestone</option>
                          <option value="reminder">Reminder</option>
                          <option value="journal">Journal</option>
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddEvent}
                            className="btn-primary text-sm flex-1"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setShowAddEvent(false)}
                            className="btn-secondary text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="card p-6 text-center text-gray-400">
                    <Heart className="w-8 h-8 mx-auto mb-2 text-primary-200" />
                    <p className="text-sm">
                      Tap a date on the calendar to see details
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming events list */}
            <div className="card p-5">
              <h3 className="text-lg font-bold text-primary-700 mb-3">Upcoming</h3>
              <div className="space-y-2">
                {events
                  .filter((e) => !e.completed && e.date >= format(new Date(), "yyyy-MM-dd"))
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .slice(0, 5)
                  .map((evt) => (
                    <button
                      key={evt.eventId}
                      onClick={() => setSelectedDate(parseISO(evt.date))}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary-50 transition text-left"
                    >
                      <div className="text-center shrink-0">
                        <p className="text-xs text-primary-400 font-medium">
                          {format(parseISO(evt.date), "MMM")}
                        </p>
                        <p className="text-xl font-bold text-primary-600">
                          {format(parseISO(evt.date), "d")}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">
                          {evt.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {evt.description}
                        </p>
                      </div>
                    </button>
                  ))}
                {events.filter((e) => !e.completed && e.date >= format(new Date(), "yyyy-MM-dd")).length === 0 && (
                  <p className="text-sm text-gray-400 italic">All caught up!</p>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "checkin" && <DailyCheckIn onSave={handleCheckIn} />}

        {activeTab === "photos" && (
          <PhotoGallery photos={photos} onUpload={handlePhotoUpload} />
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-12 py-6 text-center text-xs text-gray-400">
        <p>Baby&apos;s Calendar — Made with <Heart className="inline w-3 h-3 text-primary-400" /> for expecting mothers</p>
        <p className="mt-1">Your data is stored securely. POPIA compliant.</p>
      </footer>
    </div>
  );
}
