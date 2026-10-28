import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Check, RotateCw, Receipt, X } from 'lucide-react';
import { etiquetasCortes, limpiarNotas, type TipoCorte } from '../../core/tiposCorte';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';

export interface TicketItem {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  descuento_item?: number;
  notas?: string;
  /** Cortes elegidos para este producto (carnes). */
  tipo_corte?: TipoCorte[] | null;
}

export interface TicketData {
  pedidoId: number | string;
  aperturaCajaId?: number | null;
  sucursalNombre: string;
  cajeroNombre: string;
  clienteNombre: string;
  /** Ficha del turno (se reinicia en cada caja abierta). */
  numeroFicha?: number | null;
  tipoServicio?: 'mesa' | 'llevar' | null;
  fecha: Date | string;
  items: TicketItem[];
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago: string;
  efectivoRecibido?: number;
  cambio?: number;
}

interface PosTicketModalProps {
  ticket: TicketData | null;
  isOpen: boolean;
  onClose: () => void;
  autoPrint?: boolean;
}

/**
 * Contenido del ticket. Se usa igual en pantalla y en el portal de impresión
 * térmica, por eso todo va en negro puro sobre blanco: la impresora es de una
 * sola tinta y cualquier color se convierte en gris tramado (ilegible).
 */
function ContenidoTicket({
  ticket,
  fechaFormateada,
  pedidoIdStr,
}: {
  ticket: TicketData;
  fechaFormateada: string;
  pedidoIdStr: string;
}) {
  return (
    <div className="text-[11px] leading-tight text-black">
      <div className="pb-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[13px] font-black uppercase leading-none tracking-[0.08em]">Doña Migue</p>
            <p className="mt-0.5 break-words text-[9px] font-bold uppercase tracking-[0.06em]">
              {ticket.sucursalNombre}
            </p>
          </div>
          <div className="shrink-0 border-[1.5px] border-black px-3 py-1 text-center">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.18em]">Ficha</p>
            <p className="font-mono text-[25px] font-black leading-none tracking-tight">
              {ticket.numeroFicha ? `#${String(ticket.numeroFicha).padStart(3, '0')}` : `#${pedidoIdStr}`}
            </p>
          </div>
        </div>
        <div className="mt-1.5 flex justify-end">
          <div className="border-[1.5px] border-black px-2.5 py-0.5 text-center">
            <p className="text-[10px] font-black uppercase leading-tight">
              {ticket.tipoServicio === 'llevar' ? 'Llevar' : 'Mesa'}
            </p>
          </div>
        </div>
      </div>

      <div className="border-y border-dashed border-black py-1">
        <p className="flex justify-between gap-2">
          <span className="font-bold">Cliente</span>
          <span className="max-w-[62%] break-words text-right font-black uppercase">
            {ticket.clienteNombre}
          </span>
        </p>
        <p className="flex justify-between gap-2">
          <span className="font-bold">Cajero</span>
          <span className="text-right">{ticket.cajeroNombre || 'Cajero'}</span>
        </p>
        <p className="flex justify-between gap-2">
          <span className="font-bold">Fecha</span>
          <span className="text-right">{fechaFormateada}</span>
        </p>
        {ticket.aperturaCajaId && (
          <p className="flex justify-between gap-2">
            <span className="font-bold">Turno</span>
            <span className="text-right">Caja #{ticket.aperturaCajaId}</span>
          </p>
        )}
      </div>

      <div className="space-y-2 border-b border-dashed border-black py-2.5">
        {(ticket.items || []).map((det, idx) => {
          const notaLimpia = limpiarNotas(det.notas);
          return (
            <div key={idx}>
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 break-words text-[13px] font-bold leading-snug">
                  <span className="font-black">{det.cantidad}x</span> {det.nombre}
                </span>
                <span className="shrink-0 font-mono text-[13px] font-black tabular-nums">
                  {Number(det.subtotal).toFixed(2)}
                </span>
              </div>
              {det.tipo_corte && det.tipo_corte.length > 0 && (
                <p className="pl-3 text-[11px] font-black uppercase leading-tight">
                  {det.tipo_corte.length > 1 ? 'Cortes' : 'Corte'}:{' '}
                  {etiquetasCortes(det.tipo_corte)}
                </p>
              )}
              {notaLimpia && (
                <p className="pl-3 text-[11px] italic leading-tight">» {notaLimpia}</p>
              )}
              {det.descuento_item && det.descuento_item > 0 ? (
                <p className="pl-3 font-mono text-[11px] font-bold leading-tight">
                  Desc. -{Number(det.descuento_item).toFixed(2)}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="space-y-1 pt-1.5">
        <p className="flex justify-between gap-2">
          <span className="font-bold">Subtotal</span>
          <span className="font-mono tabular-nums">{Number(ticket.subtotal).toFixed(2)}</span>
        </p>
        {Number(ticket.descuento) > 0 && (
          <p className="flex justify-between gap-2">
            <span className="font-bold">Descuento</span>
            <span className="font-mono tabular-nums">
              -{Number(ticket.descuento).toFixed(2)}
            </span>
          </p>
        )}
        <div className="flex items-baseline justify-between gap-2 border-y-2 border-black py-1.5">
          <span className="text-[12px] font-black uppercase tracking-wide">Total</span>
          <span className="font-mono text-[17px] font-black tabular-nums">
            Bs {Number(ticket.total).toFixed(2)}
          </span>
        </div>
        <p className="flex justify-between gap-2 pt-1">
          <span className="font-bold">Pago</span>
          <span className="font-black uppercase">{ticket.metodoPago || 'EFECTIVO'}</span>
        </p>
        {ticket.metodoPago === 'EFECTIVO' && ticket.efectivoRecibido !== undefined && (
          <>
            <p className="flex justify-between gap-2">
              <span className="font-bold">Recibido</span>
              <span className="font-mono tabular-nums">
                {Number(ticket.efectivoRecibido).toFixed(2)}
              </span>
            </p>
            <p className="flex justify-between gap-2">
              <span className="font-bold">Cambio</span>
              <span className="font-mono font-black tabular-nums">
                {Number(ticket.cambio || 0).toFixed(2)}
              </span>
            </p>
          </>
        )}
      </div>

      <div className="space-y-0.5 border-t border-dashed border-black pt-2 text-center">
        <p className="text-[10px] font-black uppercase">¡Gracias por su preferencia!</p>
        <p className="text-[9px]">Doña Migue · Sabor tradicional a las brasas</p>
      </div>
    </div>
  );
}

export default function PosTicketModal({
  ticket,
  isOpen,
  onClose,
  autoPrint = true,
}: PosTicketModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [autoImprimir, setAutoImprimir] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_autoprint');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [anchoPapel, setAnchoPapel] = useState<'80mm' | '58mm'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('pos_ticket_ancho') as '80mm' | '58mm') || '80mm';
    }
    return '80mm';
  });

  const [imprimiendo, setImprimiendo] = useState(false);
  const printTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleAutoImprimir = () => {
    const nuevoValor = !autoImprimir;
    setAutoImprimir(nuevoValor);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_autoprint', String(nuevoValor));
    }
  };

  const cambiarAnchoPapel = (ancho: '80mm' | '58mm') => {
    setAnchoPapel(ancho);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_ticket_ancho', ancho);
    }
  };

  const ejecutarImpresion = () => {
    setImprimiendo(true);
    setTimeout(() => {
      window.print();
      setImprimiendo(false);
    }, 150);
  };

  // Disparar impresión automática al abrir si está configurado
  useEffect(() => {
    if (isOpen && ticket && autoPrint && autoImprimir) {
      printTimeoutRef.current = setTimeout(() => {
        ejecutarImpresion();
      }, 350);
    }

    return () => {
      if (printTimeoutRef.current) {
        clearTimeout(printTimeoutRef.current);
      }
    };
  }, [isOpen, ticket, autoPrint, autoImprimir]);

  // Atajos de teclado: Escape para cerrar, Enter o P para imprimir
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' || e.key === 'p' || e.key === 'P') {
        if (!e.ctrlKey && !e.metaKey && (e.target as HTMLElement)?.tagName !== 'INPUT') {
          e.preventDefault();
          ejecutarImpresion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !ticket) return null;

  const fechaFormateada = (() => {
    try {
      const d = typeof ticket.fecha === 'string' ? new Date(ticket.fecha) : ticket.fecha;
      return d.toLocaleString([], {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    }
  })();

  const pedidoIdStr = ticket.pedidoId.toString().padStart(4, '0');

  return (
    <>
      {/* Modal en pantalla (no se imprime) */}
      <AnimatePresence>
        <div className="no-print fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-sunken/85 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Comprobante de venta"
            className="relative w-full max-w-sm space-y-3.5 rounded-panel border border-line-strong bg-chrome p-4 text-ink shadow-pop"
          >
            <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-[7px] border border-ember/30 bg-ember/10 text-ember">
                  <Receipt className="size-3.5" strokeWidth={2.25} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[12px] font-bold leading-tight text-ink">Comprobante</h3>
                  <p className="truncate text-[10px] text-ink-muted">
                    {ticket.numeroFicha
                      ? `Ficha #${ticket.numeroFicha} · #${pedidoIdStr}`
                      : `Comanda #${pedidoIdStr}`}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <div className="flex items-center gap-0.5 rounded-[7px] border border-line bg-sunken p-0.5">
                  {(['80mm', '58mm'] as const).map((ancho) => (
                    <button
                      key={ancho}
                      type="button"
                      onClick={() => cambiarAnchoPapel(ancho)}
                      aria-pressed={anchoPapel === ancho}
                      className={`rounded-[5px] px-1.5 py-0.5 font-mono text-[9.5px] font-bold transition-colors ${
                        anchoPapel === ancho
                          ? 'bg-ember-strong text-white'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {ancho}
                    </button>
                  ))}
                </div>
                <IconButton
                  etiqueta="Cerrar (Esc)"
                  onClick={onClose}
                  tamano="sm"
                  icono={<X className="size-3.5" strokeWidth={2.25} />}
                />
              </div>
            </div>

            {/* Vista previa: el mismo componente que se imprime */}
            <div
              className={`mx-auto box-border rounded-[4px] bg-white p-3.5 font-mono text-black shadow-[0_10px_30px_-16px_rgba(0,0,0,0.9)] transition-[max-width] duration-200 ${
                anchoPapel === '58mm' ? 'max-w-[212px]' : 'max-w-[292px]'
              }`}
            >
              <ContenidoTicket
                ticket={ticket}
                fechaFormateada={fechaFormateada}
                pedidoIdStr={pedidoIdStr}
              />
            </div>

            <div className="space-y-2.5">
              <label className="flex cursor-pointer select-none items-center gap-2 text-[11.5px] text-ink-soft transition-colors hover:text-ink">
                <input
                  type="checkbox"
                  checked={autoImprimir}
                  onChange={toggleAutoImprimir}
                  className="size-4 cursor-pointer rounded border-line-strong bg-raised accent-ember-strong focus-visible:ring-2 focus-visible:ring-ember/40"
                />
                Impresión automática al cobrar
              </label>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variante="primaria"
                  onClick={ejecutarImpresion}
                  disabled={imprimiendo}
                  icono={
                    imprimiendo ? (
                      <RotateCw className="size-4 animate-spin" strokeWidth={2.25} />
                    ) : (
                      <Printer className="size-4" strokeWidth={2.25} />
                    )
                  }
                >
                  Imprimir
                </Button>
                <Button
                  variante="secundaria"
                  onClick={onClose}
                  icono={<Check className="size-4 text-ok" strokeWidth={2.5} />}
                >
                  Siguiente
                </Button>
              </div>

              <p className="text-center text-[10.5px] text-ink-faint">
                Enter imprime · Esc cierra
              </p>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Portal exclusivo de impresión térmica (reglas en global.css) */}
      {isMounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id="ticket-termico-impresion-portal"
            className={`m-0 box-border bg-white p-0 font-mono text-black ${
              anchoPapel === '58mm' ? 'ticket-ancho-58mm' : 'ticket-ancho-80mm'
            }`}
          >
            <ContenidoTicket
              ticket={ticket}
              fechaFormateada={fechaFormateada}
              pedidoIdStr={pedidoIdStr}
            />
          </div>,
          document.body
        )}
    </>
  );
}
