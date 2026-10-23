import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

type Tono = 'neutro' | 'brasa' | 'ok' | 'peligro' | 'alerta' | 'papel' | 'sello';

interface Props {
  children: ReactNode;
  tono?: Tono;
  /** Variante sólida para la etiqueta que debe leerse primero (p. ej. la ficha). */
  solido?: boolean;
  mono?: boolean;
  className?: string;
}

const tonos: Record<Tono, { suave: string; solido: string }> = {
  neutro: {
    suave: 'bg-raised text-ink-soft border-line-strong',
    solido: 'bg-line-strong text-ink border-line-strong',
  },
  brasa: {
    suave: 'bg-ember/10 text-ember border-ember/35',
    solido: 'bg-ember-strong text-white border-ember-strong',
  },
  ok: {
    suave: 'bg-ok/12 text-ok border-ok/35',
    solido: 'bg-ok text-sunken border-ok',
  },
  peligro: {
    suave: 'bg-danger/12 text-danger border-danger/35',
    solido: 'bg-danger-strong text-white border-danger-strong',
  },
  alerta: {
    suave: 'bg-warn/12 text-warn border-warn/35',
    solido: 'bg-warn text-sunken border-warn',
  },
  papel: {
    suave: 'bg-black/6 text-paper-ink-soft border-paper-line',
    solido: 'bg-paper-ink text-paper border-paper-ink',
  },
  sello: {
    suave: 'bg-stamp/10 text-stamp border-stamp/40',
    solido: 'bg-stamp text-paper border-stamp',
  },
};

export function Badge({ children, tono = 'neutro', solido = false, mono = false, className }: Props) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5',
        'text-[11px] font-semibold uppercase leading-[18px] tracking-[0.06em] whitespace-nowrap',
        mono && 'font-mono tracking-[0.08em] tabular-nums',
        tonos[tono][solido ? 'solido' : 'suave'],
        className
      )}
    >
      {children}
    </span>
  );
}
