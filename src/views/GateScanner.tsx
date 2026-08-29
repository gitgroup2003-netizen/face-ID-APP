import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Loader2, RefreshCw, ScanFace, ShieldAlert, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { detectFace, findBestMatch, loadFaceModels } from '../lib/faceApi';
import { useCamera } from '../hooks/useCamera';
import { CameraPanel } from '../components/CameraPanel';
import { GuardianBadge } from '../components/GuardianBadge';
import type { Guardian, PickupLog } from '../types';

type ScanState =
  | { phase: 'idle' }
  | { phase: 'scanning' }
  | { phase: 'no-face' }
  | { phase: 'matched'; guardian: Guardian; confidence: number; distance: number }
  | { phase: 'unmatched'; distance: number | null };

export function GateScanner({ onBack }: { onBack: () => void }) {
  const camera = useCamera();
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [modelsReady, setModelsReady] = useState(false);
  const [scan, setScan] = useState<ScanState>({ phase: 'idle' });
  const [recent, setRecent] = useState<PickupLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refreshGuardians = () => api.listGuardians().then(setGuardians).catch(() => setError('Could not load the guardian gallery.'));
  const refreshLogs = () => api.listPickupLogs(8).then(setRecent).catch(() => {});

  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsReady(true))
      .catch(() => setError('Could not load the face-recognition models. Refresh and try again.'));
    refreshGuardians();
    refreshLogs();
  }, []);

  const runScan = async () => {
    const frame = camera.captureFrame();
    if (!frame) return;
    setScan({ phase: 'scanning' });
    const detected = await detectFace(frame.canvas);

    if (!detected) {
      setScan({ phase: 'no-face' });
      return;
    }

    const best = findBestMatch(
      detected.descriptor,
      guardians.map((g) => ({ guardianId: g.id, childId: g.childId, descriptor: g.descriptor }))
    );

    if (best && best.isMatch) {
      const guardian = guardians.find((g) => g.id === best.guardianId)!;
      setScan({ phase: 'matched', guardian, confidence: best.confidence, distance: best.distance });
      await api.createPickupLog({
        childId: guardian.childId,
        guardianId: guardian.id,
        matched: true,
        confidence: best.confidence,
        snapshotDataUrl: frame.dataUrl,
      });
    } else {
      setScan({ phase: 'unmatched', distance: best?.distance ?? null });
      await api.createPickupLog({
        matched: false,
        confidence: best?.confidence ?? null,
        snapshotDataUrl: frame.dataUrl,
        note: 'No enrolled guardian matched the captured face.',
      });
    }
    refreshLogs();
  };

  const reset = () => {
    setScan({ phase: 'idle' });
    camera.stop();
  };

  const frameTone = scan.phase === 'matched' ? 'verified' : scan.phase === 'unmatched' ? 'alert' : 'idle';

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="border-b border-paper/10 bg-ink-soft/60 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="rounded-lg p-2 text-paper/60 transition hover:bg-paper/10 hover:text-paper">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="font-display text-xl font-semibold leading-none">GIT GROUP</p>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-slate">Gate Scanner — Security Checkpoint</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-paper/15 px-3 py-1.5 font-mono text-[11px] text-slate sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            {guardians.length} guardian{guardians.length === 1 ? '' : 's'} in gallery
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto mt-4 max-w-5xl px-6">
          <div className="rounded-lg border border-alert/40 bg-alert-soft px-4 py-2 text-sm text-alert">{error}</div>
        </div>
      )}

      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[1fr_320px]">
        <div>
          <CameraPanel
            videoRef={camera.videoRef}
            isActive={camera.isActive}
            error={camera.error}
            onStart={camera.start}
            onStop={camera.stop}
            onCapture={runScan}
            busy={scan.phase === 'scanning'}
            captureLabel="Scan arrival"
            frameTone={frameTone}
          />
          {!modelsReady && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading face-recognition model…
            </p>
          )}
          {camera.isActive && modelsReady && scan.phase === 'idle' && (
            <p className="mt-3 text-xs text-slate">Frame the visitor's face in the camera, then press "Scan arrival".</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <AnimatePresence mode="wait">
            {scan.phase === 'idle' && (
              <motion.div key="idle" exit={{ opacity: 0 }} className="flex h-48 flex-col items-center justify-center gap-2 text-center text-slate">
                <ScanFace className="h-8 w-8" />
                <p className="text-sm">Awaiting scan</p>
              </motion.div>
            )}

            {scan.phase === 'no-face' && (
              <motion.div
                key="no-face"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex h-48 flex-col items-center justify-center gap-3 text-center"
              >
                <ShieldAlert className="h-8 w-8 text-alert" />
                <p className="text-sm text-paper/80">No face was detected in that frame. Ask the visitor to step closer and face the camera.</p>
                <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate underline">
                  <RefreshCw className="h-3.5 w-3.5" /> Try again
                </button>
              </motion.div>
            )}

            {scan.phase === 'matched' && (
              <motion.div key="matched" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                <GuardianBadge
                  photoUrl={scan.guardian.photoUrl}
                  name={scan.guardian.name}
                  relationship={scan.guardian.relationship}
                  childLabel={scan.guardian.childName}
                  meta={`Match confidence ${Math.round(scan.confidence * 100)}%`}
                  verdict={{ label: 'VERIFIED', tone: 'verified' }}
                />
                <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate underline">
                  <RefreshCw className="h-3.5 w-3.5" /> Scan next arrival
                </button>
              </motion.div>
            )}

            {scan.phase === 'unmatched' && (
              <motion.div key="unmatched" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 text-center">
                <div className="w-full max-w-xs rounded-2xl border-2 border-alert bg-alert-soft p-6 text-alert">
                  <ShieldAlert className="mx-auto mb-2 h-8 w-8" />
                  <p className="stamp mx-auto w-fit text-sm font-semibold">NOT ON FILE</p>
                  <p className="mt-3 text-sm">This person does not match any authorized guardian. Do not release the child — verify identity manually.</p>
                </div>
                <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate underline">
                  <RefreshCw className="h-3.5 w-3.5" /> Scan next arrival
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-slate">Recent activity</p>
            <ul className="space-y-1.5">
              {recent.length === 0 && <li className="text-xs text-slate">No scans yet today.</li>}
              {recent.map((log) => (
                <li key={log.id} className="flex items-center justify-between rounded-lg border border-paper/10 px-3 py-2 text-xs">
                  <span className={log.matched ? 'text-verified' : 'text-alert'}>
                    {log.matched ? `${log.guardianName} → ${log.childName}` : 'Unmatched visitor'}
                  </span>
                  <span className="font-mono text-slate">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
