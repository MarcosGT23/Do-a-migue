import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import { 
  ShoppingCart, Plus, Minus, Trash2, CreditCard, QrCode, 
  Banknote, Building2, Unlock, Lock as LockIcon, X, Receipt, Shield, Utensils,
  Flame, LogOut
} from 'lucide-react';
import { PosService, type MetodoPago } from '../../services/pos.service';
import PosHeader from './PosHeader';
import PosHistorialModal from './PosHistorialModal';
import PosTicketModal, { type TicketData } from './PosTicketModal';

interface ProductoPOS {
  id: number;
  categoria_id: number;
  nombre: string;
  precio_base: number;
  imagen_url?: string;
  stock_actual: number;
  stock_minimo: number;
}

interface CartItem extends ProductoPOS {
  cantidad: number;
  descuento_item: number;
  notas: string;
}

interface Props {
  cajaActivaId: number | null;
  cajaInicialInfo?: any | null;
  sucursalId: number;
  usuarioId: string;
  cajeroNombre: string;
  rol: string;
  esAdminOSupervisor: boolean;
  sucursalNombre: string;
  categoriasIniciales: { id: number; nombre: string }[];
  productosIniciales: ProductoPOS[];
}

export default function PosTerminal({
  cajaActivaId: cajaInicialId,
  cajaInicialInfo,
  sucursalId,
  usuarioId,
  cajeroNombre,
  rol,
  esAdminOSupervisor,
  sucursalNombre,
  categoriasIniciales,
  productosIniciales,
}: Props) {
  const [cajaId, setCajaId] = useState<number | null>(cajaInicialId);
  const [cajaInfo, setCajaInfo] = useState<any | null>(cajaInicialInfo || null);
  const [montoApertura, setMontoApertura] = useState<string>('200');
  const [abriendoCaja, setAbriendoCaja] = useState(false);

  const [productos, setProductos] = useState<ProductoPOS[]>(productosIniciales);
  const [categoriaActiva, setCategoriaActiva] = useState<number | 'TODAS'>('TODAS');
  const [busqueda, setBusqueda] = useState('');

  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [clienteNombre, setClienteNombre] = useState('');
  const [numeroMesa, setNumeroMesa] = useState<string>('');
  const [descuentoGlobal, setDescuentoGlobal] = useState<number>(0);

  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [modalCierreAbierto, setModalCierreAbierto] = useState(false);
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  const [modalTicketAbierto, setModalTicketAbierto] = useState(false);
  const [ticketParaImprimir, setTicketParaImprimir] = useState<TicketData | null>(null);
  const [procesando, setProcesando] = useState(false);

  const [metodoSeleccionado, setMetodoSeleccionado] = useState<MetodoPago>('EFECTIVO');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [efectivoRecibido, setEfectivoRecibido] = useState<string>('');

  const [efectivoDeclarado, setEfectivoDeclarado] = useState<string>('');
  const [digitalDeclarado, setDigitalDeclarado] = useState<string>('');
  const [observacionesCierre, setObservacionesCierre] = useState('');
  const [resultadoArqueo, setResultadoArqueo] = useState<any | null>(null);

  // Sincronizar estado de caja abierta con el backend al cargar si no viene ID inicial
  React.useEffect(() => {
    if (!cajaId) {
      PosService.obtenerEstadoCaja(sucursalId)
        .then((res) => {
          if (res?.hayCajaAbierta && res.caja) {
            setCajaInfo(res.caja);
          } else {
            setCajaInfo(null);
          }
        })
        .catch(() => {});
    }
  }, [cajaId, sucursalId]);

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideCat = categoriaActiva === 'TODAS' || p.categoria_id === categoriaActiva;
      const coincideTexto = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
      return coincideCat && coincideTexto;
    });
  }, [productos, categoriaActiva, busqueda]);

  const subtotalCarrito = useMemo(
    () => carrito.reduce((acc, item) => acc + (item.cantidad * item.precio_base - item.descuento_item), 0),
    [carrito]
  );
  const totalPagar = Math.max(0, subtotalCarrito - descuentoGlobal);
  const cambioEfectivo = Math.max(0, (parseFloat(efectivoRecibido) || 0) - totalPagar);

  const handleAbrirCaja = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setAbriendoCaja(true);

    try {
      const nuevaCaja = await PosService.abrirCaja({
        sucursal_id: sucursalId,
        usuario_id: usuarioId,
        monto_inicial: parseFloat(montoApertura) || 0,
      });

      setCajaId(nuevaCaja.id);
      setCajaInfo(nuevaCaja);
      toast.success(`¡Caja #${nuevaCaja.id} habilitada con éxito!`, {
        description: `Turno iniciado con fondo de Bs ${nuevaCaja.monto_inicial}. Ya puedes registrar ventas.`,
        duration: 3500,
      });
    } catch (err: any) {
      toast.error('Error al aperturar caja', {
        description: err.message || 'No se pudo aperturar el turno.',
        duration: 4000,
      });
    } finally {
      setAbriendoCaja(false);
    }
  };

  const handleCerrarSesion = async () => {
    await PosService.cerrarSesion();
    window.location.href = '/login';
  };

  if (!cajaId) {
    const hayCajaAbiertaDetectada = Boolean(cajaInfo && cajaInfo.estado === 'ABIERTA');

    return (
      <div className="h-screen w-screen bg-[#100f0e] flex flex-col items-center justify-center p-6 select-none">
        <Toaster position="top-right" richColors theme="dark" />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#181614] border border-[#2e2721] rounded-3xl p-8 space-y-6 shadow-2xl"
        >
          {/* Header del Modal */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600/30 to-orange-700/20 border border-amber-600/40 text-amber-500 flex items-center justify-center">
                <Flame className="w-6 h-6 fill-amber-500/20" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Control de Turno de Caja</h2>
                <p className="text-xs text-[#9e9382]">{sucursalNombre} • {cajeroNombre}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {esAdminOSupervisor && (
                <a
                  href="/admin/dashboard"
                  className="px-3 py-1.5 rounded-xl bg-orange-950/40 text-amber-400 border border-amber-700/40 text-xs font-semibold flex items-center gap-1.5 hover:bg-orange-900/40 transition"
                >
                  <Shield className="w-3.5 h-3.5" /> Admin
                </a>
              )}
              <button
                type="button"
                onClick={handleCerrarSesion}
                title="Cerrar sesión"
                className="px-3 py-1.5 rounded-xl bg-[#221d19] hover:bg-rose-950/40 text-rose-300 border border-[#382d24] hover:border-rose-800/50 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            </div>
          </div>

          {/* Tarjeta de Estado: SI HAY CAJA ABIERTA */}
          {hayCajaAbiertaDetectada ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-950/25 border border-emerald-600/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-900/50 text-emerald-300 text-[11px] font-bold uppercase tracking-wider border border-emerald-600/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Caja Abierta Activa
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Caja #{cajaInfo.id}
                  </span>
                </div>
                <p className="text-xs text-[#ede7dc] leading-relaxed">
                  Actualmente ya existe un turno abierto en <strong>{sucursalNombre}</strong>
                  {cajaInfo.usuarios?.nombre_completo ? ` por ${cajaInfo.usuarios.nombre_completo}` : ''}.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs border-t border-emerald-900/40">
                  <div>
                    <span className="text-[10px] text-[#9c907f] block uppercase">Fondo Inicial</span>
                    <span className="font-extrabold text-white text-sm">Bs {Number(cajaInfo.monto_inicial || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#9c907f] block uppercase">Hora Apertura</span>
                    <span className="font-semibold text-[#ede7dc] text-xs">
                      {cajaInfo.fecha_inicio
                        ? new Date(cajaInfo.fecha_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Hoy'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCajaId(cajaInfo.id)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>Ingresar al Terminal de Ventas</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCajaId(cajaInfo.id);
                  setModalCierreAbierto(true);
                }}
                className="w-full py-2.5 rounded-xl bg-[#221d19] hover:bg-rose-950/30 text-rose-300 border border-[#382d24] hover:border-rose-800/40 text-xs font-semibold transition"
              >
                Cerrar este turno anterior para abrir uno nuevo
              </button>
            </div>
          ) : (
            /* Tarjeta de Estado: NO HAY CAJA ABIERTA -> PERMITIR APERTURAR */
            <form onSubmit={handleAbrirCaja} className="space-y-5">
              <div className="p-4 rounded-2xl bg-[#11100f] border border-[#24201c] space-y-2">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
                  <LockIcon className="w-3.5 h-3.5" />
                  Estado: Sin Caja Abierta
                </div>
                <p className="text-xs text-[#b8ad9c] leading-relaxed">
                  No hay ningún turno de caja habilitado en <strong>{sucursalNombre}</strong>. Ingresa el fondo de cambio (sencillo en gaveta) para aperturar un nuevo turno e iniciar las ventas.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#ede7dc]">Fondo Inicial en Efectivo (Bs)</label>
                <div className="mt-1.5 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-500">Bs</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={montoApertura}
                    onChange={(e) => setMontoApertura(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#100f0e] border border-[#2e2721] rounded-2xl text-xl font-extrabold text-amber-400 num-tabular focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600/40"
                  />
                </div>

                {/* Accesos rápidos de monto inicial */}
                <div className="grid grid-cols-4 gap-2 mt-2.5">
                  {['100', '150', '200', '300'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMontoApertura(val)}
                      className="py-1.5 rounded-xl bg-[#221f1c] hover:bg-[#2e2925] border border-[#302a24] text-xs font-semibold text-[#b8ad9c] transition cursor-pointer"
                    >
                      Bs {val}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={abriendoCaja}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-sm shadow-lg shadow-orange-600/25 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>{abriendoCaja ? 'Aperturando turno de caja...' : 'Aperturar Caja y Habilitar Ventas'}</span>
              </button>
            </form>
          )}

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleCerrarSesion}
              className="text-xs text-[#8c806f] hover:text-rose-400 font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cambiar de usuario o Cerrar sesión</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const agregarAlCarrito = (producto: ProductoPOS) => {
    if (producto.stock_actual <= 0) {
      toast.error(`Producto agotado: ${producto.nombre}`);
      return;
    }
    setCarrito((prev) => {
      const existe = prev.find((item) => item.id === producto.id);
      if (existe) {
        if (existe.cantidad + 1 > producto.stock_actual) {
          toast.warning(`Stock máximo disponible: ${producto.stock_actual} porciones`);
          return prev;
        }
        return prev.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { ...producto, cantidad: 1, descuento_item: 0, notas: '' }];
    });
  };

  const cambiarCantidad = (id: number, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const nuevaCant = item.cantidad + delta;
          if (nuevaCant > item.stock_actual) {
            toast.warning(`Solo quedan ${item.stock_actual} porciones disponibles`);
            return item;
          }
          return { ...item, cantidad: nuevaCant };
        })
        .filter((item) => item.cantidad > 0)
    );
  };

  const confirmarPedidoYPago = async () => {
    if (carrito.length === 0 || !cajaId) return;
    setProcesando(true);

    // Preparar datos del ticket antes de limpiar el carrito
    const snapshotCarrito = [...carrito];
    const snapshotSubtotal = subtotalCarrito;
    const snapshotDescuento = descuentoGlobal;
    const snapshotTotal = totalPagar;
    const snapshotCliente = clienteNombre.trim() || 'Cliente Mostrador';
    const snapshotMesa = numeroMesa ? parseInt(numeroMesa) : null;
    const snapshotMetodo = metodoSeleccionado;
    const snapshotEfectivo = parseFloat(efectivoRecibido) || totalPagar;
    const snapshotCambio = cambioEfectivo;

    const promesaTransaccion = async () => {
      const pedidoId = await PosService.crearPedido({
        apertura_caja_id: cajaId,
        usuario_id: usuarioId,
        cliente_nombre: snapshotCliente,
        numero_mesa: snapshotMesa,
        descuento_global: snapshotDescuento,
        items: snapshotCarrito.map((i) => ({
          producto_id: i.id,
          cantidad: i.cantidad,
          descuento_item: i.descuento_item,
          notas: i.notas,
        })),
      });

      await PosService.registrarPago({
        pedido_id: pedidoId,
        apertura_caja_id: cajaId,
        usuario_id: usuarioId,
        metodo: snapshotMetodo,
        monto: snapshotTotal,
        referencia_pago: referenciaPago,
      });

      setProductos((prev) =>
        prev.map((prod) => {
          const itemVendido = snapshotCarrito.find((c) => c.id === prod.id);
          return itemVendido
            ? { ...prod, stock_actual: prod.stock_actual - itemVendido.cantidad }
            : prod;
        })
      );

      // Armar el comprobante térmico con el ID emitido
      const datosTicket: TicketData = {
        pedidoId,
        aperturaCajaId: cajaId,
        sucursalNombre,
        cajeroNombre,
        clienteNombre: snapshotCliente,
        numeroMesa: snapshotMesa,
        fecha: new Date(),
        items: snapshotCarrito.map((i) => ({
          nombre: i.nombre,
          cantidad: i.cantidad,
          precio_unitario: i.precio_base,
          subtotal: i.cantidad * i.precio_base - i.descuento_item,
          descuento_item: i.descuento_item,
          notas: i.notas,
        })),
        subtotal: snapshotSubtotal,
        descuento: snapshotDescuento,
        total: snapshotTotal,
        metodoPago: snapshotMetodo,
        efectivoRecibido: snapshotMetodo === 'EFECTIVO' ? snapshotEfectivo : undefined,
        cambio: snapshotMetodo === 'EFECTIVO' ? snapshotCambio : undefined,
      };

      setTicketParaImprimir(datosTicket);
      setModalTicketAbierto(true);

      setCarrito([]);
      setClienteNombre('');
      setNumeroMesa('');
      setDescuentoGlobal(0);
      setReferenciaPago('');
      setEfectivoRecibido('');
      setModalPagoAbierto(false);
      return pedidoId;
    };

    toast.promise(promesaTransaccion(), {
      loading: 'Registrando comanda y emitiendo pago...',
      success: (id) => `¡Comanda #${id} emitida exitosamente! Imprimiendo ticket...`,
      error: (err) => err.message,
      finally: () => setProcesando(false),
    });
  };

  const ejecutarCierreCaja = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!cajaId) return;
    setProcesando(true);

    const promesaCierre = PosService.cerrarCaja({
      apertura_caja_id: cajaId,
      monto_efectivo_declarado: parseFloat(efectivoDeclarado) || 0,
      monto_digital_declarado: parseFloat(digitalDeclarado) || 0,
      observaciones: observacionesCierre,
    });

    toast.promise(promesaCierre, {
      loading: 'Consolidando arqueo y cerrando turno...',
      success: (data) => {
        setResultadoArqueo(data);
        return 'Turno cerrado con éxito';
      },
      error: (err) => err.message,
      finally: () => setProcesando(false),
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#100f0e] overflow-hidden select-none">
      <Toaster position="top-right" richColors theme="dark" closeButton />

      {/* Header Doña Migue */}
      <PosHeader
        sucursalNombre={sucursalNombre}
        cajaId={cajaId}
        cajaInfo={cajaInfo}
        cajeroNombre={cajeroNombre}
        rol={rol}
        esAdminOSupervisor={esAdminOSupervisor}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        onAbrirArqueo={() => setModalCierreAbierto(true)}
        onAbrirHistorial={() => setModalHistorialAbierto(true)}
      />

      {/* Cuerpo dividido: Catálogo (Izquierda) + Comanda Ticket (Derecha) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Catálogo de Platos */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#141210]">
          {/* Píldoras de Categorías */}
          <div className="px-6 py-3 bg-[#181614] border-b border-[#29231e] flex items-center gap-2 overflow-x-auto shrink-0 no-scrollbar">
            {[{ id: 'TODAS' as const, nombre: 'Toda la Carta' }, ...categoriasIniciales].map((cat) => {
              const activa = categoriaActiva === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaActiva(cat.id)}
                  className={`relative px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                    activa ? 'text-white' : 'text-[#9c907f] hover:text-[#ede7dc] hover:bg-[#221f1c]'
                  }`}
                >
                  {activa && (
                    <motion.div
                      layoutId="posCategoryPill"
                      className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl shadow-md shadow-orange-700/20"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{cat.nombre}</span>
                </button>
              );
            })}
          </div>

          {/* Grilla Táctil de Platos y Productos */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5 content-start">
            <AnimatePresence mode="popLayout">
              {productosFiltrados.map((producto) => {
                const agotado = producto.stock_actual === 0;
                const critico = producto.stock_actual > 0 && producto.stock_actual <= producto.stock_minimo;

                return (
                  <motion.button
                    layout
                    key={producto.id}
                    whileTap={!agotado ? { scale: 0.96 } : undefined}
                    disabled={agotado}
                    onClick={() => agregarAlCarrito(producto)}
                    className={`flex flex-col justify-between p-4 rounded-2xl border text-left transition h-36 relative overflow-hidden group ${
                      agotado
                        ? 'bg-[#181614]/50 border-[#24201c] opacity-35 cursor-not-allowed'
                        : 'bg-[#1a1815] border-[#2c2621] hover:border-amber-600/60 hover:bg-[#211e1a] shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <span className="font-bold text-sm text-[#f5efe6] line-clamp-2 leading-snug">
                        {producto.nombre}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md shrink-0 num-tabular ${
                          agotado
                            ? 'bg-rose-950/60 text-rose-400 border border-rose-900/40'
                            : critico
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                            : 'bg-[#26211c] text-[#a89b88] border border-[#332c25]'
                        }`}
                      >
                        {agotado ? 'Agotado' : `${producto.stock_actual} uds`}
                      </span>
                    </div>

                    <div className="mt-auto pt-3 border-t border-[#29231e] flex items-baseline justify-between w-full">
                      <span className="text-[11px] text-[#7a6f5f]">Precio</span>
                      <span className="text-base font-extrabold text-amber-400 num-tabular">
                        Bs {producto.precio_base.toFixed(2)}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Comanda / Ticket Derecho (Estética de Ticket Gastronómico) */}
        <aside className="w-96 bg-[#161412] border-l border-[#29231e] flex flex-col h-full shrink-0 shadow-2xl">
          {/* Cabecera de Comanda */}
          <div className="p-4 border-b border-[#29231e] bg-[#1a1714] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
                <h2 className="font-bold text-sm text-[#ede7dc]">Comanda de Mesa</h2>
              </div>
              {carrito.length > 0 && (
                <button
                  onClick={() => setCarrito([])}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3 h-3" /> Limpiar
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Cliente (Opcional)"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                className="col-span-2 px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-[#ede7dc] placeholder-[#6e6355] focus:outline-none focus:border-amber-600"
              />
              <input
                type="number"
                placeholder="Mesa #"
                value={numeroMesa}
                onChange={(e) => setNumeroMesa(e.target.value)}
                className="px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-[#ede7dc] placeholder-[#6e6355] focus:outline-none focus:border-amber-600 font-bold"
              />
            </div>
          </div>

          {/* Lista de Items del Ticket */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            <AnimatePresence initial={false}>
              {carrito.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-[#6e6355] text-center p-6 space-y-2">
                  <Utensils className="w-8 h-8 stroke-1 text-[#473f36]" />
                  <p className="text-xs">Toca un plato del menú para añadirlo a la comanda</p>
                </div>
              ) : (
                carrito.map((item) => (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-3 rounded-xl bg-[#1d1a17] border border-[#2e2721] space-y-2 shadow-sm"
                  >
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-[#ede7dc]">{item.nombre}</span>
                      <span className="font-extrabold text-amber-400 num-tabular">
                        Bs {(item.cantidad * item.precio_base - item.descuento_item).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        placeholder="Nota de cocina (ej. sin llajwa)..."
                        value={item.notas}
                        onChange={(e) =>
                          setCarrito((prev) =>
                            prev.map((i) => (i.id === item.id ? { ...i, notas: e.target.value } : i))
                          )
                        }
                        className="text-[11px] bg-[#100f0e] border border-[#29231e] rounded-lg px-2.5 py-1 flex-1 text-[#ede7dc] placeholder-[#63584c] focus:outline-none focus:border-amber-700"
                      />

                      <div className="flex items-center gap-1.5 bg-[#100f0e] rounded-lg p-1 border border-[#29231e] shrink-0">
                        <button
                          onClick={() => cambiarCantidad(item.id, -1)}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#2e2721] text-[#b8ad9c]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-5 text-center text-white num-tabular">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => cambiarCantidad(item.id, 1)}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#2e2721] text-amber-400 font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Totales y Botón de Cobro */}
          <div className="p-4 bg-[#1a1714] border-t border-[#29231e] space-y-3">
            <div className="flex justify-between text-xs text-[#9c907f]">
              <span>Subtotal</span>
              <span className="num-tabular font-semibold">Bs {subtotalCarrito.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center text-xs text-[#9c907f]">
              <span>Descuento</span>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[#7a6f5f]">Bs</span>
                <input
                  type="number"
                  min={0}
                  max={subtotalCarrito}
                  value={descuentoGlobal || ''}
                  onChange={(e) => setDescuentoGlobal(Math.min(subtotalCarrito, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-20 pl-6 pr-2 py-1 bg-[#100f0e] border border-[#29231e] rounded-lg text-xs text-right text-white num-tabular focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-[#29231e]">
              <span>Total Comanda</span>
              <span className="text-amber-400 text-lg num-tabular">Bs {totalPagar.toFixed(2)}</span>
            </div>

            <button
              disabled={carrito.length === 0 || procesando}
              onClick={() => {
                setEfectivoRecibido(totalPagar.toFixed(2));
                setModalPagoAbierto(true);
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-lg shadow-orange-600/20 transition flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Cobrar (Bs {totalPagar.toFixed(2)})</span>
            </button>
          </div>
        </aside>
      </div>

      {/* MODAL DE COBRO CON CHIPS DE EFECTIVO RÁPIDO */}
      <AnimatePresence>
        {modalPagoAbierto && (
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
              className="bg-[#181614] border border-[#2e2721] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white">Cobro de Comanda</h3>
                <button onClick={() => setModalPagoAbierto(false)} className="text-[#7a6f5f] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Total Destacado */}
              <div className="p-4 rounded-2xl bg-[#11100f] border border-[#26211c] text-center">
                <span className="text-xs text-[#9c907f]">Total a Pagar</span>
                <p className="text-3xl font-extrabold text-amber-400 num-tabular">Bs {totalPagar.toFixed(2)}</p>
              </div>

              {/* Métodos de Pago */}
              <div className="grid grid-cols-2 gap-2.5">
                {([
                  { id: 'EFECTIVO', label: 'Efectivo', icon: Banknote },
                  { id: 'QR', label: 'Pago QR', icon: QrCode },
                  { id: 'TARJETA', label: 'Tarjeta POS', icon: CreditCard },
                  { id: 'TRANSFERENCIA', label: 'Transferencia', icon: Building2 },
                ] as const).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMetodoSeleccionado(id)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition ${
                      metodoSeleccionado === id
                        ? 'bg-amber-600/20 border-amber-600 text-amber-300 shadow-inner'
                        : 'bg-[#12110f] border-[#29231e] text-[#8c806f] hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {metodoSeleccionado === 'EFECTIVO' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#9c907f]">Efectivo Recibido (Bs)</label>
                    <input
                      type="number"
                      value={efectivoRecibido}
                      onChange={(e) => setEfectivoRecibido(e.target.value)}
                      placeholder={totalPagar.toFixed(2)}
                      className="mt-1 w-full px-4 py-2.5 bg-[#100f0e] border border-[#2e2721] rounded-xl text-sm font-bold text-white num-tabular focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  {/* Chips de Cambio Rápido para Agilidad en Caja */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEfectivoRecibido(totalPagar.toFixed(2))}
                      className="px-2.5 py-1.5 rounded-lg bg-[#24201c] hover:bg-[#302b25] text-[11px] font-semibold text-amber-400 border border-[#383129]"
                    >
                      Exacto
                    </button>
                    {[20, 50, 100, 200].map((billete) => (
                      <button
                        key={billete}
                        type="button"
                        onClick={() => setEfectivoRecibido(billete.toString())}
                        className="px-2.5 py-1.5 rounded-lg bg-[#24201c] hover:bg-[#302b25] text-[11px] font-semibold text-[#b8ad9c] border border-[#383129]"
                      >
                        Bs {billete}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-[#11100f] border border-[#26211c] text-xs">
                    <span className="text-[#9c907f]">Cambio a devolver:</span>
                    <span className="font-extrabold text-amber-400 text-sm num-tabular">
                      Bs {cambioEfectivo.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs text-[#9c907f]">Referencia / Nro. Comprobante</label>
                  <input
                    type="text"
                    value={referenciaPago}
                    onChange={(e) => setReferenciaPago(e.target.value)}
                    placeholder="Nro. autorización o recibo QR"
                    className="w-full px-4 py-2.5 bg-[#100f0e] border border-[#2e2721] rounded-xl text-xs text-white focus:outline-none focus:border-amber-600"
                  />
                </div>
              )}

              <button
                onClick={confirmarPedidoYPago}
                disabled={procesando}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-sm shadow-lg shadow-orange-600/25 transition"
              >
                {procesando ? 'Procesando Venta...' : 'Confirmar y Emitir Comanda'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE CIERRE DE CAJA (ARQUEO CIEGO) */}
      <AnimatePresence>
        {modalCierreAbierto && (
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
              className="bg-[#181614] border border-[#2e2721] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white">Arqueo y Cierre de Turno (Caja #{cajaId})</h3>
                <button onClick={() => setModalCierreAbierto(false)} className="text-[#7a6f5f] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!resultadoArqueo ? (
                <form onSubmit={ejecutarCierreCaja} className="space-y-4">
                  <p className="text-xs text-[#9c907f] leading-relaxed">
                    Declara el conteo físico en gaveta sin consulta previa para garantizar la integridad contable.
                  </p>

                  <div>
                    <label className="text-xs text-[#ede7dc]">Efectivo Físico en Gaveta (Bs)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={efectivoDeclarado}
                      onChange={(e) => setEfectivoDeclarado(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 w-full px-4 py-2.5 bg-[#100f0e] border border-[#2e2721] rounded-xl text-sm font-bold text-white num-tabular focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#ede7dc]">Total Cobros Digitales QR/POS (Bs)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={digitalDeclarado}
                      onChange={(e) => setDigitalDeclarado(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 w-full px-4 py-2.5 bg-[#100f0e] border border-[#2e2721] rounded-xl text-sm font-bold text-white num-tabular focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#ede7dc]">Observaciones del Turno</label>
                    <textarea
                      rows={2}
                      value={observacionesCierre}
                      onChange={(e) => setObservacionesCierre(e.target.value)}
                      placeholder="Observaciones de caja o incidencias..."
                      className="mt-1 w-full px-4 py-2 bg-[#100f0e] border border-[#2e2721] rounded-xl text-xs text-white placeholder-[#6e6355] focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs transition"
                  >
                    Consolidar y Cerrar Caja Definitivamente
                  </button>
                </form>
              ) : (
                <div className="space-y-3.5 text-xs">
                  <div className="p-4 rounded-2xl bg-[#11100f] border border-[#29231e] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#9c907f]">Efectivo Esperado:</span>
                      <span className="text-white num-tabular">Bs {Number(resultadoArqueo.efectivo_esperado_en_gaveta).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-[#ede7dc]">Diferencia Efectivo:</span>
                      <span className={resultadoArqueo.diferencia_efectivo < 0 ? 'text-rose-400 num-tabular' : 'text-emerald-400 num-tabular'}>
                        Bs {Number(resultadoArqueo.diferencia_efectivo).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => window.location.reload()}
                    className="w-full py-3 rounded-2xl bg-[#24201c] hover:bg-[#302b25] text-white font-bold text-xs transition"
                  >
                    Finalizar y Desocupar Terminal
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE HISTORIAL Y EDICIÓN DE PEDIDOS */}
      <PosHistorialModal
        abierto={modalHistorialAbierto}
        onCerrar={() => setModalHistorialAbierto(false)}
        sucursalId={sucursalId}
        sucursalNombre={sucursalNombre}
        cajaActualId={cajaId}
        usuarioId={usuarioId}
        productosCatalogo={productos}
        onPedidoModificado={() => {
          // Si se editó o anuló un pedido, se puede recargar catálogo
        }}
      />

      {/* MODAL Y GESTOR DE IMPRESIÓN DE TICKET TÉRMICO */}
      <PosTicketModal
        ticket={ticketParaImprimir}
        isOpen={modalTicketAbierto}
        onClose={() => setModalTicketAbierto(false)}
        autoPrint={true}
      />
    </div>
  );
}