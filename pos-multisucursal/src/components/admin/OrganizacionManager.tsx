import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import {
  Building2, Users, Plus, Edit3,
  Phone, MapPin, Trash2, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import { PosService, type RolUsuario } from '../../services/pos.service';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Field, Input } from '../ui/Field';

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

const tonoRol = {
  ADMIN: 'brasa',
  SUPERVISOR: 'alerta',
  CAJERO: 'ok',
  MESERO: 'neutro',
} as const;

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

  const activas = sucursales.filter((s) => s.activa).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <Toaster position="top-right" richColors theme="dark" />

      {/* Cabecera */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ember">
            Estructura organizacional
          </p>
          <h1 className="mt-1 text-[22px] font-extrabold leading-tight tracking-[-0.025em] text-ink sm:text-[26px]">
            Sucursales y personal
          </h1>
          <p className="mt-1 max-w-xl text-[12.5px] leading-5 text-ink-muted">
            Puntos de venta, roles operativos y acceso a cada sucursal.
          </p>
          <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-faint">
            {sucursales.length} sucursales · {activas} operativas · {usuarios.length} operadores
          </p>
        </div>

        {tab === 'SUCURSALES' && (
          <Button
            onClick={abrirCrearSucursal}
            icono={<Plus className="size-4" strokeWidth={2.5} />}
            className="self-start sm:self-auto"
          >
            Nueva sucursal
          </Button>
        )}
      </header>

      {/* Pestañas */}
      <div
        role="tablist"
        aria-label="Secciones de la organización"
        className="mt-5 flex w-full items-center gap-0.5 rounded-field border border-line-strong bg-card p-0.5 sm:w-auto sm:self-start"
      >
        {(
          [
            { id: 'SUCURSALES', label: 'Sucursales', n: sucursales.length, Icono: Building2 },
            { id: 'USUARIOS', label: 'Personal y roles', n: usuarios.length, Icono: Users },
          ] as const
        ).map(({ id, label, n, Icono }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-[7px] px-3 text-[12.5px] font-semibold transition-colors sm:flex-none ${
              tab === id ? 'bg-raised text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icono className="size-4" strokeWidth={2.25} aria-hidden />
            {label}
            <span className="font-mono text-[10.5px] text-ink-faint tnum">{n}</span>
          </button>
        ))}
      </div>

      {/* Sucursales */}
      {tab === 'SUCURSALES' && (
        <section
          id="panel-SUCURSALES"
          role="tabpanel"
          className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3"
        >
          {sucursales.map((suc) => (
            <motion.article
              layout
              key={suc.id}
              className={`flex flex-col rounded-card border bg-card p-4 transition-colors ${
                suc.activa ? 'border-line-strong hover:border-ember/40' : 'border-line border-dashed'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-ember tnum">
                    Sucursal #{suc.id}
                  </span>
                  <h2
                    className={`mt-0.5 truncate text-[15px] font-bold tracking-[-0.01em] ${
                      suc.activa ? 'text-ink' : 'text-ink-muted'
                    }`}
                  >
                    {suc.nombre}
                  </h2>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton
                    etiqueta={`Editar ${suc.nombre}`}
                    tamano="sm"
                    onClick={() => abrirEditarSucursal(suc)}
                    icono={<Edit3 className="size-3.5" strokeWidth={2.25} />}
                  />
                  <IconButton
                    etiqueta={`Eliminar ${suc.nombre}`}
                    tamano="sm"
                    tono="peligro"
                    onClick={() => setSucursalParaEliminar(suc)}
                    icono={<Trash2 className="size-3.5" strokeWidth={2.25} />}
                  />
                </div>
              </div>

              <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-[12px]">
                <div className="flex items-center gap-2">
                  <dt className="sr-only">Dirección</dt>
                  <MapPin className="size-3.5 shrink-0 text-ink-faint" strokeWidth={2} aria-hidden />
                  <dd className="truncate text-ink-soft">
                    {suc.direccion || 'Sin dirección registrada'}
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="sr-only">Teléfono</dt>
                  <Phone className="size-3.5 shrink-0 text-ink-faint" strokeWidth={2} aria-hidden />
                  <dd className="truncate text-ink-soft">{suc.telefono || 'Sin teléfono'}</dd>
                </div>
              </dl>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-muted">
                  Estado operativo
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={suc.activa}
                  aria-label={`${suc.nombre}: ${suc.activa ? 'operativa' : 'inactiva'}`}
                  onClick={() => handleToggleSucursal(suc.id, suc.activa)}
                  className="flex h-9 items-center gap-2 rounded-full pl-1 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
                >
                  <span
                    className={`relative h-5 w-9 rounded-full border transition-colors ${
                      suc.activa ? 'border-ok/50 bg-ok/25' : 'border-line-strong bg-sunken'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 size-3.5 rounded-full transition-all ${
                        suc.activa ? 'left-[18px] bg-ok' : 'left-0.5 bg-ink-faint'
                      }`}
                    />
                  </span>
                  <span
                    className={`text-[11.5px] font-bold uppercase tracking-[0.05em] ${
                      suc.activa ? 'text-ok' : 'text-ink-muted'
                    }`}
                  >
                    {suc.activa ? 'Operativa' : 'Inactiva'}
                  </span>
                </button>
              </div>
            </motion.article>
          ))}
        </section>
      )}

      {/* Personal */}
      {tab === 'USUARIOS' && (
        <section
          id="panel-USUARIOS"
          role="tabpanel"
          className="mt-3 overflow-hidden rounded-card border border-line-strong bg-card"
        >
          {/* Escritorio */}
          <table className="hidden w-full border-collapse text-left md:table">
            <caption className="sr-only">Operadores con su rol, sucursal y estado de la cuenta</caption>
            <thead>
              <tr className="border-b border-line bg-sunken text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                <th scope="col" className="px-4 py-2.5 font-semibold">Operador</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Rol</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Sucursal</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Cuenta</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {usuarios.map((usr) => {
                const suc = sucursales.find((s) => s.id === usr.sucursal_id);
                return (
                  <tr key={usr.id} className="transition-colors hover:bg-raised/60">
                    <td className="px-4 py-2.5">
                      <span className="block text-[13px] font-semibold text-ink">
                        {usr.nombre_completo}
                      </span>
                      <span className="block max-w-[220px] truncate font-mono text-[10px] text-ink-faint">
                        {usr.id}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tono={tonoRol[usr.rol]}>{usr.rol}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-[12.5px] text-ink-soft">
                      {suc ? suc.nombre : 'Global / todas'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`flex items-center gap-1.5 text-[11.5px] font-semibold ${
                          usr.activo ? 'text-ok' : 'text-danger'
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`size-1.5 rounded-full ${usr.activo ? 'bg-ok' : 'bg-danger'}`}
                        />
                        {usr.activo ? 'Habilitado' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <IconButton
                        etiqueta={`Editar a ${usr.nombre_completo}`}
                        tamano="sm"
                        onClick={() => abrirEditarUsuario(usr)}
                        icono={<Edit3 className="size-3.5" strokeWidth={2.25} />}
                        className="ml-auto"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Móvil */}
          <ul className="divide-y divide-line md:hidden">
            {usuarios.map((usr) => {
              const suc = sucursales.find((s) => s.id === usr.sucursal_id);
              return (
                <li key={usr.id} className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-semibold text-ink">
                        {usr.nombre_completo}
                      </span>
                      <Badge tono={tonoRol[usr.rol]}>{usr.rol}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[11.5px] text-ink-muted">
                      {suc ? suc.nombre : 'Global / todas'} ·{' '}
                      <span className={usr.activo ? 'text-ok' : 'text-danger'}>
                        {usr.activo ? 'habilitado' : 'bloqueado'}
                      </span>
                    </p>
                  </div>
                  <IconButton
                    etiqueta={`Editar a ${usr.nombre_completo}`}
                    tamano="sm"
                    onClick={() => abrirEditarUsuario(usr)}
                    icono={<Edit3 className="size-3.5" strokeWidth={2.25} />}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Crear / editar sucursal */}
      <Modal
        abierto={modalSucursalAbierto}
        onCerrar={() => setModalSucursalAbierto(false)}
        titulo={sucursalEditando ? 'Editar sucursal' : 'Nueva sucursal'}
        descripcion="Cada sucursal opera su propia caja, turnos e inventario."
        posicion="centro"
        ancho="md"
        pie={
          <div className="flex items-center gap-2">
            <Button variante="secundaria" onClick={() => setModalSucursalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="form-sucursal" bloque cargando={guardandoSucursal}>
              {guardandoSucursal
                ? 'Guardando…'
                : sucursalEditando
                  ? 'Actualizar sucursal'
                  : 'Crear sucursal'}
            </Button>
          </div>
        }
      >
        <form id="form-sucursal" onSubmit={handleGuardarSucursal} className="space-y-4 p-5">
          <Field etiqueta="Nombre" htmlFor="suc-nombre">
            <Input
              id="suc-nombre"
              type="text"
              required
              value={sucNombre}
              onChange={(e) => setSucNombre(e.target.value)}
              placeholder="Ej. Sucursal Central, Prado"
            />
          </Field>
          <Field etiqueta="Dirección" htmlFor="suc-direccion">
            <Input
              id="suc-direccion"
              type="text"
              required
              value={sucDireccion}
              onChange={(e) => setSucDireccion(e.target.value)}
              placeholder="Av. Blanco Galindo Km 4"
            />
          </Field>
          <Field etiqueta="Teléfono" htmlFor="suc-telefono">
            <Input
              id="suc-telefono"
              type="tel"
              required
              value={sucTelefono}
              onChange={(e) => setSucTelefono(e.target.value)}
              placeholder="+591 70000000"
            />
          </Field>
        </form>
      </Modal>

      {/* Eliminar sucursal */}
      <Modal
        abierto={!!sucursalParaEliminar}
        onCerrar={() => setSucursalParaEliminar(null)}
        titulo="¿Eliminar sucursal?"
        posicion="centro"
        ancho="ajustado"
        pie={
          <div className="flex items-center gap-2">
            <Button
              variante="secundaria"
              onClick={() => setSucursalParaEliminar(null)}
              disabled={eliminandoSucursal}
            >
              Cancelar
            </Button>
            <Button
              variante="peligro"
              bloque
              cargando={eliminandoSucursal}
              onClick={handleEliminarSucursal}
              icono={<Trash2 className="size-4" strokeWidth={2.25} />}
            >
              {eliminandoSucursal ? 'Eliminando…' : 'Sí, eliminar'}
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] border border-danger/35 bg-danger/12 text-danger">
            <AlertTriangle className="size-5" strokeWidth={2.25} aria-hidden />
          </span>
          <p className="text-[13px] leading-5 text-ink-soft">
            Se eliminará <strong className="font-semibold text-ink">{sucursalParaEliminar?.nombre}</strong>.
            Si tiene pedidos o turnos registrados, se deshabilitará para proteger la auditoría.
          </p>
        </div>
      </Modal>

      {/* Editar operador */}
      <Modal
        abierto={modalUsuarioAbierto}
        onCerrar={() => setModalUsuarioAbierto(false)}
        titulo="Editar operador"
        descripcion="El rol define a qué panel entra y qué puede modificar."
        posicion="centro"
        ancho="md"
        pie={
          <div className="flex items-center gap-2">
            <Button variante="secundaria" onClick={() => setModalUsuarioAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="form-operador" bloque cargando={guardandoUsuario}>
              {guardandoUsuario ? 'Actualizando…' : 'Guardar cambios'}
            </Button>
          </div>
        }
      >
        <form id="form-operador" onSubmit={handleGuardarUsuario} className="space-y-4 p-5">
          <Field etiqueta="Nombre completo" htmlFor="usr-nombre">
            <Input
              id="usr-nombre"
              type="text"
              required
              value={usrNombre}
              onChange={(e) => setUsrNombre(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field etiqueta="Rol" htmlFor="usr-rol">
              <select
                id="usr-rol"
                value={usrRol}
                onChange={(e) => setUsrRol(e.target.value as RolUsuario)}
                className="h-11 w-full rounded-field border border-line-strong bg-sunken px-2.5 text-[13.5px] text-ink transition-colors hover:border-control focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/25"
              >
                <option value="ADMIN">Administrador</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="CAJERO">Cajero</option>
                <option value="MESERO">Mesero</option>
              </select>
            </Field>

            <Field etiqueta="Sucursal" htmlFor="usr-sucursal">
              <select
                id="usr-sucursal"
                value={usrSucursalId || ''}
                onChange={(e) => setUsrSucursalId(e.target.value ? Number(e.target.value) : null)}
                className="h-11 w-full rounded-field border border-line-strong bg-sunken px-2.5 text-[13.5px] text-ink transition-colors hover:border-control focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/25"
              >
                <option value="">Todas / global</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <label
            htmlFor="usr-activo"
            className="flex cursor-pointer items-start gap-2.5 rounded-field border border-line bg-sunken px-3 py-2.5"
          >
            <input
              id="usr-activo"
              type="checkbox"
              checked={usrActivo}
              onChange={(e) => setUsrActivo(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-ember"
            />
            <span className="text-[12.5px] leading-5 text-ink-soft">
              Cuenta habilitada para operar
            </span>
          </label>

          <p className="flex items-center gap-1.5 font-mono text-[10.5px] text-ink-faint">
            <ShieldCheck className="size-3.5 text-ok" strokeWidth={2.5} aria-hidden />
            {usuarioEditando?.id}
          </p>
        </form>
      </Modal>
    </div>
  );
}
