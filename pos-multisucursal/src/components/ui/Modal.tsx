import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { IconButton } from './IconButton';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  /** En móvil siempre entra desde abajo; en escritorio respeta la variante. */
  posicion?: 'centro' | 'derecha' | 'abajo';
  ancho?: 'md' | 'lg' | 'xl' | 'ajustado';
  children: ReactNode;
  pie?: ReactNode;
  /** Para hojas cuyo contenido ya gestiona su propio scroll interno. */
  cuerpoSinScroll?: boolean;
  className?: string;
}

const anchos = {
  ajustado: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

export function Modal({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  posicion = 'centro',
  ancho = 'lg',
  children,
  pie,
  cuerpoSinScroll = false,
  className,
}: Props) {
  const idTitulo = useId();
  const idDesc = useId();
  const panel = useRef<HTMLDivElement>(null);
  const previo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!abierto) return;
    previo.current = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Enfocar el primer campo interactivo del modal (input, select, textarea o button).
    // Si no hay ninguno, enfocar el panel como fallback.
    // Esto evita que el usuario tenga que hacer clic dos veces para escribir.
    const rafId = requestAnimationFrame(() => {
      if (!panel.current) return;
      const primer = panel.current.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
      );
      if (primer) {
        primer.focus();
      } else {
        panel.current.focus();
      }
    });

    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCerrar();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      const focos = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focos.length === 0) return;
      const primero = focos[0];
      const ultimo = focos[focos.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alPresionar);
    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = overflow;
      previo.current?.focus?.();
    };
  }, [abierto, onCerrar]);

  if (!abierto || typeof document === 'undefined') return null;

  const alineacion =
    posicion === 'derecha'
      ? 'sm:justify-end'
      : posicion === 'abajo'
        ? 'sm:items-end sm:justify-center'
        : 'sm:items-center sm:justify-center';

  const forma =
    posicion === 'derecha'
      ? 'rounded-t-panel sm:rounded-none sm:rounded-l-panel sm:h-full sm:max-h-none'
      : posicion === 'abajo'
        ? 'rounded-t-panel sm:rounded-t-panel'
        : 'rounded-t-panel sm:rounded-panel';

  return createPortal(
    <div
      className={twMerge('fixed inset-0 z-[80] flex items-end sm:items-stretch', alineacion)}
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-sunken/80 backdrop-blur-[2px] animate-[velo_.18s_ease-out]"
        onClick={onCerrar}
        aria-hidden
      />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descripcion ? idDesc : undefined}
        className={twMerge(
          'relative flex w-full flex-col overflow-hidden border border-line-strong bg-app shadow-pop',
          'max-h-[92dvh] animate-[hoja_.22s_cubic-bezier(.22,.61,.36,1)]',
          forma,
          ancho === 'ajustado' && posicion !== 'derecha' && anchos.ajustado,
          ancho === 'md' && posicion !== 'derecha' && anchos.md,
          ancho === 'lg' && posicion !== 'derecha' && anchos.lg,
          ancho === 'xl' && posicion !== 'derecha' && anchos.xl,
          posicion === 'derecha' && 'sm:max-w-md',
          className
        )}
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={idTitulo} className="text-[17px] font-bold leading-tight tracking-[-0.015em] text-ink">
              {titulo}
            </h2>
            {descripcion && (
              <p id={idDesc} className="mt-0.5 text-[13px] leading-5 text-ink-muted">
                {descripcion}
              </p>
            )}
          </div>
          <IconButton
            etiqueta="Cerrar"
            onClick={onCerrar}
            tamano="sm"
            icono={<X className="size-4" strokeWidth={2.25} />}
          />
        </header>
        <div
          className={twMerge(
            'min-h-0 flex-1 overscroll-contain',
            cuerpoSinScroll ? 'overflow-hidden' : 'overflow-y-auto'
          )}
        >
          {children}
        </div>
        {pie && (
          <footer className="shrink-0 border-t border-line bg-chrome px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            {pie}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
