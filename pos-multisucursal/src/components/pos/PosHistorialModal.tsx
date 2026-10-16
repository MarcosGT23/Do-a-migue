import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  X, Search, Receipt, Edit3, Ban, CheckCircle2, AlertCircle,
  Plus, Minus, Trash2, RefreshCw, Clock, User, Hash,
  Banknote, QrCode, CreditCard, Building2, Flame, Printer,
  Save, Utensils
} from 'lucide-react';
import { PosService, type MetodoPago } from '../../services/pos.service';
import PosTicketModal, { type TicketData } from './PosTicketModal';

export interface DetallePedido {
  id?: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  descuento_item?: number;
  subtotal: number;
  notas?: string;
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
  numero_mesa: number | null;
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
  const [editMesa, setEditMesa] = useState('');
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
    }>
  >([]);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

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
      numeroMesa: pedidoParaTicket.numero_mesa,
      fecha: pedidoParaTicket.created_at,
      items: (pedidoParaTicket.detalle_pedidos || []).map((det) => ({
        nombre: det.productos?.nombre || `Item #${det.producto_id}`,
        cantidad: det.cantidad,
        precio_unitario: Number(det.precio_unitario),
        subtotal: Number(det.subtotal),
        descuento_item: Number(det.descuento_item || 0),
        notas: det.notas || '',
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

  // Filtrado en vivo por texto (cliente, mesa, # comanda)
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const q = busqueda.trim().toLowerCase();
      if (!q) return true;
      const matchId = p.id.toString().includes(q) || `#${p.id}`.includes(q);
      const matchCliente = p.cliente_nombre.toLowerCase().includes(q);
      const matchMesa = p.numero_mesa ? `mesa ${p.numero_mesa}`.includes(q) || p.numero_mesa.toString() === q : false;
      return matchId || matchCliente || matchMesa;
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
    setEditMesa(pedido.numero_mesa ? String(pedido.numero_mesa) : '');
    setEditDescuento(pedido.descuento || 0);

    const metodoOriginal = pedido.pagos?.[0]?.metodo || 'EFECTIVO';
    setEditMetodoPago(metodoOriginal);

    const itemsFormateados = (pedido.detalle_pedidos || []).map((d) => ({
      producto_id: d.producto_id,
      nombre: d.productos?.nombre || `Producto #${d.producto_id}`,
      cantidad: d.cantidad,
      precio_unitario: Number(d.precio_unitario),
      descuento_item: Number(d.descuento_item || 0),
      notas: d.notas || '',
    }));
    setEditItems(itemsFormateados);
  };

  // Modificar cantidad en edición
  const handleCambiarCantidadEdit = (productoId: number, delta: number) => {
    setEditItems((prev) =>
      prev
        .map((it) => {
          if (it.producto_id === productoId) {
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
      const existe = prev.find((it) => it.producto_id === prodId);
      if (existe) {
        return prev.map((it) =>
          it.producto_id === prodId ? { ...it, cantidad: it.cantidad + 1 } : it
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
        },
      ];
    });
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
        numero_mesa: editMesa ? parseInt(editMesa) : null,
        descuento: editDescuento,
        metodo_pago: editMetodoPago,
        items: editItems.map((it) => ({
          producto_id: it.producto_id,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          descuento_item: it.descuento_item,
          notas: it.notas,
        })),
      });

      toast.success(`¡Pedido #${pedidoEnEdicion.id} editado exitosamente!`, {
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
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-[#161412] border border-[#2e2721] rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[#ede7dc]"
        >
          {/* HEADER PRINCIPAL */}
          <div className="px-6 py-4 bg-[#1a1715] border-b border-[#2b2520] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-600/30 to-orange-700/20 border border-amber-600/40 text-amber-500 flex items-center justify-center shadow-inner">
                <Receipt className="w-5 h-5 fill-amber-500/20" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">Historial de Comandas y Registros</h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#28211b] text-amber-400 border border-amber-600/30">
                    {sucursalNombre}
                  </span>
                </div>
                <p className="text-xs text-[#9e9382]">
                  Consulta, edición de productos y detalles contables de pedidos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={cargarPedidos}
                disabled={cargando}
                className="p-2.5 rounded-xl bg-[#221d19] hover:bg-[#2e2722] text-[#c2b4a3] border border-[#382d24] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Recargar historial"
              >
                <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin text-amber-400' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>

              <button
                type="button"
                onClick={onCerrar}
                className="p-2 rounded-xl bg-[#221d19] hover:bg-rose-950/40 text-[#a89b88] hover:text-white border border-[#382d24] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* BARRA DE FILTROS, MÉTRICAS Y BÚSQUEDA */}
          <div className="px-6 py-3.5 bg-[#141210] border-b border-[#26201b] flex flex-wrap items-center justify-between gap-4 shrink-0">
            {/* Filtros de Caja y Estado */}
            <div className="flex items-center gap-2">
              <div className="flex bg-[#1d1916] p-1 rounded-xl border border-[#2c241e]">
                <button
                  type="button"
                  onClick={() => setFiltroCaja('TURNO_ACTUAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filtroCaja === 'TURNO_ACTUAL'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-[#9c907f] hover:text-white'
                  }`}
                >
                  Turno Actual {cajaActualId ? `(#${cajaActualId})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroCaja('TODOS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filtroCaja === 'TODOS'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-[#9c907f] hover:text-white'
                  }`}
                >
                  Todos los Turnos
                </button>
              </div>

              <div className="flex bg-[#1d1916] p-1 rounded-xl border border-[#2c241e]">
                {(['TODOS', 'PAGADO', 'ANULADO'] as const).map((est) => (
                  <button
                    key={est}
                    type="button"
                    onClick={() => setFiltroEstado(est)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      filtroEstado === est
                        ? 'bg-[#2d251e] text-amber-400 border border-amber-600/30'
                        : 'text-[#9c907f] hover:text-white'
                    }`}
                  >
                    {est === 'TODOS' ? 'Todos' : est === 'PAGADO' ? 'Pagados' : 'Anulados'}
                  </button>
                ))}
              </div>
            </div>

            {/* Buscador */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-[#7a6f5f] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por cliente, mesa, # pedido..."
                className="w-full pl-9 pr-4 py-2 bg-[#1a1715] border border-[#2e2721] rounded-xl text-xs text-white placeholder-[#6e6355] focus:outline-none focus:border-amber-600"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a6f5f] hover:text-white text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {/* Mini Dashboard de Métricas */}
            <div className="hidden lg:flex items-center gap-4 text-xs pl-2 border-l border-[#2e2721]">
              <div>
                <span className="text-[#8c806f] block text-[10px] uppercase">Comandas</span>
                <span className="font-bold text-white">{metricas.totalPedidos}</span>
              </div>
              <div>
                <span className="text-[#8c806f] block text-[10px] uppercase">Total Facturado</span>
                <span className="font-extrabold text-amber-400">Bs {metricas.totalRecaudado.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#8c806f] block text-[10px] uppercase">Efectivo / Digital</span>
                <span className="font-semibold text-[#b8ad9c]">
                  Bs {metricas.totalEfectivo.toFixed(0)} / Bs {metricas.totalDigital.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {/* LISTA DE PEDIDOS */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#11100e]">
            {cargando ? (
              <div className="h-full flex flex-col items-center justify-center text-[#8c806f] space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                <p className="text-xs">Consultando comandas registradas...</p>
              </div>
            ) : pedidosFiltrados.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#8c806f] space-y-3 py-16">
                <Receipt className="w-12 h-12 stroke-[1.2] text-[#4d4339]" />
                <div className="text-center">
                  <p className="text-sm font-bold text-[#ede7dc]">No se encontraron pedidos registrados</p>
                  <p className="text-xs text-[#8c806f]">
                    {busqueda
                      ? 'Ningún resultado coincide con tu búsqueda.'
                      : 'No hay pedidos en este turno o con el filtro seleccionado.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {pedidosFiltrados.map((pedido) => {
                  const esPagado = pedido.estado === 'PAGADO';
                  const esAnulado = pedido.estado === 'ANULADO';
                  const fechaObj = new Date(pedido.created_at);
                  const horaStr = fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const metodo = pedido.pagos?.[0]?.metodo || 'EFECTIVO';

                  return (
                    <motion.div
                      key={pedido.id}
                      layout
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        esAnulado
                          ? 'bg-[#181313] border-rose-950/60 opacity-75'
                          : 'bg-[#181513] border-[#29221c] hover:border-amber-600/40 shadow-md'
                      }`}
                    >
                      {/* Cabecera de la tarjeta */}
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#26201a]">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-white text-sm">
                              #{pedido.id.toString().padStart(4, '0')}
                            </span>
                            <span className="text-[10px] text-[#9c907f] flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {horaStr}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {esPagado && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-600/30 text-[10px] font-bold uppercase">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Pagado
                              </span>
                            )}
                            {esAnulado && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/60 text-rose-400 border border-rose-800/40 text-[10px] font-bold uppercase">
                                <Ban className="w-2.5 h-2.5" /> Anulado
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Datos del Cliente y Mesa */}
                        <div className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[#8c806f] text-[10px] uppercase block">Cliente</span>
                            <span className="font-bold text-[#ede7dc] truncate block max-w-[150px]">
                              {pedido.cliente_nombre || 'Cliente Mostrador'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#8c806f] text-[10px] uppercase block">Ubicación</span>
                            <span className="font-semibold text-amber-400">
                              {pedido.numero_mesa ? `Mesa #${pedido.numero_mesa}` : 'Mostrador'}
                            </span>
                          </div>
                        </div>

                        {/* Desglose de Platos */}
                        <div className="py-2 space-y-1 border-t border-[#241f1a]">
                          {(pedido.detalle_pedidos || []).map((det, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="text-[#cfc4b4] truncate max-w-[190px]">
                                <strong className="text-amber-500 font-bold">{det.cantidad}x</strong>{' '}
                                {det.productos?.nombre || `Item #${det.producto_id}`}
                                {det.notas ? <em className="text-[10px] text-[#8c806f] block">({det.notas})</em> : null}
                              </span>
                              <span className="num-tabular text-[#a89b88] font-medium">
                                Bs {Number(det.subtotal).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Info de Descuento si hubo */}
                        {Number(pedido.descuento) > 0 && (
                          <div className="flex justify-between text-[11px] text-[#9c907f] pt-1">
                            <span>Descuento aplicado:</span>
                            <span className="text-rose-400 num-tabular">- Bs {Number(pedido.descuento).toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {/* Pie de la tarjeta: Total y Botones */}
                      <div className="pt-3 border-t border-[#26201a] mt-2 space-y-2.5">
                        <div className="flex justify-between items-baseline">
                          <div className="flex items-center gap-1.5 text-xs text-[#9c907f]">
                            {metodo === 'EFECTIVO' ? (
                              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                            ) : metodo === 'QR' ? (
                              <QrCode className="w-3.5 h-3.5 text-blue-400" />
                            ) : (
                              <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                            )}
                            <span className="text-[11px] font-semibold text-[#cfc4b4]">{metodo}</span>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-extrabold text-white num-tabular">
                              Bs {Number(pedido.total).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setPedidoParaTicket(pedido)}
                            className="py-1.5 px-2 rounded-xl bg-[#221d19] hover:bg-[#2b2520] text-[#c2b4a3] border border-[#362b22] text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                            title="Ver Comprobante Ticket"
                          >
                            <Receipt className="w-3 h-3 text-amber-500" />
                            <span>Ticket</span>
                          </button>

                          {!esAnulado ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAbrirEdicion(pedido)}
                                className="py-1.5 px-2 rounded-xl bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border border-amber-600/30 text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                                title="Editar pedido"
                              >
                                <Edit3 className="w-3 h-3 text-amber-400" />
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setPedidoParaAnular(pedido)}
                                className="py-1.5 px-2 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border border-rose-900/30 text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                                title="Anular pedido"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Anular</span>
                              </button>
                            </>
                          ) : (
                            <div className="col-span-2 text-center text-[10px] text-rose-400/80 font-medium py-1">
                              {pedido.motivo_anulacion ? `Motivo: ${pedido.motivo_anulacion}` : 'Comanda anulada'}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* MODAL PARA EDITAR PEDIDO */}
        {pedidoEnEdicion && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#181614] border border-[#332b24] rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl text-[#ede7dc]"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[#29221b]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-600/30">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Editar Pedido #{pedidoEnEdicion.id.toString().padStart(4, '0')}
                    </h3>
                    <p className="text-[11px] text-[#9c907f]">
                      Modifica cliente, mesa, cantidades de platos o método de pago
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPedidoEnEdicion(null)}
                  className="text-[#7a6f5f] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGuardarEdicion} className="space-y-4">
                {/* Datos del Cliente y Mesa */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#9c907f] font-semibold">Cliente</label>
                    <input
                      type="text"
                      required
                      value={editCliente}
                      onChange={(e) => setEditCliente(e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2e2721] rounded-xl text-xs text-white focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9c907f] font-semibold">Mesa # (opcional)</label>
                    <input
                      type="number"
                      value={editMesa}
                      onChange={(e) => setEditMesa(e.target.value)}
                      placeholder="Mostrador si está vacío"
                      className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2e2721] rounded-xl text-xs text-white focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Listado de Items en Edición */}
                <div>
                  <div className="flex justify-between items-center pb-1">
                    <label className="text-xs text-[#9c907f] font-semibold">
                      Platos y Bebidas del Pedido
                    </label>
                    <span className="text-[11px] text-amber-400 font-medium">
                      {editItems.length} {editItems.length === 1 ? 'producto' : 'productos'}
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-[#100f0e] rounded-xl border border-[#28221c]">
                    {editItems.map((item) => (
                      <div
                        key={item.producto_id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#181513] border border-[#26201a]"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <span className="text-xs font-semibold text-white block truncate">
                            {item.nombre}
                          </span>
                          <span className="text-[10px] text-[#8c806f]">
                            Bs {item.precio_unitario.toFixed(2)} c/u
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5 bg-[#100f0e] px-1.5 py-0.5 rounded-lg border border-[#2e2721]">
                            <button
                              type="button"
                              onClick={() => handleCambiarCantidadEdit(item.producto_id, -1)}
                              className="p-1 hover:text-rose-400 text-[#a89b88]"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-extrabold text-xs text-amber-400 min-w-[20px] text-center num-tabular">
                              {item.cantidad}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCambiarCantidadEdit(item.producto_id, 1)}
                              className="p-1 hover:text-emerald-400 text-[#a89b88]"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="text-xs font-bold text-white num-tabular min-w-[55px] text-right">
                            Bs {(item.cantidad * item.precio_unitario).toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCambiarCantidadEdit(item.producto_id, -item.cantidad)}
                            className="p-1.5 text-rose-400 hover:text-rose-300"
                            title="Quitar plato"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Selector rápido para agregar más productos del menú */}
                  <div className="pt-2 flex items-center gap-2">
                    <span className="text-[11px] text-[#8c806f] shrink-0">Agregar plato:</span>
                    <select
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        if (id) {
                          handleAgregarProductoAEdicion(id);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                      className="flex-1 px-3 py-1.5 bg-[#100f0e] border border-[#2e2721] rounded-xl text-xs text-[#ede7dc] focus:border-amber-600 focus:outline-none"
                    >
                      <option value="" disabled>
                        + Selecciona un plato o bebida para añadir...
                      </option>
                      {productosCatalogo.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.nombre} (Bs {Number(prod.precio_base).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Descuento y Método de Pago */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#26201a]">
                  <div>
                    <label className="text-xs text-[#9c907f] font-semibold">Método de Pago</label>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {(['EFECTIVO', 'QR', 'TARJETA', 'TRANSFERENCIA'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setEditMetodoPago(m)}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition ${
                            editMetodoPago === m
                              ? 'bg-amber-600/30 text-amber-300 border-amber-600/60'
                              : 'bg-[#100f0e] text-[#8c806f] border-[#29221c] hover:text-white'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#9c907f] font-semibold">Descuento Global (Bs)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editDescuento}
                      onChange={(e) => setEditDescuento(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2e2721] rounded-xl text-xs text-white num-tabular focus:border-amber-600 focus:outline-none"
                    />

                    <div className="p-2.5 mt-2 rounded-xl bg-[#100f0e] border border-[#2e2721] flex justify-between items-center text-xs">
                      <span className="text-[#9c907f]">Nuevo Total:</span>
                      <span className="text-base font-extrabold text-amber-400 num-tabular">
                        Bs {totalEdit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botones de Confirmación */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPedidoEnEdicion(null)}
                    className="flex-1 py-2.5 rounded-xl bg-[#241f1c] hover:bg-[#302925] text-white font-semibold text-xs transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoEdicion}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs shadow-md shadow-orange-600/20 flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{guardandoEdicion ? 'Guardando...' : 'Guardar Cambios del Pedido'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL COMPROBANTE TICKET */}
        <PosTicketModal
          ticket={ticketDataParaHistorial}
          isOpen={!!pedidoParaTicket}
          onClose={() => setPedidoParaTicket(null)}
          autoPrint={false}
        />


        {/* MODAL PARA ANULAR PEDIDO */}
        {pedidoParaAnular && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#181614] border border-rose-900/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-[#ede7dc]"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-2xl bg-rose-950/60 border border-rose-800/40 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Anular Pedido #{pedidoParaAnular.id.toString().padStart(4, '0')}
                  </h3>
                  <p className="text-xs text-[#9c907f]">Total: Bs {Number(pedidoParaAnular.total).toFixed(2)}</p>
                </div>
              </div>

              <p className="text-xs text-[#c4b5a3] leading-relaxed">
                ¿Estás seguro de anular esta comanda? El estado pasará a <strong>ANULADO</strong> y se reintegrará automáticamente el stock de los productos al inventario de la sucursal.
              </p>

              <div>
                <label className="text-xs text-[#9c907f] font-semibold">Motivo de la Anulación</label>
                <input
                  type="text"
                  required
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  placeholder="Ej. Error en mesa, cliente canceló, etc."
                  className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2e2721] rounded-xl text-xs text-white focus:border-rose-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPedidoParaAnular(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#241f1c] hover:bg-[#302925] text-white font-semibold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarAnulacion}
                  disabled={anulando}
                  className="flex-1 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-extrabold text-xs shadow-md shadow-rose-900/30 flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{anulando ? 'Anulando...' : 'Confirmar Anulación'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
