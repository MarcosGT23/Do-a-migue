import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

type Superficie = 'carbon' | 'papel';

const base =
  'w-full rounded-field border px-3 text-sm transition-colors duration-150 ' +
  'placeholder:text-ink-faint focus-visible:outline-none ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const superficies: Record<Superficie, string> = {
  carbon:
    'bg-sunken text-ink border-line-strong hover:border-control ' +
    'focus:border-ember focus:ring-2 focus:ring-ember/25',
  papel:
    'bg-white/70 text-paper-ink border-paper-line placeholder:text-paper-ink-soft/70 ' +
    'focus:border-stamp focus:ring-2 focus:ring-stamp/20',
};

export const inputClase = (superficie: Superficie = 'carbon', extra?: string) =>
  twMerge(base, superficies[superficie], 'h-11', extra);

interface FieldProps {
  etiqueta: string;
  /** Oculta la etiqueta visualmente pero la mantiene para lectores de pantalla. */
  oculta?: boolean;
  ayuda?: string;
  error?: string;
  superficie?: Superficie;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}

export function Field({
  etiqueta,
  oculta = false,
  ayuda,
  error,
  superficie = 'carbon',
  children,
  className,
  htmlFor,
}: FieldProps) {
  const id = htmlFor ?? undefined;
  return (
    <div className={twMerge('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className={twMerge(
          'block text-[12px] font-semibold uppercase tracking-[0.07em]',
          superficie === 'papel' ? 'text-paper-ink-soft' : 'text-ink-muted',
          oculta && 'sr-only'
        )}
      >
        {etiqueta}
      </label>
      {children}
      {(ayuda || error) && (
        <p
          className={twMerge(
            'text-[12px] leading-4',
            error
              ? superficie === 'papel'
                ? 'text-paper-danger font-medium'
                : 'text-danger font-medium'
              : superficie === 'papel'
                ? 'text-paper-ink-soft'
                : 'text-ink-muted'
          )}
        >
          {error ?? ayuda}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { superficie?: Superficie }>(
  function Input({ superficie = 'carbon', className, ...rest }, ref) {
    return <input ref={ref} className={inputClase(superficie, className)} {...rest} />;
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { superficie?: Superficie }
>(function Textarea({ superficie = 'carbon', className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={twMerge(base, superficies[superficie], 'min-h-[76px] py-2.5', className)}
      {...rest}
    />
  );
});
