import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import {
  TrendingUp, AlertOctagon, Ban, ArrowUpRight,
  ArrowDownRight, ShieldAlert, PlusCircle, History, X
} from 'lucide-react';
import { PosService, type TipoMovimientoInv } from '../../services/pos.service';

interface PedidoDashboard {
  id: number;
  cliente_nombre: string;
  numero_mesa: number | null;
  total: number;
  estado: 'PENDIENTE' | 'PAGADO' | 'ANULADO';
  created_at: string;
}

interface MovimientoKardex {
  id: number;
  producto_nombre: string;
  tipo: string;
  cantidad: number;
  stock_anterior: number;
  stock_resultante: number;
  motivo: string;
  created_at: string;
}

interface Props {
  sucursalId: number;
  adminUsuarioId: string;
  pedidosIniciales: PedidoDashboard[];
  kardexInicial: MovimientoKardex[];
  productosStock: { id: number; nombre: string; stock_actual: number; stock_minimo: number }[];
}

export default function AdminDashboard({
  sucursalId,
  adminUsuarioId,
  pedidosIniciales,
  kardexInicial,
  productosStock,
}: Props) {
  const [pedidos, setPedidos] = useState<PedidoDashboard[]>(pedidosIniciales);
  const [kardex] = useState<MovimientoKardex[]>(kardexInicial);

  // Estados de Modales
  const [pedidoAAnular, setPedidoAAnular] = useState<PedidoDashboard | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [devolverStock, setDevolverStock] = useState(true);

  const [modalAjusteAbierto, setModalAjusteAbierto] = useState(false);
  const [productoAjusteId, setProductoAjusteId] = useState<number>(productosStock[0]?.id || 1);
  const [tipoAjuste, setTipoAjuste] = useState<TipoMovimientoInv>('ENTRADA_ABASTECIMIENTO');
  const [cantidadAjuste, setCantidadAjuste] = useState<number>(10);
  const [motivoAjuste, setMotivoAjuste] = useState('');

  // Métricas
  const totalRecaudado = pedidos
    .filter((p) => p.estado === 'PAGADO')
    .reduce((acc, p) => acc + Number(p.total), 0);
  const totalAnulados = pedidos.filter((p) => p.estado === 'ANULADO').length;
  const productosCriticos = productosStock.filter((p) => p.stock_actual <= p.stock_minimo);

  // Ejecutar Anulación
  const confirmarAnulacion = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!pedidoAAnular) return;

    const promesa = PosService.anularPedido({
      pedido_id: pedidoAAnular.id,
      usuario_id: adminUsuarioId,
      motivo: motivoAnulacion,
      devolver_stock: devolverStock,
    });

    toast.promise(promesa, {
      loading: 'Anulando y reintegrando inventario al Kardex...',
      success: () => {
        setPedidos((prev) =>
          prev.map((p) => (p.id === pedidoAAnular.id ? { ...p, estado: 'ANULADO' } : p))
        );
        setPedidoAAnular(null);
        setMotivoAnulacion('');
        return `Comanda #${pedidoAAnular.id} anulada con éxito`;
      },
      error: (err) => err.message,
    });
  };

  // Ejecutar Abastecimiento o Merma
  const confirmarAjusteInventario = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const promesa = PosService.ajustarInventario({
      sucursal_id: sucursalId,
      producto_id: productoAjusteId,
      usuario_id: adminUsuarioId,
      tipo: tipoAjuste,
      cantidad: cantidadAjuste,
      motivo: motivoAjuste,
    });

    toast.promise(promesa, {
      loading: 'Registrando ajuste en Kardex...',
      success: () => {
        setModalAjusteAbierto(false);
        setMotivoAjuste('');
        return 'Movimiento registrado en Kardex';
      },
      error: (err) => err.message,
    });
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <Toaster position="top-right" richColors theme="dark" />

      {/* Cabecera y Acción Rápida */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-amber-500 tracking-wide uppercase">
            Sucursal #{sucursalId} • Control Operativo
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-0.5">
            Monitor de Ventas y Kardex
          </h1>
        </div>

        <button
          onClick={() => setModalAjusteAbierto(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-600/20 transition self-start"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Ajustar Stock / Entrada</span>
        </button>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#1a1715] border border-[#2b2520] space-y-2">
          <div className="flex justify-between items-center text-[#9c907f] text-xs">
            <span>Ventas Netas Turno</span>
            <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white num-tabular">Bs {totalRecaudado.toFixed(2)}</p>
          <span className="text-[11px] text-[#7a6f5f]">Comandas cobradas en caja</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#1a1715] border border-[#2b2520] space-y-2">
          <div className="flex justify-between items-center text-[#9c907f] text-xs">
            <span>Comandas Emitidas</span>
            <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-800/40 text-amber-400">
              <History className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white num-tabular">{pedidos.length}</p>
          <span className="text-[11px] text-[#7a6f5f]">Total registradas en turno</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#1a1715] border border-[#2b2520] space-y-2">
          <div className="flex justify-between items-center text-[#9c907f] text-xs">
            <span>Comandas Anuladas</span>
            <div className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-800/40 text-rose-400">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-400 num-tabular">{totalAnulados}</p>
          <span className="text-[11px] text-[#7a6f5f]">Reversiones registradas</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#1a1715] border border-[#2b2520] space-y-2">
          <div className="flex justify-between items-center text-[#9c907f] text-xs">
            <span>Stock Crítico</span>
            <div className="p-1.5 rounded-lg bg-orange-950/60 border border-orange-800/40 text-amber-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-400 num-tabular">{productosCriticos.length}</p>
          <span className="text-[11px] text-[#7a6f5f]">Platos bajo nivel mínimo</span>
        </div>
      </div>

      {/* Grilla Principal: Pedidos Recientes & Kardex */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla de Pedidos */}
        <div className="bg-[#1a1715] border border-[#2b2520] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#2b2520] flex justify-between items-center">
            <h2 className="font-bold text-sm text-white">Últimas Comandas de Turno</h2>
            <span className="text-[11px] text-[#7a6f5f]">Top 25 registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#29231e] text-[#8c806f] uppercase tracking-wider bg-[#141210]">
                  <th className="py-3 px-4 font-semibold">Comanda</th>
                  <th className="py-3 px-4 font-semibold">Cliente</th>
                  <th className="py-3 px-4 font-semibold">Total</th>
                  <th className="py-3 px-4 font-semibold">Estado</th>
                  <th className="py-3 px-4 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26211c]">
                {pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#6e6355]">
                      No hay comandas registradas hoy.
                    </td>
                  </tr>
                ) : (
                  pedidos.map((p) => (
                    <tr key={p.id} className="hover:bg-[#201d19] transition">
                      <td className="py-3 px-4 font-bold text-amber-400">#{p.id}</td>
                      <td className="py-3 px-4 text-[#ede7dc]">
                        <div>{p.cliente_nombre}</div>
                        {p.numero_mesa && (
                          <span className="text-[10px] text-[#8c806f]">Mesa {p.numero_mesa}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-white num-tabular">
                        Bs {Number(p.total).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.estado === 'PAGADO'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : p.estado === 'ANULADO'
                              ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                              : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                          }`}
                        >
                          {p.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.estado !== 'ANULADO' && (
                          <button
                            onClick={() => setPedidoAAnular(p)}
                            className="px-2 py-1 rounded-lg bg-rose-950/30 text-rose-400 hover:bg-rose-900/40 border border-rose-800/40 text-[11px] font-semibold transition"
                          >
                            Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla Kardex */}
        <div className="bg-[#1a1715] border border-[#2b2520] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#2b2520] flex justify-between items-center">
            <h2 className="font-bold text-sm text-white">Movimientos Kardex en Vivo</h2>
            <span className="text-[11px] text-[#7a6f5f]">Trazabilidad estricta</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#29231e] text-[#8c806f] uppercase tracking-wider bg-[#141210]">
                  <th className="py-3 px-4 font-semibold">Producto</th>
                  <th className="py-3 px-4 font-semibold">Tipo</th>
                  <th className="py-3 px-4 font-semibold">Cant.</th>
                  <th className="py-3 px-4 font-semibold">Stock Ant &rarr; Nuevo</th>
                  <th className="py-3 px-4 font-semibold">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26211c]">
                {kardex.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#6e6355]">
                      Sin movimientos de Kardex registrados.
                    </td>
                  </tr>
                ) : (
                  kardex.map((k) => (
                    <tr key={k.id} className="hover:bg-[#201d19] transition">
                      <td className="py-3 px-4 font-medium text-[#ede7dc]">{k.producto_nombre}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-[10px] ${
                            k.tipo.includes('ENTRADA') || k.tipo.includes('DEVOLUCION')
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {k.tipo.includes('ENTRADA') || k.tipo.includes('DEVOLUCION') ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {k.tipo.split('_')[0]}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white num-tabular">{k.cantidad}</td>
                      <td className="py-3 px-4 text-[#9c907f] num-tabular text-[11px]">
                        {k.stock_anterior} &rarr;{' '}
                        <span className="font-bold text-white">{k.stock_resultante}</span>
                      </td>
                      <td className="py-3 px-4 text-[#8c806f] text-[11px] truncate max-w-[120px]">
                        {k.motivo}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Anular Pedido */}
      <AnimatePresence>
        {pedidoAAnular && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-[#181614] border border-[#2e2721] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Anular Comanda #{pedidoAAnular.id}</span>
                </h3>
                <button onClick={() => setPedidoAAnular(null)} className="text-[#7a6f5f] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={confirmarAnulacion} className="space-y-4">
                <p className="text-xs text-[#9c907f] leading-relaxed">
                  Esta acción revertirá los pagos en caja y devolverá los productos vendidos al Kardex.
                </p>

                <div>
                  <label className="text-xs text-[#ede7dc]">Motivo de la Anulación</label>
                  <textarea
                    required
                    rows={2}
                    value={motivoAnulacion}
                    onChange={(e) => setMotivoAnulacion(e.target.value)}
                    placeholder="Ej. Error de digitación, cliente canceló mesa..."
                    className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2e2721] rounded-xl text-xs text-white placeholder-[#6e6355] focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="stockCheck"
                    checked={devolverStock}
                    onChange={(e) => setDevolverStock(e.target.checked)}
                    className="rounded bg-[#100f0e] border-[#2e2721] text-amber-600 focus:ring-0"
                  />
                  <label htmlFor="stockCheck" className="text-xs text-[#ede7dc] select-none">
                    Devolver automáticamente el stock al inventario
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs transition"
                >
                  Confirmar Anulación y Reversión
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Ajuste Stock */}
      <AnimatePresence>
        {modalAjusteAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-[#181614] border border-[#2e2721] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white">Ajuste Manual de Inventario</h3>
                <button onClick={() => setModalAjusteAbierto(false)} className="text-[#7a6f5f] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={confirmarAjusteInventario} className="space-y-3.5">
                <div>
                  <label className="text-xs text-[#ede7dc]">Producto</label>
                  <select
                    value={productoAjusteId}
                    onChange={(e) => setProductoAjusteId(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2e2721] rounded-xl text-xs text-white focus:outline-none focus:border-amber-600"
                  >
                    {productosStock.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} (Stock actual: {p.stock_actual} uds)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#ede7dc]">Tipo de Movimiento</label>
                    <select
                      value={tipoAjuste}
                      onChange={(e) => setTipoAjuste(e.target.value as TipoMovimientoInv)}
                      className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2e2721] rounded-xl text-xs text-white focus:outline-none focus:border-amber-600"
                    >
                      <option value="ENTRADA_ABASTECIMIENTO">Entrada Abastecimiento (+)</option>
                      <option value="AJUSTE_POSITIVO">Ajuste Positivo (+)</option>
                      <option value="AJUSTE_MERMA">Ajuste Merma / Dañado (-)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-[#ede7dc]">Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={cantidadAjuste}
                      onChange={(e) => setCantidadAjuste(parseInt(e.target.value) || 1)}
                      className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2e2721] rounded-xl text-xs text-white num-tabular focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#ede7dc]">Motivo / Comprobante</label>
                  <input
                    type="text"
                    required
                    value={motivoAjuste}
                    onChange={(e) => setMotivoAjuste(e.target.value)}
                    placeholder="Ej. Ingreso de insumos según remisión #45"
                    className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2e2721] rounded-xl text-xs text-white placeholder-[#6e6355] focus:outline-none focus:border-amber-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs transition"
                >
                  Registrar en Kardex
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}