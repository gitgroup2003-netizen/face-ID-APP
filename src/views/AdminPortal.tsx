import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Loader2,
  Plus,
  ScanFace,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';
import { detectFace, loadFaceModels } from '../lib/faceApi';
import { GuardianBadge } from '../components/GuardianBadge';
import { CameraPanel } from '../components/CameraPanel';
import { useCamera } from '../hooks/useCamera';
import type { Child, ChildWithGuardians } from '../types';

export function AdminPortal({ onBack }: { onBack: () => void }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ChildWithGuardians | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsReady(true))
      .catch(() => setError('Could not load the face-recognition models. Refresh and try again.'));
  }, []);

  const refreshChildren = async () => {
    setLoadingChildren(true);
    try {
      const rows = await api.listChildren();
      setChildren(rows);
      if (rows.length && selectedId === null) setSelectedId(rows[0].id);
    } catch {
      setError('Could not load the roster.');
    } finally {
      setLoadingChildren(false);
    }
  };

  useEffect(() => {
    refreshChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    api
      .getChild(selectedId)
      .then(setDetail)
      .catch(() => setError('Could not load that child.'))
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  const refreshDetail = async () => {
    if (selectedId === null) return;
    const d = await api.getChild(selectedId);
    setDetail(d);
    setChildren((prev) => prev.map((c) => (c.id === d.id ? { ...c, guardianCount: d.guardians.length } : c)));
  };

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="border-b border-paper/10 bg-ink-soft/60 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="rounded-lg p-2 text-paper/60 transition hover:bg-paper/10 hover:text-paper">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="font-display text-xl font-semibold leading-none">GIT GROUP</p>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-slate">Admin Portal — Roster &amp; Guardians</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-paper/15 px-3 py-1.5 font-mono text-[11px] text-slate sm:flex">
            <ScanFace className="h-3.5 w-3.5" />
            {modelsReady ? 'Face model ready' : 'Loading face model…'}
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto mt-4 max-w-6xl px-6">
          <div className="rounded-lg border border-alert/40 bg-alert-soft px-4 py-2 text-sm text-alert">{error}</div>
        </div>
      )}

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[280px_1fr]">
        <RosterPanel
          children={children}
          loading={loadingChildren}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreated={refreshChildren}
        />

        <section>
          {loadingDetail && (
            <div className="flex h-40 items-center justify-center text-slate">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!loadingDetail && !detail && (
            <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-paper/15 text-slate">
              <UserRound className="h-6 w-6" />
              <p className="text-sm">Add a child to the roster to get started.</p>
            </div>
          )}
          {!loadingDetail && detail && (
            <ChildDetailPanel
              detail={detail}
              modelsReady={modelsReady}
              onGuardianAdded={refreshDetail}
              onChildDeleted={async () => {
                await api.deleteChild(detail.id);
                setSelectedId(null);
                refreshChildren();
              }}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function RosterPanel({
  children,
  loading,
  selectedId,
  onSelect,
  onCreated,
}: {
  children: Child[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const child = await api.createChild({ name: name.trim(), grade: grade.trim() || undefined });
      setName('');
      setGrade('');
      await onCreated();
      onSelect(child.id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="rounded-2xl border border-paper/10 bg-ink-soft/40 p-4">
      <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-slate">
        <Users className="h-3.5 w-3.5" /> Roster
      </h2>

      <form onSubmit={submit} className="mt-3 space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Child's full name"
          className="w-full rounded-lg border border-paper/15 bg-ink px-3 py-2 text-sm text-paper placeholder:text-slate focus:border-amber focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="Class / grade (optional)"
            className="w-full rounded-lg border border-paper/15 bg-ink px-3 py-2 text-sm text-paper placeholder:text-slate focus:border-amber focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-amber px-3 py-2 text-sm font-semibold text-ink transition hover:bg-amber-soft disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </form>

      <div className="mt-4 space-y-1">
        {loading && <p className="text-sm text-slate">Loading…</p>}
        {!loading && children.length === 0 && <p className="text-sm text-slate">No children yet.</p>}
        {children.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
              selectedId === c.id ? 'bg-amber text-ink font-semibold' : 'text-paper/80 hover:bg-paper/5'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate">{c.name}</span>
              <span className={`font-mono text-[10px] ${selectedId === c.id ? 'text-ink/70' : 'text-slate'}`}>
                {c.guardianCount ?? 0}
              </span>
            </div>
            {c.grade && <span className={`text-xs ${selectedId === c.id ? 'text-ink/70' : 'text-slate'}`}>{c.grade}</span>}
          </button>
        ))}
      </div>
    </aside>
  );
}

function ChildDetailPanel({
  detail,
  modelsReady,
  onGuardianAdded,
  onChildDeleted,
}: {
  detail: ChildWithGuardians;
  modelsReady: boolean;
  onGuardianAdded: () => Promise<void>;
  onChildDeleted: () => void;
}) {
  const [showForm, setShowForm] = useState(detail.guardians.length === 0);

  useEffect(() => {
    setShowForm(detail.guardians.length === 0);
  }, [detail.id, detail.guardians.length]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">{detail.name}</h2>
          {detail.grade && <p className="text-sm text-slate">{detail.grade}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-amber px-3 py-2 text-sm font-semibold text-ink transition hover:bg-amber-soft"
          >
            <Plus className="h-4 w-4" /> {showForm ? 'Close form' : 'Add guardian'}
          </button>
          <button
            onClick={() => {
              if (confirm(`Remove ${detail.name} and all their guardians?`)) onChildDeleted();
            }}
            className="rounded-lg border border-alert/40 p-2 text-alert transition hover:bg-alert-soft"
            title="Remove child"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mt-5">
          <AddGuardianForm childId={detail.id} modelsReady={modelsReady} onAdded={onGuardianAdded} />
        </div>
      )}

      <div className="mt-6">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-slate">
          Authorized pickup guardians ({detail.guardians.length})
        </p>
        {detail.guardians.length === 0 ? (
          <p className="text-sm text-slate">No guardians on file yet — anyone arriving for {detail.name} will show as "not on file" at the gate.</p>
        ) : (
          <div className="flex flex-wrap gap-5">
            {detail.guardians.map((g) => (
              <GuardianBadge
                key={g.id}
                photoUrl={g.photoUrl}
                name={g.name}
                relationship={g.relationship}
                meta={`On file since ${new Date(g.createdAt).toLocaleDateString()}`}
                verdict={{ label: 'ON FILE', tone: 'verified' }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type PendingPhoto = { dataUrl: string; descriptor: number[] | null; status: 'detecting' | 'ok' | 'no-face' };

function AddGuardianForm({
  childId,
  modelsReady,
  onAdded,
}: {
  childId: number;
  modelsReady: boolean;
  onAdded: () => Promise<void>;
}) {
  const camera = useCamera();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [pending, setPending] = useState<PendingPhoto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const analyzeCanvas = async (dataUrl: string, source: HTMLCanvasElement | HTMLImageElement) => {
    setPending({ dataUrl, descriptor: null, status: 'detecting' });
    const result = await detectFace(source);
    setPending({ dataUrl, descriptor: result?.descriptor ?? null, status: result ? 'ok' : 'no-face' });
  };

  const handleCapture = async () => {
    const frame = camera.captureFrame();
    if (!frame) return;
    await analyzeCanvas(frame.dataUrl, frame.canvas);
    camera.stop();
  };

  const handleFile = async (file: File) => {
    setFormError(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode().catch(() => setFormError('Could not read that image file.'));
    await analyzeCanvas(url, img);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pending?.descriptor) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await api.addGuardian(childId, {
        name: name.trim(),
        relationship: relationship.trim() || undefined,
        phone: phone.trim() || undefined,
        photoDataUrl: pending.dataUrl,
        descriptor: pending.descriptor,
      });
      setName('');
      setRelationship('');
      setPhone('');
      setPending(null);
      await onAdded();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this guardian.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-paper/10 bg-ink-soft/40 p-5">
      <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-slate">
        <ShieldCheck className="h-3.5 w-3.5" /> Enroll an authorized guardian
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => camera.start()}
              className="rounded-lg border border-paper/15 px-3 py-1.5 text-xs font-semibold text-paper/70 hover:bg-paper/5"
            >
              Use camera
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-paper/15 px-3 py-1.5 text-xs font-semibold text-paper/70 hover:bg-paper/5"
            >
              <Upload className="h-3.5 w-3.5" /> Upload photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {!pending && (
            <CameraPanel
              videoRef={camera.videoRef}
              isActive={camera.isActive}
              error={camera.error}
              onStart={camera.start}
              onStop={camera.stop}
              onCapture={handleCapture}
              captureLabel="Capture photo"
            />
          )}

          {pending && (
            <div>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-4 border-paper/15">
                <img src={pending.dataUrl} alt="Captured guardian" className="h-full w-full object-cover" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                {pending.status === 'detecting' && (
                  <span className="flex items-center gap-1.5 text-xs text-slate">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking for a face…
                  </span>
                )}
                {pending.status === 'ok' && (
                  <span className="flex items-center gap-1.5 text-xs text-verified">
                    <ScanFace className="h-3.5 w-3.5" /> Face captured
                  </span>
                )}
                {pending.status === 'no-face' && (
                  <span className="flex items-center gap-1.5 text-xs text-alert">
                    <ScanFace className="h-3.5 w-3.5" /> No face detected — try a clearer, front-facing photo
                  </span>
                )}
                <button type="button" onClick={() => setPending(null)} className="ml-auto text-xs text-slate underline">
                  Retake
                </button>
              </div>
            </div>
          )}
          {!modelsReady && <p className="mt-2 text-xs text-slate">Face-recognition model is still loading…</p>}
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate">Guardian's full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-paper/15 bg-ink px-3 py-2 text-sm text-paper focus:border-amber focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate">Relationship to child</label>
            <input
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="Mother, Father, Uncle, Nanny…"
              className="w-full rounded-lg border border-paper/15 bg-ink px-3 py-2 text-sm text-paper focus:border-amber focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate">Phone (optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-paper/15 bg-ink px-3 py-2 text-sm text-paper focus:border-amber focus:outline-none"
            />
          </div>

          {formError && <p className="text-xs text-alert">{formError}</p>}

          <button
            type="submit"
            disabled={submitting || !pending?.descriptor || !name.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-amber-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save guardian to gallery
          </button>
        </div>
      </div>
    </form>
  );
}
