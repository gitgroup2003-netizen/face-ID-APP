import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ScanFace, ShieldCheck, Users } from 'lucide-react';

export function RoleSelect({ onPick }: { onPick: (view: 'admin' | 'gate') => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 py-16 text-paper">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">School Pickup Verification</p>
        <h1 className="mt-3 font-display text-5xl font-semibold sm:text-6xl">GIT GROUP</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-slate">
          Matches the face of the person arriving to pick up a child against the guardian photos your school has on file.
        </p>
      </motion.div>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">
        <RoleTile
          icon={<Users className="h-6 w-6" />}
          title="Admin Portal"
          description="Build the roster: add children and enroll photos of authorized guardians."
          onClick={() => onPick('admin')}
          delay={0.05}
        />
        <RoleTile
          icon={<ScanFace className="h-6 w-6" />}
          title="Gate Scanner"
          description="For security at the gate: capture a photo of the visitor and check it against the gallery."
          onClick={() => onPick('gate')}
          delay={0.15}
        />
      </div>

      <div className="mt-10 flex items-center gap-2 font-mono text-[11px] text-slate">
        <ShieldCheck className="h-3.5 w-3.5" /> Face matching runs on-device — photos never leave your school's server.
      </div>
    </div>
  );
}

function RoleTile({
  icon,
  title,
  description,
  onClick,
  delay,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  delay: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', bounce: 0.2, duration: 0.5 }}
      whileHover={{ y: -3 }}
      onClick={onClick}
      className="group rounded-2xl border border-paper/15 bg-ink-soft/50 p-6 text-left transition hover:border-amber"
    >
      <div className="mb-4 inline-flex rounded-xl bg-amber/15 p-3 text-amber transition group-hover:bg-amber group-hover:text-ink">
        {icon}
      </div>
      <p className="font-display text-xl font-semibold">{title}</p>
      <p className="mt-1.5 text-sm text-slate">{description}</p>
    </motion.button>
  );
}
