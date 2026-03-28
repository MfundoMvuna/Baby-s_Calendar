"use client";

import { TRIMESTERS, BABY_SIZE_COMPARISONS, getTrimester } from "@/lib/clinical-timeline";
import { pregnancyProgress } from "@/lib/utils";

interface Props {
  lmpDate: string;
  currentWeek: number;
  eddDate: string;
  babyNickname?: string;
}

export default function TrimesterProgress({ lmpDate, currentWeek, eddDate, babyNickname }: Props) {
  const progress = pregnancyProgress(lmpDate);
  const trimester = getTrimester(currentWeek);
  const triInfo = TRIMESTERS[trimester];
  const sizeInfo = BABY_SIZE_COMPARISONS[currentWeek];
  const babyName = babyNickname || "Baby";

  const bgGradient =
    trimester === "first"
      ? "from-purple-100 to-purple-50"
      : trimester === "second"
        ? "from-primary-100 to-primary-50"
        : "from-sage-100 to-sage-50";

  return (
    <div className={`card p-5 bg-gradient-to-br ${bgGradient}`}>
      {/* Week & Trimester */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-2xl font-bold text-primary-700">Week {currentWeek}</h3>
          <p className="text-sm text-purple-500 font-medium">{triInfo.label}</p>
        </div>
        {sizeInfo && (
          <div className="text-right">
            <p className="text-3xl">{sizeInfo.fruit.split(" ")[0]}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {babyName} is the size of a {sizeInfo.fruit.split(" ").slice(1).join(" ")}
            </p>
            <p className="text-[10px] text-gray-400">{sizeInfo.size}</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>0 w</span>
          <span>13 w</span>
          <span>26 w</span>
          <span>40 w</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-1 text-right">
          {Math.round(progress)}% — Due {eddDate}
        </p>
      </div>

      {/* Trimester markers */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {(["first", "second", "third"] as const).map((t) => {
          const info = TRIMESTERS[t];
          const active = t === trimester;
          return (
            <div
              key={t}
              className={`text-center p-2 rounded-lg text-xs font-medium transition-all ${
                active
                  ? "bg-white shadow-sm ring-2 ring-primary-300 text-primary-700"
                  : "bg-white/50 text-gray-400"
              }`}
            >
              <p className="font-bold">{info.label.replace(" Trimester", "")}</p>
              <p className="text-[10px]">Weeks {info.start}–{info.end}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
