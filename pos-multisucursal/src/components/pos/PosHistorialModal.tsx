import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  X, Search, Receipt, Edit3, Ban, CheckCircle2,
  Plus, Minus, Trash2, RefreshCw, Clock,
  Banknote, QrCode, CreditCard, Building2,
  Save,
} from 'lucide-react';
import { PosService, type MetodoPago } from '../../services/pos.service';
import PosTicketModal, { type TicketData } from './PosTicketModal';
import {
  claveLinea,
  etiquetasCortes,
  extraerCortesDeNotas,
  limpiarNotas,
  OPCIONES_CORTE,
  parsearCortes,
  productoTieneCortes,
  type TipoCorte,
} from '../../core/tiposCorte';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';

export interface DetallePedido {
  id?: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  descuento_item?: number;
  subtotal: number;
  notas?: string;
  /** Cortes de la línea tal como los guarda la base de datos ('COSTILLA,MATAHAMBRE'). */
  tipo_corte?: string | null;
  productos?: {
    id: number;
    nombre: string;
    precio_base: number;
    categoria_id?: number;
    imagen_url?: string;
  };
}

export interface PagoPedido {
  id: number;
  metodo: MetodoPago;
  monto: number;
  referencia_pago?: string | null;
  created_at?: string;
}

export interface PedidoHistorial {
  id: number;
  sucursal_id: number;
  apertura_caja_id: number;
  usuario_id: string;
  cliente_nombre: string;
  /** Ficha del turno (se reinicia en cada caja abierta). */
  numero_ficha?: number | null;
  estado: 'PAGADO' | 'PENDIENTE' | 'ANULADO';
  subtotal: number;
  descuento: number;
  total: number;
  anulado_por?: string | null;
  motivo_anulacion?: string | null;
  anulado_at?: string | null;
  created_at: string;
  updated_at?: string;
  detalle_pedidos: DetallePedido[];
  pagos: PagoPedido[];
  usuarios?: {
    id: string;
    nombre_completo: string;
    rol: string;
  };
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  sucursalId: number;
  sucursalNombre: string;
  cajaActualId: number | null;
  usuarioId: string;
  productosCatalogo: Array<{
    id: number;
    nombre: string;
    precio_base: number;
    stock_actual: number;
  }>;
  onPedidoModificado?: () => void;
}

/**
 * Cortes de una línea: los de la columna `tipo_corte` o, si la línea aún no
 * tiene columna, los que viajan dentro de las notas.
 */
function cortesDeLinea(tipoCorte?: string | null, notas?: string | null): TipoCorte[] {
  const deColumna = parsearCortes(tipoCorte);
  if (deColumna.length > 0) return deColumna;
  return extraerCortesDeNotas(notas);
}

const iconoMetodo: Record<string, typeof Banknote> = {
  EFECTIVO: Banknote,
  QR: QrCode,
  TARJETA: CreditCard,
  TRANSFERENCIA: Building2,
};

export default function PosHistorialModal({
  abierto,
  onCerrar,
  sucursalId,
  sucursalNombre,
  cajaActualId,
  usuarioId,
  productosCatalogo,
  onPedidoModificado,
}: Props) {
  const [pedidos, setPedidos] = useState<PedidoHistorial[]>([]);
  const [cargando, setCargando] = useState(false);
  const [filtroCaja, setFiltroCaja] = useState<'TURNO_ACTUAL' | 'TODOS'>('TURNO_ACTUAL');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'PAGADO' | 'ANULADO'>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Estados para edición de pedido
  const [pedidoEnEdicion, setPedidoEnEdicion] = useState<PedidoHistorial | null>(null);
  const [editCliente, setEditCliente] = useState('');
  const [editDescuento, setEditDescuento] = useState(0);
  const [editMetodoPago, setEditMetodoPago] = useState<MetodoPago>('EFECTIVO');
  const [editItems, setEditItems] = useState<
    Array<{
      producto_id: number;
      nombre: string;
      cantidad: number;
      precio_unitario: number;
      descuento_item: number;
      notas: string;
      tipos_corte: TipoCorte[];
      clave: string;
    }>
  >([]);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [busquedaPlatoEdit, setBusquedaPlatoEdit] = useState('');

  const productosFiltradosParaAgregar = useMemo(() => {
    const q = busquedaPlatoEdit.trim().toLowerCase();
    if (!q) return productosCatalogo;
    return productosCatalogo.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productosCatalogo, busquedaPlatoEdit]);

  // Estados para ver ticket
  const [pedidoParaTicket, setPedidoParaTicket] = useState<PedidoHistorial | null>(null);

  const ticketDataParaHistorial: TicketData | null = useMemo(() => {
    if (!pedidoParaTicket) return null;
    return {
      pedidoId: pedidoParaTicket.id,
      aperturaCajaId: pedidoParaTicket.apertura_caja_id,
      sucursalNombre,
      cajeroNombre: pedidoParaTicket.usuarios?.nombre_completo || 'Cajero',
      clienteNombre: pedidoParaTicket.cliente_nombre,
      numeroFicha: pedidoParaTicket.numero_ficha,
      fecha: pedidoParaTicket.created_at,
      items: (pedidoParaTicket.detalle_pedidos || []).map((det) => ({
        nombre: det.productos?.nombre || `Item #${det.producto_id}`,
        cantidad: det.cantidad,
        precio_unitario: Number(det.precio_unitario),
        subtotal: Number(det.subtotal),
        descuento_item: Number(det.descuento_item || 0),
        notas: det.notas || '',
        tipo_corte: cortesDeLinea(det.tipo_corte, det.notas),
      })),
      subtotal: Number(pedidoParaTicket.subtotal),
      descuento: Number(pedidoParaTicket.descuento || 0),
      total: Number(pedidoParaTicket.total),
      metodoPago: pedidoParaTicket.pagos?.[0]?.metodo || 'EFECTIVO',
      efectivoRecibido: Number(pedidoParaTicket.total),
      cambio: 0,
    };
  }, [pedidoParaTicket, sucursalNombre]);

  // Estados para anular pedido
  const [pedidoParaAnular, setPedidoParaAnular] = useState<PedidoHistorial | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('Error en comanda');
  const [anulando, setAnulando] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);

  const cargarPedidos = async () => {
    setCargando(true);
    try {
      const cajaIdParam = filtroCaja === 'TURNO_ACTUAL' && cajaActualId ? cajaActualId : undefined;
      const estadoParam = filtroEstado !== 'TODOS' ? filtroEstado : undefined;

      const data = await PosService.listarPedidos({
        sucursalId,
        cajaId: cajaIdParam,
        estado: estadoParam,
      });
      setPedidos(data || []);
    } catch (err: any) {
      toast.error('Error cargando historial de pedidos', {
        description: err.message,
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (abierto) {
      cargarPedidos();
    }
  }, [abierto, filtroCaja, filtroEstado, sucursalId, cajaActualId]);

  // Al abrir, lleva el foco al panel y lo devuelve al cerrar.
  useEffect(() => {
    if (!abierto) return;
    focoPrevio.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => focoPrevio.current?.focus?.();
  }, [abierto]);

  // Escape cierra el historial (salvo con una ventana encima) y Tab queda dentro.
  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (pedidoEnEdicion || pedidoParaAnular || pedidoParaTicket) return;
      if (e.key === 'Escape') {
        onCerrar();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focos = panelRef.current.querySelectorAll<HTMLElement>(
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
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [abierto, onCerrar, pedidoEnEdicion, pedidoParaAnular, pedidoParaTicket]);


  // Filtrado en vivo por texto (cliente, ficha, # comanda)
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const q = busqueda.trim().toLowerCase();
      if (!q) return true;
      const matchId = p.id.toString().includes(q) || `#${p.id}`.includes(q);
      const matchCliente = p.cliente_nombre.toLowerCase().includes(q);
      const matchFicha = p.numero_ficha
        ? `ficha ${p.numero_ficha}`.includes(q) || p.numero_ficha.toString() === q
        : false;
      return matchId || matchCliente || matchFicha;
    });
  }, [pedidos, busqueda]);

  // Métricas rápidas
  const metricas = useMemo(() => {
    const pagados = pedidosFiltrados.filter((p) => p.estado === 'PAGADO');
    const totalRecaudado = pagados.reduce((acc, p) => acc + Number(p.total), 0);
    const totalEfectivo = pagados.reduce((acc, p) => {
      const pagoEf = p.pagos?.find((pg) => pg.metodo === 'EFECTIVO');
      return acc + (pagoEf ? Number(pagoEf.monto) : 0);
    }, 0);
    const totalDigital = totalRecaudado - totalEfectivo;

    return {
      totalPedidos: pedidosFiltrados.length,
      totalRecaudado,
      totalEfectivo,
      totalDigital,
    };
  }, [pedidosFiltrados]);

  // Iniciar edición de un pedido
  const handleAbrirEdicion = (pedido: PedidoHistorial) => {
    setPedidoEnEdicion(pedido);
    setEditCliente(pedido.cliente_nombre);
    setEditDescuento(pedido.descuento || 0);

    const metodoOriginal = pedido.pagos?.[0]?.metodo || 'EFECTIVO';
    setEditMetodoPago(metodoOriginal);
    setBusquedaPlatoEdit('');

    const itemsFormateados = (pedido.detalle_pedidos || []).map((d) => {
      const cortes = cortesDeLinea(d.tipo_corte, d.notas);
      return {
        producto_id: d.producto_id,
        nombre: d.productos?.nombre || `Producto #${d.producto_id}`,
        cantidad: d.cantidad,
        precio_unitario: Number(d.precio_unitario),
        descuento_item: Number(d.descuento_item || 0),
        notas: limpiarNotas(d.notas),
        tipos_corte: cortes,
        clave: claveLinea(d.producto_id, cortes),
      };
    });
    setEditItems(itemsFormateados);
  };

  // Modificar cantidad en edición
  const handleCambiarCantidadEdit = (clave: string, delta: number) => {
    setEditItems((prev) =>
      prev
        .map((it) => {
          if (it.clave === clave) {
            const nueva = it.cantidad + delta;
            return { ...it, cantidad: nueva };
          }
          return it;
        })
        .filter((it) => it.cantidad > 0)
    );
  };

  // Añadir producto nuevo desde el catálogo durante la edición
  const handleAgregarProductoAEdicion = (prodId: number) => {
    const prod = productosCatalogo.find((p) => p.id === prodId);
    if (!prod) return;

    setEditItems((prev) => {
      const clave = claveLinea(prod.id, []);
      const existe = prev.find((it) => it.clave === clave);
      if (existe) {
        return prev.map((it) =>
          it.clave === clave ? { ...it, cantidad: it.cantidad + 1 } : it
        );
      }
      return [
        ...prev,
        {
          producto_id: prod.id,
          nombre: prod.nombre,
          cantidad: 1,
          precio_unitario: Number(prod.precio_base),
          descuento_item: 0,
          notas: '',
          tipos_corte: [],
          clave,
        },
      ];
    });
  };

  // Alternar un corte de la línea editada ("Completo" es excluyente).
  const handleAlternarCorteEdit = (clave: string, corte: TipoCorte) => {
    setEditItems((prev) =>
      prev.map((it) => {
        if (it.clave !== clave) return it;
        const sinCompleto = it.tipos_corte.filter((c) => c !== 'COMPLETO');
        const cortes =
          corte === 'COMPLETO'
            ? ['COMPLETO' as TipoCorte]
            : sinCompleto.includes(corte)
              ? sinCompleto.filter((c) => c !== corte)
              : [...sinCompleto, corte];
        return { ...it, tipos_corte: cortes, clave: claveLinea(it.producto_id, cortes) };
      })
    );
  };

  // Cálculo de totales en edición
  const subtotalEdit = useMemo(() => {
    return editItems.reduce(
      (acc, it) => acc + (it.cantidad * it.precio_unitario - it.descuento_item),
      0
    );
  }, [editItems]);
  const totalEdit = Math.max(0, subtotalEdit - editDescuento);

  // Guardar edición
  const handleGuardarEdicion = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!pedidoEnEdicion) return;

    if (editItems.length === 0) {
      toast.warning('El pedido debe tener al menos un producto.');
      return;
    }

    setGuardandoEdicion(true);
    try {
      const pedidoActualizado = await PosService.editarPedido({
        pedido_id: pedidoEnEdicion.id,
        cliente_nombre: editCliente.trim() || 'Cliente Mostrador',
        descuento: editDescuento,
        metodo_pago: editMetodoPago,
        items: editItems.map((it) => ({
          producto_id: it.producto_id,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          descuento_item: it.descuento_item,
          notas: it.notas,
          tipos_corte: it.tipos_corte,
        })),
      });

      toast.success(`Pedido #${pedidoEnEdicion.id} actualizado`, {
        description: `Nuevo total: Bs ${Number(pedidoActualizado.total).toFixed(2)}`,
      });

      // Actualizar en el estado local de pedidos
      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoEnEdicion.id ? pedidoActualizado : p))
      );
      setPedidoEnEdicion(null);
      if (onPedidoModificado) onPedidoModificado();
    } catch (err: any) {
      toast.error('Error al editar el pedido', {
        description: err.message,
      });
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // Confirmar anulación
  const handleConfirmarAnulacion = async () => {
    if (!pedidoParaAnular) return;
    setAnulando(true);

    try {
      await PosService.anularPedido({
        pedido_id: pedidoParaAnular.id,
        usuario_id: usuarioId,
        motivo: motivoAnulacion.trim() || 'Anulado desde POS',
        devolver_stock: true,
      });

      toast.success(`Pedido #${pedidoParaAnular.id} anulado`, {
        description: 'Stock devuelto a inventario.',
      });

      // Refrescar listado
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedidoParaAnular.id
            ? { ...p, estado: 'ANULADO', motivo_anulacion: motivoAnulacion }
            : p
        )
      );
      setPedidoParaAnular(null);
      if (onPedidoModificado) onPedidoModificado();
    } catch (err: any) {
      toast.error('No se pudo anular el pedido', {
        description: err.message,
      });
    } finally {
      setAnulando(false);
    }
  };

  if (!abierto) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex select-none items-stretch justify-center bg-sunken/85 backdrop-blur-sm sm:items-center sm:p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="Historial de comandas"
          ref={panelRef}
          tabIndex={-1}
          className="flex h-dvh w-full flex-col overflow-hidden border-line-strong bg-app text-ink shadow-pop outline-none sm:h-[92dvh] sm:max-w-6xl sm:rounded-panel sm:border"
        >
          {/* Cabecera */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-chrome px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden size-10 shrink-0 items-center justify-center rounded-[12px] border border-ember/30 bg-ember/10 text-ember sm:flex">
                <Receipt className="size-5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-[16px] font-bold leading-tight tracking-[-0.02em] text-ink">
                    Historial de comandas
                  </h2>
                  <Badge tono="brasa" className="hidden sm:inline-flex">
                    {sucursalNombre}
                  </Badge>
                </div>
                <p className="truncate text-[11.5px] text-ink-muted">
                  Consulta, edición y anulación de pedidos
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <IconButton
                etiqueta="Recargar historial"
                onClick={cargarPedidos}
                disabled={cargando}
                icono={
                  <RefreshCw
                    className={`size-4 ${cargando ? 'animate-spin text-ember' : ''}`}
                    strokeWidth={2.25}
                  />
                }
              />
              <IconButton
                etiqueta="Cerrar historial"
                onClick={onCerrar}
                icono={<X className="size-4.5" strokeWidth={2.25} />}
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="shrink-0 space-y-2.5 border-b border-line bg-app px-4 py-2.5 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-field border border-line bg-sunken p-0.5">
                {(
                  [
                    { id: 'TURNO_ACTUAL', label: cajaActualId ? `Turno #${cajaActualId}` : 'Turno actual' },
                    { id: 'TODOS', label: 'Todos' },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFiltroCaja(id)}
                    aria-pressed={filtroCaja === id}
                    className={`h-9 rounded-[7px] px-2.5 text-[12.5px] font-semibold transition-colors ${
                      filtroCaja === id
                        ? 'bg-raised text-ink shadow-sm'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-0.5 rounded-field border border-line bg-sunken p-0.5">
                {(
                  [
                    { id: 'TODOS', label: 'Todos' },
                    { id: 'PAGADO', label: 'Pagados' },
                    { id: 'ANULADO', label: 'Anulados' },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFiltroEstado(id)}
                    aria-pressed={filtroEstado === id}
                    className={`h-9 rounded-[7px] px-2.5 text-[12.5px] font-semibold transition-colors ${
                      filtroEstado === id
                        ? 'bg-raised text-ink shadow-sm'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
                  strokeWidth={2}
                  aria-hidden
                />
                <label htmlFor="historial-busqueda" className="sr-only">
                  Buscar comanda
                </label>
                <input
                  id="historial-busqueda"
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Cliente, ficha o # pedido"
                  autoComplete="off"
                  className="h-10 w-full rounded-field border border-line-strong bg-sunken pl-9 pr-8 text-[14px] text-ink placeholder:text-ink-faint transition-colors hover:border-control focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/25 [&::-webkit-search-cancel-button]:hidden"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:bg-raised hover:text-ink"
                  >
                    <X className="size-3.5" strokeWidth={2.5} />
                  </button>
                )}
              </div>

              <div className="ml-auto hidden items-center gap-4 border-l border-line pl-4 text-[12px] lg:flex">
                <div>
                  <span className="block text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                    Comandas
                  </span>
                  <span className="font-bold text-ink tnum">{metricas.totalPedidos}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                    Facturado
                  </span>
                  <span className="font-mono font-semibold text-ember tnum">
                    {metricas.totalRecaudado.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                    Efectivo / digital
                  </span>
                  <span className="font-mono text-ink-soft tnum">
                    {metricas.totalEfectivo.toFixed(0)} / {metricas.totalDigital.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Lista */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-sunken px-3 py-3 sm:px-5 sm:py-4">
            {cargando ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-muted">
                <RefreshCw className="size-5 animate-spin text-ember" strokeWidth={2.25} />
                <p className="text-[12.5px]">Consultando comandas…</p>
              </div>
            ) : pedidosFiltrados.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                <Receipt className="size-10 text-ink-faint" strokeWidth={1.25} />
                <div>
                  <p className="text-[14px] font-semibold text-ink">Sin comandas</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-muted">
                    {busqueda
                      ? 'Ningún resultado coincide con la búsqueda.'
                      : 'No hay pedidos en este turno o con el filtro elegido.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
                {pedidosFiltrados.map((pedido) => {
                  const esPagado = pedido.estado === 'PAGADO';
                  const esAnulado = pedido.estado === 'ANULADO';
                  const fechaObj = new Date(pedido.created_at);
                  const horaStr = fechaObj.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const metodo = pedido.pagos?.[0]?.metodo || 'EFECTIVO';
                  const IconoMetodo = iconoMetodo[metodo] || Banknote;

                  return (
                    <motion.article
                      key={pedido.id}
                      layout
                      className={`flex flex-col justify-between rounded-card border p-3.5 transition-colors ${
                        esAnulado
                          ? 'border-danger/25 bg-danger/5'
                          : 'border-line-strong bg-card hover:border-ember/40'
                      }`}
                    >
                      <div>
                        <header className="flex items-start justify-between gap-2 border-b border-line pb-2">
                          <div className="flex min-w-0 items-baseline gap-2">
                            {pedido.numero_ficha ? (
                              <>
                                <span className="stamp shrink-0 rounded-[5px] px-1.5 font-mono text-[14px] font-bold leading-5">
                                  #{String(pedido.numero_ficha).padStart(3, '0')}
                                </span>
                                <span className="truncate font-mono text-[10.5px] text-ink-muted">
                                  comanda #{pedido.id}
                                </span>
                              </>
                            ) : (
                              <span className="font-mono text-[13px] font-bold text-ink">
                                #{pedido.id.toString().padStart(4, '0')}
                              </span>
                            )}
                            <span className="flex shrink-0 items-center gap-1 text-[11px] text-ink-muted">
                              <Clock className="size-3" strokeWidth={2.25} aria-hidden />
                              {horaStr}
                            </span>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            {esPagado && (
                              <Badge tono="ok">
                                <CheckCircle2 className="size-2.5" strokeWidth={3} aria-hidden />
                                Pagado
                              </Badge>
                            )}
                            {esAnulado && (
                              <Badge tono="peligro">
                                <Ban className="size-2.5" strokeWidth={3} aria-hidden />
                                Anulado
                              </Badge>
                            )}
                          </div>
                        </header>

                        <div className="flex items-start justify-between gap-3 py-2">
                          <div className="min-w-0">
                            <span className="block text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                              Cliente
                            </span>
                            <span className="block truncate text-[13px] font-semibold text-ink">
                              {pedido.cliente_nombre || 'Cliente Mostrador'}
                            </span>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="block text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                              Turno
                            </span>
                            <span className="font-mono text-[12px] font-semibold text-ink-soft tnum">
                              #{pedido.apertura_caja_id}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1 border-t border-line py-2">
                          {(pedido.detalle_pedidos || []).map((det, idx) => {
                            const cortes = cortesDeLinea(det.tipo_corte, det.notas);
                            const nota = limpiarNotas(det.notas);
                            return (
                              <div key={idx} className="flex items-start justify-between gap-2 text-[12.5px]">
                                <span className="min-w-0 truncate text-ink-soft">
                                  <strong className="font-semibold text-ember tnum">
                                    {det.cantidad}×
                                  </strong>{' '}
                                  {det.productos?.nombre || `Item #${det.producto_id}`}
                                  {cortes.length > 0 && (
                                    <span className="ml-1 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-stamp">
                                      [{etiquetasCortes(cortes)}]
                                    </span>
                                  )}
                                  {nota && (
                                    <span className="block text-[10.5px] italic text-ink-muted">
                                      ({nota})
                                    </span>
                                  )}
                                </span>
                                <span className="shrink-0 font-mono text-[12px] text-ink-soft tnum">
                                  {Number(det.subtotal).toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {Number(pedido.descuento) > 0 && (
                          <div className="flex justify-between text-[11.5px] text-ink-muted">
                            <span>Descuento</span>
                            <span className="font-mono text-danger tnum">
                              −{Number(pedido.descuento).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      <footer className="mt-2 space-y-2 border-t border-line pt-2.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                            <IconoMetodo className="size-3.5" strokeWidth={2.25} aria-hidden />
                            {metodo}
                          </span>
                          <span className="font-mono text-[16px] font-bold text-ink tnum">
                            Bs {Number(pedido.total).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPedidoParaTicket(pedido)}
                            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-line-strong bg-raised text-[11.5px] font-semibold text-ink-soft transition-colors hover:border-control hover:text-ink"
                          >
                            <Receipt className="size-3.5 text-ember" strokeWidth={2.25} />
                            Ticket
                          </button>

                          {!esAnulado ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAbrirEdicion(pedido)}
                                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-ember/30 bg-ember/10 text-[11.5px] font-bold text-ember transition-colors hover:bg-ember/18"
                              >
                                <Edit3 className="size-3.5" strokeWidth={2.25} />
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => setPedidoParaAnular(pedido)}
                                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-danger/30 bg-danger/10 text-[11.5px] font-semibold text-danger transition-colors hover:bg-danger/18"
                              >
                                <Ban className="size-3.5" strokeWidth={2.25} />
                                Anular
                              </button>
                            </>
                          ) : (
                            <span className="flex-1 truncate px-1 text-right text-[10.5px] text-danger/80">
                              {pedido.motivo_anulacion || 'Comanda anulada'}
                            </span>
                          )}
                        </div>
                      </footer>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Edición */}
        <Modal
          abierto={!!pedidoEnEdicion}
          onCerrar={() => setPedidoEnEdicion(null)}
          titulo={`Editar comanda #${pedidoEnEdicion?.id.toString().padStart(4, '0') ?? ''}`}
          descripcion="Cambia el cliente, las cantidades o el método de pago"
          posicion="centro"
          ancho="lg"
          pie={
            <div className="flex items-center gap-2">
              <Button variante="secundaria" onClick={() => setPedidoEnEdicion(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="form-editar-pedido"
                variante="primaria"
                bloque
                cargando={guardandoEdicion}
                icono={<Save className="size-4" strokeWidth={2.25} />}
              >
                {guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          }
        >
          <form id="form-editar-pedido" onSubmit={handleGuardarEdicion} className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field etiqueta="Cliente" htmlFor="edit-cliente">
                <input
                  id="edit-cliente"
                  type="text"
                  required
                  value={editCliente}
                  onChange={(e) => setEditCliente(e.target.value)}
                  className="h-11 w-full rounded-field border border-line-strong bg-sunken px-3 text-[14px] text-ink transition-colors hover:border-control focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/25"
                />
              </Field>
              <div>
                <span className="block text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-muted">
                  Ficha
                </span>
                <div className="mt-1.5 flex h-11 items-center rounded-field border border-line bg-card px-3 font-mono text-[14px] font-bold text-ember tnum">
                  {pedidoEnEdicion?.numero_ficha
                    ? `#${String(pedidoEnEdicion.numero_ficha).padStart(3, '0')}`
                    : 'Sin ficha'}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between pb-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-muted">
                  Platos y bebidas
                </span>
                <span className="text-[11.5px] font-medium text-ember">
                  {editItems.length} {editItems.length === 1 ? 'producto' : 'productos'}
                </span>
              </div>

              <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-field border border-line bg-sunken p-2">
                {editItems.map((item) => (
                  <div key={item.clave} className="rounded-[9px] border border-line bg-card p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold text-ink">
                          {item.nombre}
                        </span>
                        <span className="font-mono text-[10.5px] text-ink-muted tnum">
                          Bs {item.precio_unitario.toFixed(2)} c/u
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <div className="flex items-center rounded-[7px] border border-line-strong bg-sunken">
                          <button
                            type="button"
                            onClick={() => handleCambiarCantidadEdit(item.clave, -1)}
                            aria-label={`Quitar una unidad de ${item.nombre}`}
                            className="flex size-8 items-center justify-center rounded-l-[6px] text-ink-soft transition-colors hover:bg-raised hover:text-ink"
                          >
                            <Minus className="size-3" strokeWidth={2.5} />
                          </button>
                          <span className="w-5 text-center font-mono text-[12px] font-bold text-ink tnum">
                            {item.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCambiarCantidadEdit(item.clave, 1)}
                            aria-label={`Agregar una unidad de ${item.nombre}`}
                            className="flex size-8 items-center justify-center rounded-r-[6px] text-ember transition-colors hover:bg-raised"
                          >
                            <Plus className="size-3" strokeWidth={2.5} />
                          </button>
                        </div>

                        <span className="min-w-14 text-right font-mono text-[12px] font-bold text-ink tnum">
                          {(item.cantidad * item.precio_unitario).toFixed(2)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCambiarCantidadEdit(item.clave, -item.cantidad)}
                          aria-label={`Quitar ${item.nombre} de la comanda`}
                          className="flex size-8 items-center justify-center rounded-[6px] text-danger transition-colors hover:bg-danger/12"
                        >
                          <Trash2 className="size-3.5" strokeWidth={2.25} />
                        </button>
                      </div>
                    </div>

                    {productoTieneCortes(item.nombre) && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {OPCIONES_CORTE.map((opt) => {
                          const activo = item.tipos_corte.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleAlternarCorteEdit(item.clave, opt.id)}
                              aria-pressed={activo}
                              className={`rounded-[6px] border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] transition-colors ${
                                activo
                                  ? 'border-ember/60 bg-ember/15 text-ember'
                                  : 'border-line-strong bg-sunken text-ink-muted hover:text-ink'
                              }`}
                            >
                              {opt.nombre}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Selector interactivo de productos */}
              <div className="space-y-2 rounded-field border border-line bg-card/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.07em] text-ink">
                    <Plus className="size-3.5 text-ember" strokeWidth={2.5} />
                    Agregar plato o bebida
                  </span>
                  <span className="text-[11px] text-ink-muted">
                    {busquedaPlatoEdit
                      ? `${productosFiltradosParaAgregar.length} encontrado(s)`
                      : 'Toca un plato para añadir'}
                  </span>
                </div>

                {/* Buscador en vivo */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-muted" />
                  <input
                    type="text"
                    value={busquedaPlatoEdit}
                    onChange={(e) => setBusquedaPlatoEdit(e.target.value)}
                    placeholder="Buscar plato o bebida (ej. Kjaras, Mixto, Cerveza)..."
                    className="h-10 w-full rounded-[8px] border border-line-strong bg-sunken pl-9 pr-8 text-[13px] text-ink placeholder:text-ink-faint transition-colors hover:border-control focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/25"
                  />
                  {busquedaPlatoEdit && (
                    <button
                      type="button"
                      onClick={() => setBusquedaPlatoEdit('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 flex size-5 items-center justify-center rounded-full text-ink-muted hover:bg-raised hover:text-ink"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Cuadrícula táctil de productos */}
                <div className="max-h-40 overflow-y-auto rounded-[8px] border border-line-strong/60 bg-sunken p-1.5">
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {productosFiltradosParaAgregar.map((prod) => {
                      const cantidadEnOrden = editItems
                        .filter((it) => it.producto_id === prod.id)
                        .reduce((acc, it) => acc + it.cantidad, 0);

                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => {
                            handleAgregarProductoAEdicion(prod.id);
                            toast.success(`Añadido: ${prod.nombre}`, { duration: 1500 });
                          }}
                          className="group relative flex flex-col justify-between rounded-[8px] border border-line bg-card p-2 text-left transition-all hover:border-ember/60 hover:bg-raised active:scale-[0.98]"
                        >
                          <div className="flex w-full items-start justify-between gap-1">
                            <span className="line-clamp-1 text-[12px] font-semibold text-ink group-hover:text-ember">
                              {prod.nombre}
                            </span>
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ember/15 text-ember group-hover:bg-ember group-hover:text-white transition-colors">
                              <Plus className="size-3" strokeWidth={2.5} />
                            </span>
                          </div>

                          <div className="mt-1.5 flex w-full items-baseline justify-between">
                            <span className="font-mono text-[11.5px] font-bold text-ember tnum">
                              Bs {Number(prod.precio_base).toFixed(2)}
                            </span>
                            {cantidadEnOrden > 0 && (
                              <span className="rounded bg-ok/15 px-1 py-0.5 font-mono text-[9.5px] font-bold text-ok tnum">
                                {cantidadEnOrden} en comanda
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {productosFiltradosParaAgregar.length === 0 && (
                    <div className="py-4 text-center text-[12px] text-ink-muted">
                      No se encontraron platos para «{busquedaPlatoEdit}»
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-line pt-3">
              <div>
                <span className="block text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-muted">
                  Método de pago
                </span>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {(['EFECTIVO', 'QR', 'TARJETA', 'TRANSFERENCIA'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEditMetodoPago(m)}
                      aria-pressed={editMetodoPago === m}
                      className={`h-9 rounded-[8px] border text-[10.5px] font-bold uppercase tracking-[0.04em] transition-colors ${
                        editMetodoPago === m
                          ? 'border-ember/50 bg-ember/12 text-ember'
                          : 'border-line-strong bg-sunken text-ink-muted hover:text-ink'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Field etiqueta="Descuento global" htmlFor="edit-descuento">
                  <input
                    id="edit-descuento"
                    type="number"
                    min="0"
                    step="0.5"
                    value={editDescuento}
                    onChange={(e) => setEditDescuento(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="h-11 w-full rounded-field border border-line-strong bg-sunken px-3 font-mono text-[15px] text-ink tnum transition-colors hover:border-control focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/25"
                  />
                </Field>
                <div className="mt-2 flex items-baseline justify-between rounded-field border border-line bg-card px-3 py-2">
                  <span className="text-[11.5px] text-ink-muted">Nuevo total</span>
                  <span className="font-mono text-[15px] font-bold text-ember tnum">
                    {totalEdit.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </form>
        </Modal>

        {/* Anulación */}
        <Modal
          abierto={!!pedidoParaAnular}
          onCerrar={() => setPedidoParaAnular(null)}
          titulo={`Anular comanda #${pedidoParaAnular?.id.toString().padStart(4, '0') ?? ''}`}
          descripcion={`Total Bs ${Number(pedidoParaAnular?.total ?? 0).toFixed(2)}`}
          posicion="centro"
          ancho="md"
          pie={
            <div className="flex items-center gap-2">
              <Button variante="secundaria" onClick={() => setPedidoParaAnular(null)}>
                Cancelar
              </Button>
              <Button
                variante="peligro"
                bloque
                cargando={anulando}
                onClick={handleConfirmarAnulacion}
                icono={<Ban className="size-4" strokeWidth={2.5} />}
              >
                {anulando ? 'Anulando…' : 'Confirmar anulación'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 p-5">
            <p className="text-[13px] leading-5 text-ink-soft">
              La comanda pasará a <strong className="font-semibold text-ink">ANULADO</strong> y el
              stock de cada plato volverá al inventario de la sucursal.
            </p>
            <Field etiqueta="Motivo" htmlFor="motivo-anulacion">
              <input
                id="motivo-anulacion"
                type="text"
                required
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                placeholder="Error en la comanda, el cliente canceló…"
                className="h-11 w-full rounded-field border border-line-strong bg-sunken px-3 text-[14px] text-ink placeholder:text-ink-faint transition-colors hover:border-control focus-visible:border-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/25"
              />
            </Field>
          </div>
        </Modal>

        {/* Ticket */}
        <PosTicketModal
          ticket={ticketDataParaHistorial}
          isOpen={!!pedidoParaTicket}
          onClose={() => setPedidoParaTicket(null)}
          autoPrint={false}
        />
      </div>
    </AnimatePresence>
  );
}
