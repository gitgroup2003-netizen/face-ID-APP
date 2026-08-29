import { AlertCircle, Camera, CameraOff, RefreshCw } from 'lucide-react';
import type { RefObject } from 'react';

interface CameraPanelProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  onCapture: () => void;
  busy?: boolean;
  captureLabel?: string;
  frameTone?: 'idle' | 'verified' | 'alert';
}

const frameToneClass: Record<NonNullable<CameraPanelProps['frameTone']>, string> = {
  idle: 'border-amber/40',
  verified: 'border-verified shadow-[0_0_0_6px_rgba(47,123,79,0.15)]',
  alert: 'border-alert shadow-[0_0_0_6px_rgba(194,59,51,0.15)]',
};

export function CameraPanel({
  videoRef,
  isActive,
  error,
  onStart,
  onStop,
  onCapture,
  busy,
  captureLabel = 'Capture',
  frameTone = 'idle',
}: CameraPanelProps) {
  return (
    <div className="w-full">
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-4 bg-ink-soft transition-colors duration-300 ${frameToneClass[frameTone]}`}
      >
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-soft/95 text-paper/70">
            <CameraOff className="h-8 w-8" />
            <p className="font-mono text-xs uppercase tracking-wide">Camera off</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-alert/40 bg-alert-soft px-3 py-2 text-sm text-alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mt-4 flex gap-3">
        {!isActive ? (
          <button
            onClick={onStart}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber px-4 py-3 font-semibold text-ink transition hover:bg-amber-soft"
          >
            <Camera className="h-4 w-4" /> Start camera
          </button>
        ) : (
          <>
            <button
              onClick={onCapture}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber px-4 py-3 font-semibold text-ink transition hover:bg-amber-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {captureLabel}
            </button>
            <button
              onClick={onStop}
              className="rounded-xl border border-paper/20 px-4 py-3 font-semibold text-paper/70 transition hover:bg-paper/5"
            >
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}
