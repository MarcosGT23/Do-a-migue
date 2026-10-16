import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import {
  Building2, Users, Plus, Edit3,
  Phone, MapPin, X, Trash2, AlertTriangle
} from 'lucide-react';
import { PosService, type RolUsuario } from '../../services/pos.service';

interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  activa: boolean;
}

interface Usuario {
  id: string;
  nombre_completo: string;
  rol: RolUsuario;
  sucursal_id: number | null;
  activo: boolean;
  created_at: string;
}

interface Props {
  sucursalesIniciales: Sucursal[];
  usuariosIniciales: Usuario[];
}

export default function OrganizacionManager({
  sucursalesIniciales,
  usuariosIniciales,
}: Props) {
  const [tab, setTab] = useState<'SUCURSALES' | 'USUARIOS'>('SUCURSALES');
  const [sucursales, setSucursales] = useState<Sucursal[]>(sucursalesIniciales);
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosIniciales);

  // Modal Sucursal (Crear / Editar)
  const [modalSucursalAbierto, setModalSucursalAbierto] = useState(false);
  const [sucursalEditando, setSucursalEditando] = useState<Sucursal | null>(null);
  const [sucNombre, setSucNombre] = useState('');
  const [sucDireccion, setSucDireccion] = useState('');
  const [sucTelefono, setSucTelefono] = useState('');
  const [guardandoSucursal, setGuardandoSucursal] = useState(false);

  // Modal Confirmar Eliminar Sucursal
  const [sucursalParaEliminar, setSucursalParaEliminar] = useState<Sucursal | null>(null);
  const [eliminandoSucursal, setEliminandoSucursal] = useState(false);

  // Modal Usuario
  const [modalUsuarioAbierto, setModalUsuarioAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [usrNombre, setUsrNombre] = useState('');
  const [usrRol, setUsrRol] = useState<RolUsuario>('CAJERO');
  const [usrSucursalId, setUsrSucursalId] = useState<number | null>(null);
  const [usrActivo, setUsrActivo] = useState(true);
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);

  // Abrir Modal Crear Sucursal
  const abrirCrearSucursal = () => {
    setSucursalEditando(null);
    setSucNombre('');
    setSucDireccion('');
    setSucTelefono('');
    setModalSucursalAbierto(true);
  };

  // Abrir Modal Editar Sucursal
  const abrirEditarSucursal = (s: Sucursal) => {
    setSucursalEditando(s);
    setSucNombre(s.nombre);
    setSucDireccion(s.direccion || '');
    setSucTelefono(s.telefono || '');
    setModalSucursalAbierto(true);
  };

  // Guardar Sucursal (Crear o Editar)
  const handleGuardarSucursal = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setGuardandoSucursal(true);

    const promesa = async () => {
      if (sucursalEditando) {
        const updated = await PosService.actualizarSucursal({
          id: sucursalEditando.id,
          nombre: sucNombre.trim(),
          direccion: sucDireccion.trim(),
          telefono: sucTelefono.trim(),
        });

        setSucursales((prev) =>
          prev.map((s) => (s.id === sucursalEditando.id ? { ...s, ...updated } : s))
        );
        setModalSucursalAbierto(false);
        return updated;
      } else {
        const nuevaSuc = await PosService.crearSucursal({
          nombre: sucNombre.trim(),
          direccion: sucDireccion.trim(),
          telefono: sucTelefono.trim(),
        });
        setSucursales((prev) => [...prev, nuevaSuc]);
        setModalSucursalAbierto(false);
        return nuevaSuc;
      }
    };

    toast.promise(promesa(), {
      loading: sucursalEditando ? 'Guardando cambios de la sucursal...' : 'Registrando nueva sucursal...',
      success: sucursalEditando ? 'Sucursal actualizada con éxito' : 'Sucursal registrada con éxito',
      error: (err) => err.message,
      finally: () => setGuardandoSucursal(false),
    });
  };

  // Eliminar Sucursal
  const handleEliminarSucursal = async () => {
    if (!sucursalParaEliminar) return;
    setEliminandoSucursal(true);

    const promesa = async () => {
      await PosService.eliminarSucursal(sucursalParaEliminar.id);
      setSucursales((prev) => prev.filter((s) => s.id !== sucursalParaEliminar.id));
      setSucursalParaEliminar(null);
    };

    toast.promise(promesa(), {
      loading: 'Eliminando sucursal...',
      success: 'Sucursal procesada con éxito',
      error: (err) => err.message,
      finally: () => setEliminandoSucursal(false),
    });
  };

  // Toggle Sucursal
  const handleToggleSucursal = async (id: number, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    const promesa = PosService.toggleSucursalActiva(id, nuevoEstado);

    toast.promise(promesa, {
      loading: 'Actualizando estado operativo...',
      success: () => {
        setSucursales((prev) =>
          prev.map((s) => (s.id === id ? { ...s, activa: nuevoEstado } : s))
        );
        return `Sucursal ${nuevoEstado ? 'habilitada' : 'deshabilitada'}`;
      },
      error: (err) => err.message,
    });
  };

  // Abrir Modal Editar Usuario
  const abrirEditarUsuario = (u: Usuario) => {
    setUsuarioEditando(u);
    setUsrNombre(u.nombre_completo);
    setUsrRol(u.rol);
    setUsrSucursalId(u.sucursal_id);
    setUsrActivo(u.activo);
    setModalUsuarioAbierto(true);
  };

  // Guardar Edición Usuario
  const handleGuardarUsuario = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!usuarioEditando) return;
    setGuardandoUsuario(true);

    const promesa = async () => {
      const updated = await PosService.actualizarUsuario({
        id: usuarioEditando.id,
        nombre_completo: usrNombre.trim(),
        rol: usrRol,
        sucursal_id: usrSucursalId,
        activo: usrActivo,
      });

      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioEditando.id ? { ...u, ...updated } : u))
      );
      setModalUsuarioAbierto(false);
      return updated;
    };

    toast.promise(promesa(), {
      loading: 'Actualizando operador y rol...',
      success: 'Operador actualizado con éxito',
      error: (err) => err.message,
      finally: () => setGuardandoUsuario(false),
    });
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <Toaster position="top-right" richColors theme="dark" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">
            Estructura Organizacional
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-0.5">
            Sucursales y Personal
          </h1>
          <p className="text-xs text-[#9c907f] mt-1">
            Gestión de puntos de venta y asignación de roles operativos.
          </p>
        </div>

        {tab === 'SUCURSALES' && (
          <button
            onClick={abrirCrearSucursal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-600/20 transition self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Sucursal</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-[#26211c] pb-3">
        <button
          onClick={() => setTab('SUCURSALES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === 'SUCURSALES'
              ? 'bg-amber-600/20 text-amber-300 border border-amber-600/40'
              : 'text-[#9c907f] hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Sucursales ({sucursales.length})</span>
        </button>
        <button
          onClick={() => setTab('USUARIOS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === 'USUARIOS'
              ? 'bg-amber-600/20 text-amber-300 border border-amber-600/40'
              : 'text-[#9c907f] hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Personal y Roles ({usuarios.length})</span>
        </button>
      </div>

      {/* TAB SUCURSALES */}
      {tab === 'SUCURSALES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sucursales.map((suc) => (
            <motion.div
              layout
              key={suc.id}
              className="p-5 rounded-2xl bg-[#1a1715] border border-[#2b2520] space-y-4 shadow-lg hover:border-[#473c33] transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider num-tabular">
                    Sucursal #{suc.id}
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">{suc.nombre}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => abrirEditarSucursal(suc)}
                    className="p-1.5 rounded-lg bg-[#100f0e] border border-[#2b2520] text-[#9c907f] hover:text-white hover:border-amber-600 transition"
                    title="Editar datos de la sucursal"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSucursalParaEliminar(suc)}
                    className="p-1.5 rounded-lg bg-[#100f0e] border border-[#2b2520] text-[#9c907f] hover:text-rose-400 hover:border-rose-800 transition"
                    title="Eliminar sucursal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleSucursal(suc.id, suc.activa)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                      suc.activa
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/60'
                        : 'bg-rose-950/60 text-rose-400 border border-rose-800/40 hover:bg-rose-900/60'
                    }`}
                  >
                    {suc.activa ? 'Operativa' : 'Inactiva'}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs text-[#9c907f] border-t border-[#26211c] pt-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#6e6355] shrink-0" />
                  <span className="truncate">{suc.direccion || 'Sin dirección registrada'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#6e6355] shrink-0" />
                  <span>{suc.telefono || 'Sin teléfono'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* TAB USUARIOS */}
      {tab === 'USUARIOS' && (
        <div className="bg-[#1a1715] border border-[#2b2520] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#29231e] text-[#8c806f] uppercase tracking-wider bg-[#141210]">
                  <th className="py-3 px-4 font-semibold">Operador</th>
                  <th className="py-3 px-4 font-semibold">Rol Asignado</th>
                  <th className="py-3 px-4 font-semibold">Sucursal</th>
                  <th className="py-3 px-4 font-semibold">Estado</th>
                  <th className="py-3 px-4 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26211c]">
                {usuarios.map((usr) => {
                  const suc = sucursales.find((s) => s.id === usr.sucursal_id);
                  return (
                    <tr key={usr.id} className="hover:bg-[#201d19] transition">
                      <td className="py-3 px-4 font-medium text-white">
                        <div>{usr.nombre_completo}</div>
                        <span className="text-[10px] text-[#7a6f5f] font-mono truncate block max-w-xs">
                          {usr.id}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            usr.rol === 'ADMIN'
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                              : usr.rol === 'SUPERVISOR'
                              ? 'bg-orange-950/60 text-orange-300 border border-orange-800/40'
                              : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          }`}
                        >
                          {usr.rol}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#ede7dc]">
                        {suc ? suc.nombre : 'Global / Todas'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[11px] font-semibold ${
                            usr.activo ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {usr.activo ? 'Habilitado' : 'Bloqueado'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => abrirEditarUsuario(usr)}
                          className="p-1.5 rounded-lg bg-[#100f0e] border border-[#2b2520] text-[#9c907f] hover:text-white hover:border-amber-600 transition"
                          title="Modificar rol o sucursal"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Sucursal */}
      <AnimatePresence>
        {modalSucursalAbierto && (
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
                  {sucursalEditando ? 'Editar Sucursal' : 'Nueva Sucursal'}
                </h3>
                <button
                  onClick={() => setModalSucursalAbierto(false)}
                  className="text-[#7a6f5f] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGuardarSucursal} className="space-y-3.5">
                <div>
                  <label className="text-xs text-[#ede7dc]">Nombre de la Sucursal</label>
                  <input
                    type="text"
                    required
                    value={sucNombre}
                    onChange={(e) => setSucNombre(e.target.value)}
                    placeholder="Ej. Sucursal Central, Prado"
                    className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#ede7dc]">Dirección</label>
                  <input
                    type="text"
                    required
                    value={sucDireccion}
                    onChange={(e) => setSucDireccion(e.target.value)}
                    placeholder="Av. Blanco Galindo Km 4"
                    className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#ede7dc]">Teléfono de Contacto</label>
                  <input
                    type="text"
                    required
                    value={sucTelefono}
                    onChange={(e) => setSucTelefono(e.target.value)}
                    placeholder="+591 70000000"
                    className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalSucursalAbierto(false)}
                    className="w-1/2 py-2.5 rounded-xl bg-[#26211c] hover:bg-[#332c25] text-[#ede7dc] font-semibold text-xs transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoSucursal}
                    className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/20 transition"
                  >
                    {guardandoSucursal
                      ? 'Guardando...'
                      : sucursalEditando
                      ? 'Actualizar Sucursal'
                      : 'Crear Sucursal'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Confirmar Eliminar Sucursal */}
      <AnimatePresence>
        {sucursalParaEliminar && (
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
                <h3 className="text-base font-bold text-white">¿Eliminar Sucursal?</h3>
                <p className="text-xs text-[#9c907f] mt-1.5">
                  Estás a punto de eliminar <strong className="text-white">{sucursalParaEliminar.nombre}</strong>. Si tiene pedidos o turnos registrados, será deshabilitada para proteger los registros de auditoría.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSucursalParaEliminar(null)}
                  disabled={eliminandoSucursal}
                  className="w-1/2 py-2.5 rounded-xl bg-[#26211c] hover:bg-[#332c25] text-[#ede7dc] font-semibold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEliminarSucursal}
                  disabled={eliminandoSucursal}
                  className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition"
                >
                  {eliminandoSucursal ? 'Eliminando...' : 'Sí, Eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Editar Operador */}
      <AnimatePresence>
        {modalUsuarioAbierto && (
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
                <h3 className="text-base font-bold text-white">Editar Operador</h3>
                <button
                  onClick={() => setModalUsuarioAbierto(false)}
                  className="text-[#7a6f5f] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGuardarUsuario} className="space-y-3.5">
                <div>
                  <label className="text-xs text-[#ede7dc]">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={usrNombre}
                    onChange={(e) => setUsrNombre(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#ede7dc]">Rol del Sistema</label>
                    <select
                      value={usrRol}
                      onChange={(e) => setUsrRol(e.target.value as RolUsuario)}
                      className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white focus:outline-none focus:border-amber-600"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPERVISOR">SUPERVISOR</option>
                      <option value="CAJERO">CAJERO</option>
                      <option value="MESERO">MESERO</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-[#ede7dc]">Sucursal Asignada</label>
                    <select
                      value={usrSucursalId || ''}
                      onChange={(e) =>
                        setUsrSucursalId(e.target.value ? Number(e.target.value) : null)
                      }
                      className="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white focus:outline-none focus:border-amber-600"
                    >
                      <option value="">(Todas / Global)</option>
                      {sucursales.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="usrActivoCheck"
                    checked={usrActivo}
                    onChange={(e) => setUsrActivo(e.target.checked)}
                    className="rounded bg-[#100f0e] border-[#2b2520] text-amber-600 focus:ring-0"
                  />
                  <label htmlFor="usrActivoCheck" className="text-xs text-[#ede7dc] select-none">
                    Cuenta activa y habilitada para operar
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={guardandoUsuario}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs transition"
                >
                  {guardandoUsuario ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
