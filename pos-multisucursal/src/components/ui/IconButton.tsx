import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Texto accesible obligatorio: un icono solo no dice nada a un lector de pantalla. */
  etiqueta: string;
  icono: ReactNode;
  tono?: 'neutral' | 'ember' | 'peligro' | 'papel';
  tamano?: 'sm' | 'md';
}

const tonos = {
  neutral: 'text-ink-soft hover:text-ink hover:bg-raised border-transparent',
  ember: 'text-ember hover:bg-ember/10 border-transparent',
  peligro: 'text-danger hover:bg-danger/12 border-transparent',
  papel: 'text-paper-ink-soft hover:text-paper-ink hover:bg-black/8 border-transparent',
};

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { etiqueta, icono, tono = 'neutral', tamano = 'md', className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      className={twMerge(
        'inline-flex items-center justify-center rounded-[10px] border transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember',
        tamano === 'sm' ? 'size-10' : 'size-11',
        tonos[tono],
        className
      )}
      {...rest}
    >
      {icono}
    </button>
  );
});
