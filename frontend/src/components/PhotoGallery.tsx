"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, Image as ImageIcon, X, ChevronLeft, ChevronRight, Video, Aperture } from "lucide-react";
import type { PhotoRecord } from "@/lib/types";

interface Props {
  photos: PhotoRecord[];
  onUpload: (file: File, weekNumber: number, type: PhotoRecord["type"], caption: string) => void;
}

// ── Simple in-memory + localStorage image cache ──
const imageCache = new Map<string, string>();

function getCachedUrl(photo: PhotoRecord): string | undefined {
  if (!photo.presignedUrl) return undefined;
  const cacheKey = photo.s3Key || photo.photoId;
  const cached = imageCache.get(cacheKey);
  if (cached) return cached;

  // Check localStorage cache
  try {
    const lsCached = localStorage.getItem(`photo_cache_${cacheKey}`);
    if (lsCached) {
      imageCache.set(cacheKey, lsCached);
      return lsCached;
    }
  } catch { /* quota exceeded — fine, use URL */ }

  return photo.presignedUrl;
}

function cacheImage(photo: PhotoRecord, dataUrl: string) {
  const cacheKey = photo.s3Key || photo.photoId;
  imageCache.set(cacheKey, dataUrl);
  try {
    localStorage.setItem(`photo_cache_${cacheKey}`, dataUrl);
  } catch { /* quota exceeded — memory cache only */ }
}

/** Load an image and cache it as a data URL */
function useCachedImage(photo: PhotoRecord | undefined) {
  const [src, setSrc] = useState<string | undefined>(() =>
    photo ? getCachedUrl(photo) : undefined
  );

  useEffect(() => {
    if (!photo?.presignedUrl) { setSrc(undefined); return; }
    const cached = getCachedUrl(photo);
    setSrc(cached);

    // If it's a remote S3 URL (not data URL), fetch and cache
    if (cached && cached.startsWith("http")) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          cacheImage(photo, dataUrl);
          setSrc(dataUrl);
        } catch { /* CORS or canvas issue — keep original URL */ }
      };
      img.src = cached;
    }
  }, [photo?.photoId, photo?.presignedUrl]);

  return src;
}

export default function PhotoGallery({ photos, onUpload }: Props) {
  const [showUpload, setShowUpload] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedLeft, setSelectedLeft] = useState<number>(0);
  const [selectedRight, setSelectedRight] = useState<number>(Math.min(1, photos.length - 1));
  const [caption, setCaption] = useState("");
  const [weekNum, setWeekNum] = useState(12);
  const [photoType, setPhotoType] = useState<PhotoRecord["type"]>("bump");
  const [viewPhoto, setViewPhoto] = useState<PhotoRecord | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const sorted = [...photos].sort((a, b) => a.weekNumber - b.weekNumber);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpload(file, weekNum, photoType, caption);
    setShowUpload(false);
    setCaption("");
    if (e.target) e.target.value = "";
  }

  // ── Camera capture using getUserMedia ──
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      setStream(mediaStream);
      setShowCamera(true);
      setCameraReady(false);
      // Wire up the video element after state update
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => setCameraReady(true);
        }
      }, 100);
    } catch {
      // Fallback: use native camera input (mobile)
      cameraRef.current?.click();
    }
  }, []);

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      onUpload(file, weekNum, photoType, caption);
      stopCamera();
      setShowUpload(false);
      setCaption("");
    }, "image/jpeg", 0.9);
  }

  function stopCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setShowCamera(false);
    setCameraReady(false);
  }

  // Clean up camera on unmount
  useEffect(() => {
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, [stream]);

  // Lightbox image
  const lightboxSrc = useCachedImage(viewPhoto ?? undefined);

  return (
    <div className="card p-5">
      {/* ── Lightbox / Photo Viewer ── */}
      {viewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setViewPhoto(null)}>
          <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setViewPhoto(null)} className="absolute -top-2 -right-2 z-10 bg-white/90 rounded-full p-1.5 shadow-lg hover:bg-white">
              <X className="w-5 h-5 text-gray-600" />
            </button>
            {lightboxSrc ? (
              <img
                src={lightboxSrc}
                alt={viewPhoto.caption ?? `Week ${viewPhoto.weekNumber}`}
                className="rounded-2xl max-h-[75vh] w-auto object-contain"
              />
            ) : (
              <div className="rounded-2xl w-full aspect-square bg-gray-800 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-gray-500" />
              </div>
            )}
            <div className="mt-3 text-center">
              <p className="text-white font-medium text-sm">
                Week {viewPhoto.weekNumber} — {viewPhoto.type}
              </p>
              {viewPhoto.caption && (
                <p className="text-gray-300 text-xs mt-1">{viewPhoto.caption}</p>
              )}
              <p className="text-gray-500 text-[10px] mt-1">{viewPhoto.date}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Camera viewfinder ── */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-[75vh] object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex items-center gap-6 mt-4">
            <button onClick={stopCamera} className="bg-white/20 text-white rounded-full p-3 hover:bg-white/30">
              <X className="w-6 h-6" />
            </button>
            <button
              onClick={capturePhoto}
              disabled={!cameraReady}
              className="bg-white rounded-full p-4 hover:bg-gray-100 disabled:opacity-40 transition-all"
            >
              <Aperture className="w-8 h-8 text-primary-600" />
            </button>
          </div>
          {!cameraReady && <p className="text-white/60 text-xs mt-3">Starting camera...</p>}
        </div>
      )}

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
            <Upload className="w-3 h-3" /> Add Photo
          </button>
        </div>
      </div>

      {/* Upload & Capture form */}
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
          {/* Hidden file inputs */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {/* Native camera input (fallback for mobile) */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => startCamera()}
              className="btn-primary text-sm flex items-center justify-center gap-2"
            >
              <Aperture className="w-4 h-4" /> Take Photo
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-secondary text-sm flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" /> Choose File
            </button>
          </div>
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
              <PhotoThumbnail photo={sorted[idx]} onClick={() => sorted[idx] && setViewPhoto(sorted[idx])} />
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
              <button
                key={photo.photoId}
                onClick={() => setViewPhoto(photo)}
                className="relative group text-left"
              >
                <PhotoThumbnail photo={photo} />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent rounded-b-xl p-2">
                  <p className="text-[10px] text-white font-medium">Wk {photo.weekNumber}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Cached thumbnail component */
function PhotoThumbnail({ photo, onClick }: { photo: PhotoRecord | undefined; onClick?: () => void }) {
  const src = useCachedImage(photo);

  if (!photo) return null;

  return src ? (
    <img
      src={src}
      alt={photo.caption ?? `Week ${photo.weekNumber}`}
      className="rounded-xl w-full aspect-square object-cover cursor-pointer hover:ring-2 hover:ring-primary-400 transition-all"
      onClick={onClick}
    />
  ) : (
    <div
      className="rounded-xl w-full aspect-square bg-primary-50 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary-400 transition-all"
      onClick={onClick}
    >
      <ImageIcon className="w-6 h-6 text-primary-200" />
    </div>
  );
}
