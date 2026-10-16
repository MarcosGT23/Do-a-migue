import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, X, Check, Flame, Receipt, RotateCw } from 'lucide-react';

export interface TicketItem {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  descuento_item?: number;
  notas?: string;
}

export interface TicketData {
  pedidoId: number | string;
  aperturaCajaId?: number | null;
  sucursalNombre: string;
  cajeroNombre: string;
  clienteNombre: string;
  numeroMesa?: number | null;
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

// Subcomponente reutilizable con la estructura visual del ticket en negro fuerte y acentos
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
    <>
      {/* Cabecera Tradicional Doña Migue Centrada con Color */}
      <div className="text-center pb-2 border-b-2 border-dashed border-stone-400 space-y-1 m-0 p-0">
        <div className="flex items-center justify-center gap-1.5 font-black text-sm tracking-tight text-amber-600 uppercase">
          <Flame className="w-4 h-4 text-orange-500 fill-orange-500 inline-block" />
          <span className="text-black font-black">DOÑA MIGUE</span>
        </div>
        <p className="text-[10px] text-black font-sans tracking-wide uppercase font-black">
          {ticket.sucursalNombre}
        </p>
        <div className="flex items-center justify-center gap-1.5 pt-0.5 text-[10px]">
          <span className="font-black text-black bg-stone-100 px-2 py-0.5 rounded border border-stone-400">
            COMANDA #{pedidoIdStr}
          </span>
          {ticket.aperturaCajaId && (
            <span className="text-black font-bold">Turno #{ticket.aperturaCajaId}</span>
          )}
        </div>
      </div>

      {/* Metadatos de la Orden en Negro Fuerte */}
      <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-stone-400 text-black">
        <div className="flex justify-between items-center gap-2">
          <span className="text-black font-bold">Cliente:</span>
          <span className="font-black text-black uppercase break-words text-right flex-1">
            {ticket.clienteNombre}
          </span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-black font-bold">Ubicación:</span>
          <span className="font-black px-2 py-0.5 rounded bg-amber-100 text-black border border-amber-400 text-[10px]">
            {ticket.numeroMesa ? `MESA #${ticket.numeroMesa}` : 'MOSTRADOR / LLEVAR'}
          </span>
        </div>
        <div className="flex justify-between items-center text-[10px] text-black font-bold pt-0.5">
          <span>{fechaFormateada}</span>
          <span>Cajero: {ticket.cajeroNombre || 'Cajero'}</span>
        </div>
      </div>

      {/* Detalle de Productos en Negro Fuerte */}
      <div className="pt-1 pb-2 border-b border-dashed border-stone-400 space-y-1.5 text-black">
        {(ticket.items || []).map((det, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="flex justify-between items-start text-[11px] gap-2 leading-tight">
              <span className="font-bold flex-1 break-words text-black">
                <strong className="text-black font-black">{det.cantidad}x</strong> {det.nombre}
              </span>
              <span className="font-black whitespace-nowrap tabular-nums text-right text-black">
                Bs {Number(det.subtotal).toFixed(2)}
              </span>
            </div>
            {det.notas && (
              <p className="text-[9.5px] text-amber-800 italic pl-3 leading-none font-bold">
                • {det.notas}
              </p>
            )}
            {det.descuento_item && det.descuento_item > 0 ? (
              <p className="text-[9.5px] text-rose-700 pl-3 leading-none font-bold">
                Desc: -Bs {Number(det.descuento_item).toFixed(2)}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {/* Totales y Métodos de Pago en Negro Fuerte */}
      <div className="space-y-1.5 text-[11px] pt-1 text-black">
        <div className="flex justify-between text-black font-bold">
          <span>Subtotal:</span>
          <span className="tabular-nums font-black">Bs {Number(ticket.subtotal).toFixed(2)}</span>
        </div>
        {Number(ticket.descuento) > 0 && (
          <div className="flex justify-between text-rose-700 font-bold">
            <span>Descuento:</span>
            <span className="tabular-nums font-black">-Bs {Number(ticket.descuento).toFixed(2)}</span>
          </div>
        )}
        {/* Bloque TOTAL con fondo amber tenue y texto negro fuerte */}
        <div className="flex justify-between items-center font-black p-2 rounded-lg bg-amber-50 border border-amber-400 text-black my-1">
          <span className="tracking-wide text-xs text-black font-black">TOTAL:</span>
          <span className="text-base text-black font-black tabular-nums">
            Bs {Number(ticket.total).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-[10px] text-black font-bold pt-0.5">
          <span>Método de Pago:</span>
          <span className="font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-400 text-[10px]">
            {ticket.metodoPago || 'EFECTIVO'}
          </span>
        </div>
        {ticket.metodoPago === 'EFECTIVO' && ticket.efectivoRecibido !== undefined && (
          <div className="flex justify-between text-[10px] text-black font-bold pt-1 border-t border-dotted border-stone-400">
            <span>Recibido: Bs {Number(ticket.efectivoRecibido).toFixed(2)}</span>
            <span className="font-black text-black">
              Cambio: Bs {Number(ticket.cambio || 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Pie de Página en Negro Fuerte */}
      <div className="text-center pt-2 text-[10px] text-black border-t border-dashed border-stone-400 space-y-0.5">
        <p className="font-black text-black">¡Gracias por su preferencia!</p>
        <p className="text-[9px] text-black font-bold">Doña Migue • Sabor Tradicional a las Brasas</p>
      </div>
    </>
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
      {/* 🖨️ Reglas de Impresión Incrustadas Directamente (Cero margen superior a 0mm) */}
      <style>{`
        #ticket-termico-impresion-portal {
          display: none !important;
        }

        @media print {
          @page {
            size: 80mm 297mm;
            margin: 0mm !important;
          }

          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0mm !important;
            padding: 0mm !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }

          /* Oculta toda la aplicación para que no ocupe espacio de flujo */
          body > * {
            display: none !important;
          }

          /* Único elemento visible en la página impreso en la coordenada top: 0mm */
          body > #ticket-termico-impresion-portal {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            top: 0mm !important;
            left: 0mm !important;
            right: 0mm !important;
            margin: 0 auto !important;
            margin-top: 0mm !important;
            padding: 0mm 2.5mm 3mm 2.5mm !important;
            padding-top: 0mm !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
            font-family: 'Courier New', Courier, monospace !important;
            box-shadow: none !important;
            border: none !important;
          }

          body > #ticket-termico-impresion-portal * {
            visibility: visible !important;
          }

          #ticket-termico-impresion-portal > *:first-child {
            margin-top: 0mm !important;
            padding-top: 0mm !important;
          }

          .ticket-ancho-80mm {
            width: 72mm !important;
            max-width: 72mm !important;
            font-size: 11px !important;
            line-height: 1.25 !important;
          }

          .ticket-ancho-58mm {
            width: 48mm !important;
            max-width: 48mm !important;
            font-size: 9.5px !important;
            line-height: 1.15 !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* 1. MODAL VISUAL EN PANTALLA (Marcado como no-print para que no afecte la impresión) */}
      <AnimatePresence>
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="bg-[#181614] border border-[#332b24] rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-[#ede7dc] relative"
          >
            {/* Header del Modal */}
            <div className="flex justify-between items-center pb-2.5 border-b border-[#29221b]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Comprobante de Venta
                  </h3>
                  <p className="text-[10px] text-[#9e9382]">Comanda #{pedidoIdStr}</p>
                </div>
              </div>

              {/* Selector de Ancho: 80mm / 58mm */}
              <div className="flex items-center gap-1 bg-[#100f0e] p-0.5 rounded-lg border border-[#2b2520]">
                <button
                  type="button"
                  onClick={() => cambiarAnchoPapel('80mm')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition ${
                    anchoPapel === '80mm'
                      ? 'bg-amber-600 text-white'
                      : 'text-[#877c6c] hover:text-[#ded5c6]'
                  }`}
                  title="Imprimir en rollo 80mm"
                >
                  80mm
                </button>
                <button
                  type="button"
                  onClick={() => cambiarAnchoPapel('58mm')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition ${
                    anchoPapel === '58mm'
                      ? 'bg-amber-600 text-white'
                      : 'text-[#877c6c] hover:text-[#ded5c6]'
                  }`}
                  title="Imprimir en rollo 58mm"
                >
                  58mm
                </button>

                <button
                  onClick={onClose}
                  className="w-6 h-6 ml-1 rounded bg-[#24201c] hover:bg-[#2f2a24] text-[#9e9382] hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="Cerrar (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Vista Previa del Ticket en Pantalla */}
            <div
              className={`p-4 bg-white text-black font-mono rounded-xl space-y-2.5 text-xs shadow-inner border border-stone-300 mx-auto transition-all box-border ${
                anchoPapel === '58mm'
                  ? 'max-w-[215px] text-[10px]'
                  : 'max-w-[285px] text-[11px]'
              }`}
            >
              <ContenidoTicket
                ticket={ticket}
                fechaFormateada={fechaFormateada}
                pedidoIdStr={pedidoIdStr}
              />
            </div>

            {/* Opciones y Configuración de Impresión */}
            <div className="pt-1 space-y-3">
              <div className="flex items-center justify-between px-0.5 text-xs text-[#9e9382]">
                <label
                  onClick={toggleAutoImprimir}
                  className="flex items-center gap-1.5 cursor-pointer select-none hover:text-[#ede7dc] transition"
                >
                  <input
                    type="checkbox"
                    checked={autoImprimir}
                    onChange={toggleAutoImprimir}
                    className="rounded border-[#332b24] bg-[#24201c] text-amber-500 focus:ring-amber-500/30 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-[10px]">Impresión automática al cobrar</span>
                </label>

                <span className="text-[9px] text-[#685f52]">Enter: Imprimir | Esc: Salir</span>
              </div>

              {/* Botones de Acción */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={ejecutarImpresion}
                  disabled={imprimiendo}
                  className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-900/30 transition cursor-pointer"
                >
                  {imprimiendo ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Printer className="w-3.5 h-3.5" />
                  )}
                  <span>Imprimir ({anchoPapel})</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-3 rounded-xl bg-[#24201c] hover:bg-[#302b25] active:scale-[0.98] text-[#ede7dc] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-[#382f25]"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Siguiente Venta</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* 2. CONTENEDOR EXCLUSIVO DE IMPRESIÓN DIRECTO EN BODY (CERO espacio superior en papel 80x297mm) */}
      {isMounted && typeof document !== 'undefined' && createPortal(
        <div
          id="ticket-termico-impresion-portal"
          className={`bg-white text-black font-mono box-border p-0 m-0 ${
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
