import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

type Variante = 'primaria' | 'secundaria' | 'fantasma' | 'peligro' | 'papel' | 'peligro-suave';
type Tamano = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamano?: Tamano;
  icono?: ReactNode;
  bloque?: boolean;
  cargando?: boolean;
}

const variantes: Record<Variante, string> = {
  // Única acción dominante por vista (botones.md › Style)
  primaria:
    'bg-ember-strong text-white hover:bg-ember-hover active:brightness-95 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_8px_20px_-12px_rgba(194,65,12,0.9)]',
  secundaria:
    'bg-raised text-ink border border-line-strong hover:bg-line hover:border-control',
  fantasma:
    'bg-transparent text-ink-soft hover:bg-raised hover:text-ink border border-transparent',
  peligro:
    'bg-danger-strong text-white hover:brightness-110 active:brightness-95',
  'peligro-suave':
    'bg-danger/12 text-danger border border-danger/35 hover:bg-danger/20',
  papel:
    'bg-paper-ink text-paper hover:bg-black border border-transparent',
};

const tamanos: Record<Tamano, string> = {
  // md = 44px de alto: objetivo táctil mínimo de la HIG
  sm: 'h-9 px-3 text-[13px] gap-1.5 rounded-[8px]',
  md: 'h-11 px-4 text-sm gap-2 rounded-field',
  lg: 'h-[52px] px-5 text-base gap-2 rounded-field',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variante = 'secundaria',
    tamano = 'md',
    icono,
    bloque = false,
    cargando = false,
    className,
    children,
    disabled,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || cargando}
      className={twMerge(
        'inline-flex items-center justify-center font-semibold tracking-[-0.01em]',
        'transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-[cubic-bezier(.22,.61,.36,1)]',
        'active:translate-y-px disabled:opacity-45 disabled:pointer-events-none select-none',
        variantes[variante],
        tamanos[tamano],
        bloque && 'w-full',
        className
      )}
      {...rest}
    >
      {cargando ? (
        <span
          aria-hidden
          className="size-4 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      ) : (
        icono
      )}
      {children}
    </button>
  );
});
