"use client";

import { useState } from "react";
import { Heart, ArrowRight, Baby, Calendar, Stethoscope } from "lucide-react";
import type { OnboardingData } from "@/lib/types";

interface Props {
  onComplete: (data: OnboardingData) => void;
}

const RISK_OPTIONS = [
  "High blood pressure",
  "Diabetes (pre-existing)",
  "Previous C-section",
  "Multiple pregnancies (twins+)",
  "Previous miscarriage",
  "Thyroid condition",
  "HIV positive",
  "Rh-negative blood type",
  "None of the above",
];

export default function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    displayName: "",
    lmpDate: "",
    hasSeenDoctor: false,
    riskFactors: [],
  });

  const update = (patch: Partial<OnboardingData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const canAdvance = (): boolean => {
    switch (step) {
      case 0:
        return data.displayName.trim().length > 0;
      case 1:
        return data.lmpDate.length > 0;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const steps = [
    // Step 0 – Welcome & Name
    <div key="welcome" className="space-y-6 text-center">
      <div className="inline-flex p-4 rounded-full bg-primary-100 mx-auto">
        <Heart className="w-10 h-10 text-primary-500" />
      </div>
      <h1 className="text-3xl font-bold text-primary-700">
        Welcome to Baby&apos;s Calendar
      </h1>
      <p className="text-gray-500 max-w-sm mx-auto">
        We&apos;re here to support you through every beautiful week of your pregnancy.
        Let&apos;s get started with a few gentle questions.
      </p>
      <div className="max-w-xs mx-auto">
        <label className="text-sm font-medium text-primary-600 block mb-2 text-left">
          What should we call you?
        </label>
        <input
          type="text"
          value={data.displayName}
          onChange={(e) => update({ displayName: e.target.value })}
          placeholder="Your first name"
          className="text-center"
          autoFocus
        />
      </div>
    </div>,

    // Step 1 – Dates
    <div key="dates" className="space-y-6">
      <div className="text-center">
        <div className="inline-flex p-4 rounded-full bg-purple-100 mx-auto">
          <Calendar className="w-10 h-10 text-purple-500" />
        </div>
        <h2 className="text-2xl font-bold text-primary-700 mt-3">
          Your pregnancy dates
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          This helps us build your personalised timeline.
        </p>
      </div>

      <div className="max-w-xs mx-auto space-y-4">
        <div>
          <label className="text-sm font-medium text-primary-600 block mb-2">
            When was the first day of your last period?
          </label>
          <input
            type="date"
            value={data.lmpDate}
            onChange={(e) => update({ lmpDate: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-primary-600 block mb-2">
            Or, how many weeks pregnant are you?
          </label>
          <input
            type="number"
            min={1}
            max={42}
            value={data.weeksPregnant ?? ""}
            onChange={(e) =>
              update({ weeksPregnant: e.target.value ? Number(e.target.value) : undefined })
            }
            placeholder="E.g. 12"
          />
          <p className="text-xs text-gray-400 mt-1">
            Skip this if you entered the date above.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-primary-600 block mb-2">
            Baby&apos;s nickname (optional)
          </label>
          <input
            type="text"
            value={data.babyNickname ?? ""}
            onChange={(e) => update({ babyNickname: e.target.value })}
            placeholder="E.g. Peanut, Sprout…"
          />
        </div>
      </div>
    </div>,

    // Step 2 – Doctor
    <div key="doctor" className="space-y-6">
      <div className="text-center">
        <div className="inline-flex p-4 rounded-full bg-sage-100 mx-auto">
          <Stethoscope className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-primary-700 mt-3">
          Your healthcare provider
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          So we can help you prepare for appointments.
        </p>
      </div>

      <div className="max-w-xs mx-auto space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.hasSeenDoctor}
            onChange={(e) => update({ hasSeenDoctor: e.target.checked })}
          />
          <span className="text-sm text-gray-700">
            I&apos;ve already seen a doctor or midwife
          </span>
        </label>

        {data.hasSeenDoctor && (
          <>
            <div>
              <label className="text-sm font-medium text-primary-600 block mb-2">
                Doctor / Midwife name
              </label>
              <input
                type="text"
                value={data.doctorName ?? ""}
                onChange={(e) => update({ doctorName: e.target.value })}
                placeholder="Dr. Surname"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-primary-600 block mb-2">
                Hospital or clinic
              </label>
              <input
                type="text"
                value={data.hospitalClinic ?? ""}
                onChange={(e) => update({ hospitalClinic: e.target.value })}
                placeholder="Name of hospital / clinic"
              />
            </div>
          </>
        )}

        <div>
          <label className="text-sm font-medium text-primary-600 block mb-2">
            Anything else you&apos;d like to share? (optional)
          </label>
          <textarea
            rows={3}
            value={data.extraNotes ?? ""}
            onChange={(e) => update({ extraNotes: e.target.value })}
            placeholder="Tell me more…"
          />
        </div>
      </div>
    </div>,

    // Step 3 – Risk factors
    <div key="risks" className="space-y-6">
      <div className="text-center">
        <div className="inline-flex p-4 rounded-full bg-primary-100 mx-auto">
          <Baby className="w-10 h-10 text-primary-500" />
        </div>
        <h2 className="text-2xl font-bold text-primary-700 mt-3">
          Medical background
        </h2>
        <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
          This is optional, but helps us tailor reminders. 
          Your data stays private and secure.
        </p>
      </div>

      <div className="max-w-xs mx-auto space-y-2">
        {RISK_OPTIONS.map((option) => {
          const isNone = option === "None of the above";
          const checked = isNone
            ? data.riskFactors.length === 0
            : data.riskFactors.includes(option);

          return (
            <label
              key={option}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                checked
                  ? "border-primary-400 bg-primary-50"
                  : "border-primary-100 hover:border-primary-200"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  if (isNone) {
                    update({ riskFactors: [] });
                  } else {
                    const next = checked
                      ? data.riskFactors.filter((r) => r !== option)
                      : [...data.riskFactors, option];
                    update({ riskFactors: next });
                  }
                }}
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          );
        })}
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-lg w-full p-8">
        {/* Step indicators */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-8 bg-primary-500"
                  : i < step
                    ? "w-4 bg-primary-300"
                    : "w-4 bg-primary-100"
              }`}
            />
          ))}
        </div>

        {/* Current step */}
        {steps[step]}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="btn-secondary text-sm"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onComplete(data)}
              className="btn-primary text-sm flex items-center gap-2"
            >
              Start my journey <Heart className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
