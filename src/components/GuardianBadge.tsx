import { motion } from 'motion/react';

export interface GuardianBadgeProps {
  photoUrl: string;
  name: string;
  relationship?: string | null;
  childLabel?: string | null;
  meta?: string;
  verdict?: { label: string; tone: 'verified' | 'alert' | 'neutral' };
  compact?: boolean;
}

const toneStyles: Record<NonNullable<GuardianBadgeProps['verdict']>['tone'], string> = {
  verified: 'text-verified border-verified',
  alert: 'text-alert border-alert',
  neutral: 'text-slate border-slate',
};

export function GuardianBadge({ photoUrl, name, relationship, childLabel, meta, verdict, compact }: GuardianBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
      className="relative w-full max-w-xs shrink-0 select-none"
    >
      {/* lanyard clip */}
      <div className="mx-auto h-4 w-10 rounded-t-md border border-b-0 border-ink/20 bg-paper-dim" />
      <div className="overflow-hidden rounded-b-2xl rounded-t-sm border border-ink/10 bg-paper text-ink shadow-[0_10px_30px_rgba(18,33,58,0.35)]">
        <div className="badge-perf" />
        <div className={compact ? 'p-4' : 'p-5'}>
          <div className="flex items-start gap-4">
            <img
              src={photoUrl}
              alt={name}
              className={`${compact ? 'h-16 w-16' : 'h-24 w-24'} shrink-0 rounded-lg border border-ink/15 object-cover`}
            />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold leading-tight">{name}</p>
              {relationship && <p className="text-sm text-slate">{relationship}</p>}
              {childLabel && (
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-slate">Picking up: {childLabel}</p>
              )}
            </div>
          </div>

          {verdict && (
            <div className="mt-4 flex items-center justify-between">
              <span className={`stamp text-xs font-semibold ${toneStyles[verdict.tone]}`}>{verdict.label}</span>
              {meta && <span className="font-mono text-[10px] text-slate">{meta}</span>}
            </div>
          )}
          {!verdict && meta && <p className="mt-3 font-mono text-[10px] text-slate">{meta}</p>}
        </div>
      </div>
    </motion.div>
  );
}
