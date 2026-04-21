"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2 } from "lucide-react";
import MouthGuide, { type StabilityZone } from "./MouthGuide";
import { useStabilityTracker } from "@/hooks/useStabilityTracker";

const VIEWS = [
  { label: "Front View", instruction: "Smile and look straight at the camera." },
  { label: "Left View", instruction: "Turn your head to the left." },
  { label: "Right View", instruction: "Turn your head to the right." },
  { label: "Upper Teeth", instruction: "Tilt your head back and open wide." },
  { label: "Lower Teeth", instruction: "Tilt your head down and open wide." },
];

const ZONE_MESSAGES: Record<StabilityZone, string> = {
  low: "Hold steady — align your mouth inside the circle",
  medium: "Almost there — keep steady",
  high: "Perfect — tap to capture",
};

export default function ScanningFlow() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camReady, setCamReady] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [zone, setZone] = useState<StabilityZone>("low");
  const [uploading, setUploading] = useState(false);

  const stabilityRef = useStabilityTracker();

  // Initialise camera and clean up the MediaStream on unmount so the tab
  // doesn't keep the camera LED on after the user navigates away.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCamReady(true);
        }
      } catch (err) {
        console.error("Camera access denied", err);
      }
    })();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setCapturedImages((prev) => [...prev, dataUrl]);
    setCurrentStep((prev) => prev + 1);
  }, []);

  // Once all views are captured, submit the scan. `/api/scan` persists the
  // Scan row and triggers the notification asynchronously, then returns the
  // scanId we use to hand the user off to the results dashboard.
  useEffect(() => {
    if (capturedImages.length !== VIEWS.length) return;
    let cancelled = false;

    (async () => {
      setUploading(true);
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageCount: capturedImages.length }),
        });
        if (!res.ok) throw new Error(`Scan upload failed (${res.status})`);
        const { scanId } = await res.json();
        if (!cancelled) router.push(`/results?scanId=${scanId}`);
      } catch (err) {
        console.error("Scan submission error", err);
        if (!cancelled) setUploading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [capturedImages.length, router]);

  const canCapture = camReady && zone === "high";

  return (
    <div className="flex flex-col items-center bg-black min-h-screen text-white">
      <div className="p-4 w-full bg-zinc-900 border-b border-zinc-800 flex justify-between">
        <h1 className="font-bold text-blue-400">DentalScan AI</h1>
        <span className="text-xs text-zinc-500">
          Step {Math.min(currentStep + 1, VIEWS.length)}/{VIEWS.length}
        </span>
      </div>

      <div className="relative w-full max-w-md aspect-[3/4] bg-zinc-950 overflow-hidden flex items-center justify-center">
        {currentStep < VIEWS.length ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            <MouthGuide stabilityRef={stabilityRef} onZoneChange={setZone} />

            <div className="absolute top-4 left-0 right-0 flex justify-center">
              <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur text-xs font-medium">
                {camReady ? ZONE_MESSAGES[zone] : "Waking up camera…"}
              </div>
            </div>

            <div className="absolute bottom-10 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent text-center">
              <p className="text-sm font-medium">{VIEWS[currentStep].instruction}</p>
            </div>
          </>
        ) : (
          <div className="text-center p-10">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold">Scan Complete</h2>
            <p className="text-zinc-400 mt-2">
              {uploading ? "Uploading results…" : "Redirecting…"}
            </p>
          </div>
        )}
      </div>

      <div className="p-10 w-full flex justify-center">
        {currentStep < VIEWS.length && (
          <button
            onClick={handleCapture}
            disabled={!canCapture}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Capture"
          >
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <Camera className="text-black" />
            </div>
          </button>
        )}
      </div>

      <div className="flex gap-2 p-4 overflow-x-auto w-full">
        {VIEWS.map((v, i) => (
          <div
            key={v.label}
            className={`w-16 h-20 rounded border-2 shrink-0 ${
              i === currentStep ? "border-blue-500 bg-blue-500/10" : "border-zinc-800"
            }`}
          >
            {capturedImages[i] ? (
              <img
                src={capturedImages[i]}
                alt={v.label}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-700">
                {i + 1}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
