import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db, type ChildRow, type GuardianRow, type PickupLogRow } from './src/server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
const PORT = Number(process.env.PORT) || (process.env.NODE_ENV === 'production' ? 3000 : 3001);

// Photos arrive as base64 data URLs (captured from <video>/<canvas> client-side),
// so the JSON body limit needs headroom above Express's 100kb default.
app.use(express.json({ limit: '15mb' }));
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d' }));

function saveDataUrlImage(dataUrl: string, prefix: string): string {
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Expected a base64 image data URL');
  const ext = match[1] === 'jpg' ? 'jpeg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const filename = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

function guardianOut(g: GuardianRow) {
  return {
    id: g.id,
    childId: g.child_id,
    name: g.name,
    relationship: g.relationship,
    phone: g.phone,
    photoUrl: g.photo_path,
    descriptor: JSON.parse(g.descriptor) as number[],
    createdAt: g.created_at,
  };
}

function childOut(c: ChildRow, guardianCount?: number) {
  return {
    id: c.id,
    name: c.name,
    grade: c.grade,
    notes: c.notes,
    createdAt: c.created_at,
    ...(guardianCount !== undefined ? { guardianCount } : {}),
  };
}

const api = express.Router();

// ---- Children ----

api.get('/children', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM guardians g WHERE g.child_id = c.id) AS guardian_count
       FROM children c ORDER BY c.name COLLATE NOCASE ASC`
    )
    .all() as (ChildRow & { guardian_count: number })[];
  res.json(rows.map((r) => childOut(r, r.guardian_count)));
});

api.post('/children', (req, res) => {
  const { name, grade, notes } = req.body ?? {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }
  const info = db
    .prepare('INSERT INTO children (name, grade, notes) VALUES (?, ?, ?)')
    .run(name.trim(), grade ?? null, notes ?? null);
  const row = db.prepare('SELECT * FROM children WHERE id = ?').get(info.lastInsertRowid) as ChildRow;
  res.status(201).json(childOut(row, 0));
});

api.get('/children/:id', (req, res) => {
  const child = db.prepare('SELECT * FROM children WHERE id = ?').get(req.params.id) as ChildRow | undefined;
  if (!child) return res.status(404).json({ error: 'Child not found' });
  const guardians = db
    .prepare('SELECT * FROM guardians WHERE child_id = ? ORDER BY created_at ASC')
    .all(req.params.id) as GuardianRow[];
  res.json({ ...childOut(child), guardians: guardians.map(guardianOut) });
});

api.delete('/children/:id', (req, res) => {
  const info = db.prepare('DELETE FROM children WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Child not found' });
  res.status(204).end();
});

// ---- Guardians ----

// All guardians with descriptors, for the gate scanner to match against.
api.get('/guardians', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT g.*, c.name AS child_name, c.grade AS child_grade
       FROM guardians g JOIN children c ON c.id = g.child_id
       ORDER BY g.created_at DESC`
    )
    .all() as (GuardianRow & { child_name: string; child_grade: string | null })[];
  res.json(
    rows.map((r) => ({
      ...guardianOut(r),
      childName: r.child_name,
      childGrade: r.child_grade,
    }))
  );
});

api.post('/children/:id/guardians', (req, res) => {
  const child = db.prepare('SELECT * FROM children WHERE id = ?').get(req.params.id) as ChildRow | undefined;
  if (!child) return res.status(404).json({ error: 'Child not found' });

  const { name, relationship, phone, photoDataUrl, descriptor } = req.body ?? {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name is required' });
  if (!photoDataUrl || typeof photoDataUrl !== 'string')
    return res.status(400).json({ error: 'photoDataUrl is required' });
  if (!Array.isArray(descriptor) || descriptor.length === 0)
    return res.status(400).json({ error: 'descriptor (face embedding) is required — no face was detected in the photo' });

  let photoPath: string;
  try {
    photoPath = saveDataUrlImage(photoDataUrl, `guardian-${child.id}`);
  } catch {
    return res.status(400).json({ error: 'Invalid photo data' });
  }

  const info = db
    .prepare(
      'INSERT INTO guardians (child_id, name, relationship, phone, photo_path, descriptor) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(child.id, name.trim(), relationship ?? null, phone ?? null, photoPath, JSON.stringify(descriptor));

  const row = db.prepare('SELECT * FROM guardians WHERE id = ?').get(info.lastInsertRowid) as GuardianRow;
  res.status(201).json(guardianOut(row));
});

api.delete('/guardians/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM guardians WHERE id = ?').get(req.params.id) as GuardianRow | undefined;
  if (!row) return res.status(404).json({ error: 'Guardian not found' });
  db.prepare('DELETE FROM guardians WHERE id = ?').run(req.params.id);
  const abs = path.join(__dirname, row.photo_path.replace(/^\//, ''));
  fs.unlink(abs, () => {});
  res.status(204).end();
});

// ---- Pickup logs ----

api.get('/pickup-logs', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const rows = db
    .prepare(
      `SELECT l.*, c.name AS child_name, g.name AS guardian_name, g.relationship AS guardian_relationship
       FROM pickup_logs l
       LEFT JOIN children c ON c.id = l.child_id
       LEFT JOIN guardians g ON g.id = l.guardian_id
       ORDER BY l.created_at DESC LIMIT ?`
    )
    .all(limit) as (PickupLogRow & {
    child_name: string | null;
    guardian_name: string | null;
    guardian_relationship: string | null;
  })[];

  res.json(
    rows.map((r) => ({
      id: r.id,
      childId: r.child_id,
      childName: r.child_name,
      guardianId: r.guardian_id,
      guardianName: r.guardian_name,
      guardianRelationship: r.guardian_relationship,
      matched: !!r.matched,
      confidence: r.confidence,
      snapshotUrl: r.snapshot_path,
      note: r.note,
      createdAt: r.created_at,
    }))
  );
});

api.post('/pickup-logs', (req, res) => {
  const { childId, guardianId, matched, confidence, snapshotDataUrl, note } = req.body ?? {};

  let snapshotPath: string | null = null;
  if (snapshotDataUrl) {
    try {
      snapshotPath = saveDataUrlImage(snapshotDataUrl, 'pickup');
    } catch {
      return res.status(400).json({ error: 'Invalid snapshot image' });
    }
  }

  const info = db
    .prepare(
      'INSERT INTO pickup_logs (child_id, guardian_id, matched, confidence, snapshot_path, note) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(childId ?? null, guardianId ?? null, matched ? 1 : 0, confidence ?? null, snapshotPath, note ?? null);

  res.status(201).json({ id: info.lastInsertRowid });
});

app.use('/api', api);

// ---- Static frontend (production build) ----
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`GIT GROUP API${fs.existsSync(distDir) ? ' + web' : ''} running on http://localhost:${PORT}`);
});
