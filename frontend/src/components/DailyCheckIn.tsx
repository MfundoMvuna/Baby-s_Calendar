"use client";

import { useState } from "react";
import { Smile, Meh, Frown, Angry, Heart } from "lucide-react";
import type { SymptomEntry } from "@/lib/types";
import { format } from "date-fns";

interface Props {
  onSave: (entry: Omit<SymptomEntry, "entryId" | "userId">) => void;
}

const MOOD_OPTIONS: { value: SymptomEntry["mood"]; icon: React.ReactNode; label: string }[] = [
  { value: 5, icon: <Heart className="w-6 h-6" />, label: "Great" },
  { value: 4, icon: <Smile className="w-6 h-6" />, label: "Good" },
  { value: 3, icon: <Meh className="w-6 h-6" />, label: "Okay" },
  { value: 2, icon: <Frown className="w-6 h-6" />, label: "Low" },
  { value: 1, icon: <Angry className="w-6 h-6" />, label: "Tough" },
];

const SYMPTOM_OPTIONS = [
  "Nausea", "Fatigue", "Headache", "Back pain", "Swollen feet",
  "Heartburn", "Insomnia", "Mood swings", "Food cravings",
  "Breast tenderness", "Shortness of breath", "Braxton Hicks",
  "Round ligament pain", "Frequent urination",
];

export default function DailyCheckIn({ onSave }: Props) {
  const [mood, setMood] = useState<SymptomEntry["mood"]>(3);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [weight, setWeight] = useState("");
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  function toggleSymptom(s: string) {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function handleSave() {
    onSave({
      date: format(new Date(), "yyyy-MM-dd"),
      mood,
      symptoms,
      weight: weight ? Number(weight) : undefined,
      bloodPressureSystolic: bpSystolic ? Number(bpSystolic) : undefined,
      bloodPressureDiastolic: bpDiastolic ? Number(bpDiastolic) : undefined,
      notes: notes || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="card p-5 space-y-5">
      <h3 className="text-lg font-bold text-primary-700">
        How are you feeling today?
      </h3>

      {/* Mood */}
      <div>
        <p className="text-sm text-gray-500 mb-2">Your mood</p>
        <div className="flex gap-2 justify-center">
          {MOOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMood(opt.value)}
              className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                mood === opt.value
                  ? "bg-primary-100 ring-2 ring-primary-400 text-primary-600"
                  : "bg-gray-50 text-gray-400 hover:bg-primary-50"
              }`}
            >
              {opt.icon}
              <span className="text-[10px] mt-1 font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Symptoms */}
      <div>
        <p className="text-sm text-gray-500 mb-2">Any symptoms?</p>
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => toggleSymptom(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                symptoms.includes(s)
                  ? "bg-primary-500 text-white border-primary-500"
                  : "border-primary-200 text-gray-500 hover:border-primary-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Vitals (optional) */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Weight (kg)</label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="—"
            className="text-sm !p-2 text-center"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">BP systolic</label>
          <input
            type="number"
            value={bpSystolic}
            onChange={(e) => setBpSystolic(e.target.value)}
            placeholder="—"
            className="text-sm !p-2 text-center"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">BP diastolic</label>
          <input
            type="number"
            value={bpDiastolic}
            onChange={(e) => setBpDiastolic(e.target.value)}
            placeholder="—"
            className="text-sm !p-2 text-center"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Tell me more…</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How was your day? Any concerns?"
          className="text-sm"
        />
      </div>

      <button onClick={handleSave} className="btn-primary w-full text-sm">
        {saved ? "✓ Saved!" : "Save check-in"}
      </button>
    </div>
  );
}
