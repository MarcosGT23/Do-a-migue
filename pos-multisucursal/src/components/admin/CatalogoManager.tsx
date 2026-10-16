import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import {
  Plus, Search, Layers, Edit2, Trash2,
  CheckCircle2, XCircle, X, AlertTriangle
} from 'lucide-react';
import { PosService } from '../../services/pos.service';

interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  orden?: number;
  activa?: boolean;
}

interface Producto {
  id: number;
  categoria_id: number;
  categoria_nombre: string;
  nombre: string;
  descripcion?: string;
  precio_base: number;
  activo: boolean;
  stock_actual: number;
}

interface Props {
  sucursalId: number;
  usuarioId: string;
  categoriasIniciales: Categoria[];
  productosIniciales: Producto[];
}

export default function CatalogoManager({
  categoriasIniciales,
  productosIniciales,
}: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>(categoriasIniciales);
  const [productos, setProductos] = useState<Producto[]>(productosIniciales);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | 'TODAS'>('TODAS');
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [modalProductoAbierto, setModalProductoAbierto] = useState(false);
  const [modalCategoriaAbierto, setModalCategoriaAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Formulario Producto
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formPrecio, setFormPrecio] = useState('');
  const [formCategoriaId, setFormCategoriaId] = useState<number>(categorias[0]?.id || 1);
  const [formActivo, setFormActivo] = useState(true);

  // Eliminar Producto
  const [productoParaEliminar, setProductoParaEliminar] = useState<Producto | null>(null);
  const [eliminandoProducto, setEliminandoProducto] = useState(false);

  // Formulario Categoría (Crear / Editar)
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [catNombre, setCatNombre] = useState('');
  const [catDescripcion, setCatDescripcion] = useState('');
  const [catOrden, setCatOrden] = useState('1');

  // Eliminar Categoría
  const [categoriaParaEliminar, setCategoriaParaEliminar] = useState<Categoria | null>(null);
  const [eliminandoCategoria, setEliminandoCategoria] = useState(false);

  const abrirModalCrearProducto = () => {
    setProductoEditando(null);
    setFormNombre('');
    setFormDescripcion('');
    setFormPrecio('');
    setFormCategoriaId(categorias[0]?.id || 1);
    setFormActivo(true);
    setModalProductoAbierto(true);
  };

  const abrirModalEditarProducto = (prod: Producto) => {
    setProductoEditando(prod);
    setFormNombre(prod.nombre);
    setFormDescripcion(prod.descripcion || '');
    setFormPrecio(prod.precio_base.toString());
    setFormCategoriaId(prod.categoria_id);
    setFormActivo(prod.activo);
    setModalProductoAbierto(true);
  };

  const abrirModalCrearCategoria = () => {
    setCategoriaEditando(null);
    setCatNombre('');
    setCatDescripcion('');
    setCatOrden((categorias.length + 1).toString());
    setModalCategoriaAbierto(true);
  };

  const abrirModalEditarCategoria = (cat: Categoria) => {
    setCategoriaEditando(cat);
    setCatNombre(cat.nombre);
    setCatDescripcion(cat.descripcion || '');
    setCatOrden((cat.orden || 1).toString());
    setModalCategoriaAbierto(true);
  };

  const guardarProductoHandler = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setGuardando(true);

    const promesa = async () => {
      const saved = await PosService.guardarProducto({
        id: productoEditando?.id,
        categoria_id: Number(formCategoriaId),
        nombre: formNombre.trim(),
        descripcion: formDescripcion.trim(),
        precio_base: parseFloat(formPrecio) || 0,
        activo: formActivo,
      });

      const catObj = categorias.find((c) => c.id === Number(formCategoriaId));
      const catNombreActual = catObj?.nombre || 'General';

      if (productoEditando) {
        setProductos((prev) =>
          prev.map((p) =>
            p.id === productoEditando.id
              ? {
                  ...p,
                  categoria_id: Number(formCategoriaId),
                  categoria_nombre: catNombreActual,
                  nombre: formNombre.trim(),
                  descripcion: formDescripcion.trim(),
                  precio_base: parseFloat(formPrecio) || 0,
                  activo: formActivo,
                }
              : p
          )
        );
      } else {
        setProductos((prev) => [
          ...prev,
          {
            id: saved.id,
            categoria_id: Number(formCategoriaId),
            categoria_nombre: catNombreActual,
            nombre: formNombre.trim(),
            descripcion: formDescripcion.trim(),
            precio_base: parseFloat(formPrecio) || 0,
            activo: formActivo,
            stock_actual: 0,
          },
        ]);
      }
      setModalProductoAbierto(false);
      return saved;
    };

    toast.promise(promesa(), {
      loading: productoEditando ? 'Actualizando datos del plato...' : 'Creando nuevo plato...',
      success: productoEditando ? 'Plato actualizado con éxito' : 'Plato añadido con éxito',
      error: (err) => err.message,
      finally: () => setGuardando(false),
    });
  };

  const confirmarEliminarProducto = async () => {
    if (!productoParaEliminar) return;
    setEliminandoProducto(true);

    const promesa = async () => {
      await PosService.eliminarProducto(productoParaEliminar.id);
      setProductos((prev) => prev.filter((p) => p.id !== productoParaEliminar.id));
      setProductoParaEliminar(null);
    };

    toast.promise(promesa(), {
      loading: 'Eliminando plato del catálogo...',
      success: 'Plato procesado con éxito',
      error: (err) => err.message,
      finally: () => setEliminandoProducto(false),
    });
  };

  const guardarCategoriaHandler = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setGuardando(true);

    const promesa = async () => {
      if (categoriaEditando) {
        const catActualizada = await PosService.actualizarCategoria({
          id: categoriaEditando.id,
          nombre: catNombre.trim(),
          descripcion: catDescripcion.trim(),
          orden: parseInt(catOrden) || 1,
        });

        setCategorias((prev) =>
          prev.map((c) => (c.id === categoriaEditando.id ? { ...c, ...catActualizada } : c))
        );

        // Actualizar nombres en productos
        setProductos((prev) =>
          prev.map((p) =>
            p.categoria_id === categoriaEditando.id
              ? { ...p, categoria_nombre: catActualizada.nombre }
              : p
          )
        );

        setModalCategoriaAbierto(false);
        return catActualizada;
      } else {
        const nuevaCat = await PosService.crearCategoria({
          nombre: catNombre.trim(),
          descripcion: catDescripcion.trim(),
          orden: parseInt(catOrden) || 1,
        });

        setCategorias((prev) => [...prev, nuevaCat]);
        setModalCategoriaAbierto(false);
        setCatNombre('');
        setCatDescripcion('');
        return nuevaCat;
      }
    };

    toast.promise(promesa(), {
      loading: categoriaEditando ? 'Actualizando categoría...' : 'Creando categoría...',
      success: categoriaEditando ? 'Categoría actualizada con éxito' : 'Categoría añadida con éxito',
      error: (err) => err.message,
      finally: () => setGuardando(false),
    });
  };

  const confirmarEliminarCategoria = async () => {
    if (!categoriaParaEliminar) return;
    setEliminandoCategoria(true);

    const promesa = async () => {
      await PosService.eliminarCategoria(categoriaParaEliminar.id);
      setCategorias((prev) => prev.filter((c) => c.id !== categoriaParaEliminar.id));
      if (categoriaSeleccionada === categoriaParaEliminar.id) {
        setCategoriaSeleccionada('TODAS');
      }
      setCategoriaParaEliminar(null);
    };

    toast.promise(promesa(), {
      loading: 'Eliminando categoría...',
      success: 'Categoría eliminada con éxito',
      error: (err) => err.message,
      finally: () => setEliminandoCategoria(false),
    });
  };

  const categoriaActivaObj = useMemo(() => {
    if (categoriaSeleccionada === 'TODAS') return null;
    return categorias.find((c) => c.id === categoriaSeleccionada) || null;
  }, [categorias, categoriaSeleccionada]);

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchCat = categoriaSeleccionada === 'TODAS' || p.categoria_id === categoriaSeleccionada;
      const matchText = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
      return matchCat && matchText;
    });
  }, [productos, categoriaSeleccionada, busqueda]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <Toaster position="top-right" richColors theme="dark" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">
            Administración del Menú
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-0.5">
            Carta de Platos y Precios
          </h1>
          <p className="text-xs text-[#9c907f] mt-1">
            Gestiona la disponibilidad, precios y categorización para los terminales de venta.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={abrirModalCrearCategoria}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a1715] border border-[#2b2520] text-[#ede7dc] hover:border-amber-600/40 text-xs font-semibold transition"
          >
            <Layers className="w-4 h-4 text-amber-500" />
            <span>Nueva Categoría</span>
          </button>
          <button
            onClick={abrirModalCrearProducto}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Plato / Producto</span>
          </button>
        </div>
      </div>

      {/* Filtros de Búsqueda y Pestañas de Categoría */}
      <div className="space-y-3 bg-[#1a1715] border border-[#2b2520] p-4 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#7a6f5f] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar plato por nombre..."
              className="w-full pl-10 pr-4 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white placeholder-[#6e6355] focus:outline-none focus:border-amber-600 transition"
            />
          </div>

          {/* Acciones de la categoría activa seleccionada */}
          {categoriaActivaObj && (
            <div className="flex items-center gap-2 shrink-0 bg-[#12100f] border border-[#29231e] px-3 py-1.5 rounded-xl">
              <span className="text-[11px] text-[#9c907f] font-medium truncate max-w-[140px]">
                {categoriaActivaObj.nombre}
              </span>
              <button
                onClick={() => abrirModalEditarCategoria(categoriaActivaObj)}
                className="p-1 rounded-lg hover:bg-[#26201a] text-amber-400 transition"
                title="Editar nombre y datos de esta categoría"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCategoriaParaEliminar(categoriaActivaObj)}
                className="p-1 rounded-lg hover:bg-rose-950/40 text-rose-400 transition"
                title="Eliminar esta categoría"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Barra de Categorías */}
        <div className="flex items-center gap-2 overflow-x-auto w-full no-scrollbar pt-1">
          <button
            onClick={() => setCategoriaSeleccionada('TODAS')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              categoriaSeleccionada === 'TODAS'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-600/40'
                : 'text-[#9c907f] hover:text-white bg-[#100f0e]'
            }`}
          >
            Todas ({productos.length})
          </button>
          {categorias.map((cat) => {
            const countProd = productos.filter((p) => p.categoria_id === cat.id).length;
            const esActiva = categoriaSeleccionada === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaSeleccionada(cat.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                  esActiva
                    ? 'bg-amber-600/20 text-amber-300 border border-amber-600/40'
                    : 'text-[#9c907f] hover:text-white bg-[#100f0e]'
                }`}
              >
                <span>{cat.nombre}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#26211c] text-[#8c806f]">
                  {countProd}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-[#1a1715] border border-[#2b2520] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#29231e] text-[#8c806f] uppercase tracking-wider bg-[#141210]">
                <th className="py-3 px-4 font-semibold">Plato / Producto</th>
                <th className="py-3 px-4 font-semibold">Categoría</th>
                <th className="py-3 px-4 font-semibold">Precio Base</th>
                <th className="py-3 px-4 font-semibold">Stock Actual</th>
                <th className="py-3 px-4 font-semibold">Estado</th>
                <th className="py-3 px-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26211c]">
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6e6355]">
                    No se encontraron productos en este menú.
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((prod) => (
                  <tr key={prod.id} className="hover:bg-[#201d19] transition">
                    <td className="py-3 px-4 font-medium text-white">
                      <div>{prod.nombre}</div>
                      {prod.descripcion && (
                        <span className="text-[10px] text-[#8c806f]">{prod.descripcion}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#ede7dc]">{prod.categoria_nombre}</td>
                    <td className="py-3 px-4 font-extrabold text-amber-400 num-tabular">
                      Bs {prod.precio_base.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold num-tabular ${
                          prod.stock_actual > 0
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                        }`}
                      >
                        {prod.stock_actual} uds
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {prod.activo ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> En Carta
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-400 font-medium">
                          <XCircle className="w-3.5 h-3.5" /> Oculto
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => abrirModalEditarProducto(prod)}
                          className="p-1.5 rounded-lg bg-[#100f0e] border border-[#2b2520] text-[#9c907f] hover:text-white hover:border-amber-600 transition"
                          title="Editar plato"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setProductoParaEliminar(prod)}
                          className="p-1.5 rounded-lg bg-[#100f0e] border border-[#2b2520] text-[#9c907f] hover:text-rose-400 hover:border-rose-800 transition"
                          title="Eliminar plato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Producto */}
      <AnimatePresence>
        {modalProductoAbierto && (
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
                <h3 className="text-base font-bold text-white">
                  {productoEditando ? 'Editar Plato del Menú' : 'Nuevo Plato / Bebida'}
                </h3>
                <button
                  onClick={() => setModalProductoAbierto(false)}
                  className="text-[#7a6f5f] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={guardarProductoHandler} className="space-y-3.5">
                <div>
                  <label className="text-xs text-[#ede7dc]">Nombre del Plato</label>
                  <input
                    type="text"
                    required
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder="Ej. Kjara Tradicional, Costilla Especial"
                    className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#ede7dc]">Categoría</label>
                    <select
                      value={formCategoriaId}
                      onChange={(e) => setFormCategoriaId(Number(e.target.value))}
                      className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white focus:outline-none focus:border-amber-600"
                    >
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-[#ede7dc]">Precio (Bs)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formPrecio}
                      onChange={(e) => setFormPrecio(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white num-tabular focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#ede7dc]">Descripción / Guarniciones</label>
                  <textarea
                    rows={2}
                    value={formDescripcion}
                    onChange={(e) => setFormDescripcion(e.target.value)}
                    placeholder="Ej. Acompañado de mote, papa y llajwa..."
                    className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white placeholder-[#6e6355] focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="activoCheck"
                    checked={formActivo}
                    onChange={(e) => setFormActivo(e.target.checked)}
                    className="rounded bg-[#100f0e] border-[#2b2520] text-amber-600 focus:ring-0"
                  />
                  <label htmlFor="activoCheck" className="text-xs text-[#ede7dc] select-none">
                    Disponible inmediatamente en Terminal POS
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalProductoAbierto(false)}
                    className="w-1/2 py-2.5 rounded-xl bg-[#26211c] hover:bg-[#332c25] text-[#ede7dc] font-semibold text-xs transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md transition"
                  >
                    {guardando
                      ? 'Guardando...'
                      : productoEditando
                      ? 'Actualizar Plato'
                      : 'Guardar Plato'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Eliminar Producto */}
      <AnimatePresence>
        {productoParaEliminar && (
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
              className="bg-[#181614] border border-[#2e2721] rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">¿Eliminar Plato?</h3>
                <p className="text-xs text-[#9c907f] mt-1.5">
                  Estás a punto de quitar del menú: <strong className="text-white">{productoParaEliminar.nombre}</strong> (Bs {productoParaEliminar.precio_base.toFixed(2)}).
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProductoParaEliminar(null)}
                  disabled={eliminandoProducto}
                  className="w-1/2 py-2.5 rounded-xl bg-[#26211c] hover:bg-[#332c25] text-[#ede7dc] font-semibold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarEliminarProducto}
                  disabled={eliminandoProducto}
                  className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition"
                >
                  {eliminandoProducto ? 'Eliminando...' : 'Sí, Eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Crear / Editar Categoría */}
      <AnimatePresence>
        {modalCategoriaAbierto && (
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
              className="bg-[#181614] border border-[#2e2721] rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white">
                  {categoriaEditando ? 'Editar Categoría de Carta' : 'Nueva Categoría de Carta'}
                </h3>
                <button
                  onClick={() => setModalCategoriaAbierto(false)}
                  className="text-[#7a6f5f] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={guardarCategoriaHandler} className="space-y-3.5">
                <div>
                  <label className="text-xs text-[#ede7dc]">Nombre de la Categoría</label>
                  <input
                    type="text"
                    required
                    value={catNombre}
                    onChange={(e) => setCatNombre(e.target.value)}
                    placeholder="Ej. Kjaras, Guarniciones, Refrescos"
                    className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#ede7dc]">Descripción Breve</label>
                  <input
                    type="text"
                    value={catDescripcion}
                    onChange={(e) => setCatDescripcion(e.target.value)}
                    placeholder="Descripción opcional..."
                    className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#ede7dc]">Orden en Carta</label>
                  <input
                    type="number"
                    value={catOrden}
                    onChange={(e) => setCatOrden(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white num-tabular focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalCategoriaAbierto(false)}
                    className="w-1/2 py-2.5 rounded-xl bg-[#26211c] hover:bg-[#332c25] text-[#ede7dc] font-semibold text-xs transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs transition"
                  >
                    {guardando
                      ? 'Guardando...'
                      : categoriaEditando
                      ? 'Actualizar'
                      : 'Crear Categoría'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Eliminar Categoría */}
      <AnimatePresence>
        {categoriaParaEliminar && (
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
              className="bg-[#181614] border border-[#2e2721] rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">¿Eliminar Categoría?</h3>
                <p className="text-xs text-[#9c907f] mt-1.5">
                  Estás a punto de eliminar la categoría <strong className="text-white">{categoriaParaEliminar.nombre}</strong>. Solo es posible si no contiene platos asociados.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCategoriaParaEliminar(null)}
                  disabled={eliminandoCategoria}
                  className="w-1/2 py-2.5 rounded-xl bg-[#26211c] hover:bg-[#332c25] text-[#ede7dc] font-semibold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarEliminarCategoria}
                  disabled={eliminandoCategoria}
                  className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition"
                >
                  {eliminandoCategoria ? 'Eliminando...' : 'Sí, Eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
