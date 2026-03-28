"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Image as ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { PhotoRecord } from "@/lib/types";

interface Props {
  photos: PhotoRecord[];
  onUpload: (file: File, weekNumber: number, type: PhotoRecord["type"], caption: string) => void;
}

export default function PhotoGallery({ photos, onUpload }: Props) {
  const [showUpload, setShowUpload] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedLeft, setSelectedLeft] = useState<number>(0);
  const [selectedRight, setSelectedRight] = useState<number>(Math.min(1, photos.length - 1));
  const [caption, setCaption] = useState("");
  const [weekNum, setWeekNum] = useState(12);
  const [photoType, setPhotoType] = useState<PhotoRecord["type"]>("bump");
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = [...photos].sort((a, b) => a.weekNumber - b.weekNumber);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpload(file, weekNum, photoType, caption);
    setShowUpload(false);
    setCaption("");
  }

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-primary-700 flex items-center gap-2">
          <Camera className="w-5 h-5" /> Photo Gallery
        </h3>
        <div className="flex gap-2">
          {photos.length >= 2 && (
            <button
              onClick={() => setCompareMode(!compareMode)}
              className="btn-secondary !py-1.5 !px-3 text-xs"
            >
              {compareMode ? "Grid View" : "Compare"}
            </button>
          )}
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1"
          >
            <Upload className="w-3 h-3" /> Upload
          </button>
        </div>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="bg-primary-50 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-primary-600 block mb-1">Week</label>
              <input
                type="number"
                min={1}
                max={42}
                value={weekNum}
                onChange={(e) => setWeekNum(Number(e.target.value))}
                className="text-sm !p-2"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-primary-600 block mb-1">Type</label>
              <select
                value={photoType}
                onChange={(e) => setPhotoType(e.target.value as PhotoRecord["type"])}
                className="text-sm !p-2"
              >
                <option value="bump">Bump Photo</option>
                <option value="ultrasound">Ultrasound</option>
                <option value="test">Test Result</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-primary-600 block mb-1">Caption</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="E.g. 12-week scan — everything looks great!"
              className="text-sm !p-2"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-primary w-full text-sm"
          >
            Choose Photo or Take Picture
          </button>
        </div>
      )}

      {/* Compare mode */}
      {compareMode && sorted.length >= 2 ? (
        <div className="grid grid-cols-2 gap-3">
          {[selectedLeft, selectedRight].map((idx, side) => (
            <div key={side} className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const setter = side === 0 ? setSelectedLeft : setSelectedRight;
                    setter(Math.max(0, idx - 1));
                  }}
                  className="p-1"
                >
                  <ChevronLeft className="w-4 h-4 text-primary-400" />
                </button>
                <span className="text-xs font-medium text-primary-600">
                  Week {sorted[idx]?.weekNumber}
                </span>
                <button
                  onClick={() => {
                    const setter = side === 0 ? setSelectedLeft : setSelectedRight;
                    setter(Math.min(sorted.length - 1, idx + 1));
                  }}
                  className="p-1"
                >
                  <ChevronRight className="w-4 h-4 text-primary-400" />
                </button>
              </div>
              {sorted[idx]?.presignedUrl ? (
                <img
                  src={sorted[idx].presignedUrl}
                  alt={sorted[idx].caption ?? `Week ${sorted[idx].weekNumber}`}
                  className="rounded-xl w-full aspect-square object-cover"
                />
              ) : (
                <div className="rounded-xl w-full aspect-square bg-primary-50 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-primary-200" />
                </div>
              )}
              {sorted[idx]?.caption && (
                <p className="text-xs text-gray-500 text-center">{sorted[idx].caption}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Grid mode */
        <div className="grid grid-cols-3 gap-2">
          {sorted.length === 0 ? (
            <div className="col-span-3 py-12 flex flex-col items-center gap-2 text-gray-300">
              <Camera className="w-10 h-10" />
              <p className="text-sm">No photos yet. Capture your journey!</p>
            </div>
          ) : (
            sorted.map((photo) => (
              <div key={photo.photoId} className="relative group">
                {photo.presignedUrl ? (
                  <img
                    src={photo.presignedUrl}
                    alt={photo.caption ?? `Week ${photo.weekNumber}`}
                    className="rounded-xl w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="rounded-xl w-full aspect-square bg-primary-50 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-primary-200" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent rounded-b-xl p-2">
                  <p className="text-[10px] text-white font-medium">Wk {photo.weekNumber}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
