import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  PackageSearch,
  WalletCards,
  Building2,
  ChevronLeft,
  ChevronRight,
  Flame,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { PosService } from '../../services/pos.service';

interface Props {
  rutaActual: string;
  adminNombre: string;
  sucursalNombre: string;
}

const enlacesAdmin = [
  { href: '/admin/dashboard', label: 'Monitor y Kardex', icon: LayoutDashboard },
  { href: '/admin/catalogo', label: 'Carta y Menú', icon: PackageSearch },
  { href: '/admin/cajas', label: 'Auditoría de Cajas', icon: WalletCards },
  { href: '/admin/organizacion', label: 'Sucursales y Personal', icon: Building2 },
];

function Marca({ sucursal, compacta = false }: { sucursal: string; compacta?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] border border-ember/35 bg-ember/12 text-ember">
        <Flame className="size-4.5 fill-ember/25" strokeWidth={2} />
      </span>
      {!compacta && (
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-extrabold leading-tight tracking-[-0.01em] text-ink">
            Doña Migue
          </span>
          <span className="block truncate text-[11px] leading-tight text-ink-muted">{sucursal}</span>
        </span>
      )}
    </div>
  );
}

export default function AdminSidebar({ rutaActual, adminNombre, sucursalNombre }: Props) {
  const [colapsado, setColapsado] = useState(false);
  const [movil, setMovil] = useState(false);

  useEffect(() => {
    if (!movil) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMovil(false);
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [movil]);

  const handleLogout = async () => {
    await PosService.cerrarSesion();
    window.location.href = '/login';
  };

  const navegacion = (compacta: boolean, alNavegar?: () => void) => (
    <nav aria-label="Navegación principal" className="space-y-1">
      {enlacesAdmin.map(({ href, label, icon: Icon }) => {
        const activo = rutaActual.startsWith(href);
        return (
          <a
            key={href}
            href={href}
            onClick={alNavegar}
            aria-current={activo ? 'page' : undefined}
            title={compacta ? label : undefined}
            className={`group relative flex h-11 items-center gap-3 rounded-[11px] px-3 text-[13px] font-semibold transition-colors duration-150 ${
              activo
                ? 'bg-card text-ember'
                : 'text-ink-soft hover:bg-raised hover:text-ink'
            }`}
          >
            {activo && (
              <span
                aria-hidden
                className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-ember"
              />
            )}
            <Icon
              className={`size-4.5 shrink-0 ${activo ? 'text-ember' : 'text-ink-muted group-hover:text-ink-soft'}`}
              strokeWidth={2}
            />
            {!compacta && <span className="truncate">{label}</span>}
          </a>
        );
      })}
    </nav>
  );

  const pie = (compacta: boolean) => (
    <div className="space-y-1.5 border-t border-line pt-3">
      <a
        href="/pos"
        className="flex h-11 items-center justify-center gap-2 rounded-[11px] border border-ember/30 bg-ember/10 px-3 text-[13px] font-bold text-ember transition-colors hover:bg-ember/18"
        title="Abrir Terminal de Ventas"
      >
        <ExternalLink className="size-4 shrink-0" strokeWidth={2.25} />
        {!compacta && <span>Terminal POS</span>}
      </a>
      <button
        type="button"
        onClick={handleLogout}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-[11px] px-3 text-[12px] font-medium text-ink-muted transition-colors hover:bg-danger/12 hover:text-danger"
      >
        <LogOut className="size-4 shrink-0" strokeWidth={2} />
        {!compacta && <span className="truncate">Salir ({adminNombre.split(' ')[0]})</span>}
      </button>
    </div>
  );

  return (
    <>
      {/* Barra superior en pantallas angostas: el aside no cabe al lado del contenido */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-line bg-chrome/95 px-3 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setMovil(true)}
          aria-label="Abrir menú de navegación"
          aria-expanded={movil}
          className="flex size-10 items-center justify-center rounded-[10px] text-ink-soft transition-colors hover:bg-raised hover:text-ink"
        >
          <Menu className="size-5" strokeWidth={2} />
        </button>
        <Marca sucursal={sucursalNombre} compacta />
        <span className="ml-1 truncate text-[13px] font-semibold text-ink-soft">
          {enlacesAdmin.find((e) => rutaActual.startsWith(e.href))?.label ?? 'Administración'}
        </span>
      </div>

      <AnimatePresence>
        {movil && (
          <>
            <motion.div
              key="velo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 bg-sunken/80 backdrop-blur-sm lg:hidden"
              onClick={() => setMovil(false)}
              aria-hidden
            />
            <motion.aside
              key="panel"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              aria-label="Menú de administración"
              className="fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col justify-between border-r border-line bg-chrome px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-pop lg:hidden"
            >
              <div>
                <div className="mb-4 flex items-center justify-between border-b border-line px-1 pb-3">
                  <Marca sucursal={sucursalNombre} />
                  <button
                    type="button"
                    onClick={() => setMovil(false)}
                    aria-label="Cerrar menú"
                    className="flex size-9 items-center justify-center rounded-[10px] text-ink-muted transition-colors hover:bg-raised hover:text-ink"
                  >
                    <X className="size-4.5" strokeWidth={2} />
                  </button>
                </div>
                {navegacion(false, () => setMovil(false))}
              </div>
              {pie(false)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Aside fijo de escritorio */}
      <motion.aside
        animate={{ width: colapsado ? 76 : 264 }}
        initial={false}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        className="hidden h-dvh shrink-0 flex-col justify-between border-r border-line bg-chrome px-3 pb-3 pt-4 lg:flex"
      >
        <div>
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-line px-1 pb-3.5">
            <Marca sucursal={sucursalNombre} compacta={colapsado} />
            <button
              type="button"
              onClick={() => setColapsado((v) => !v)}
              aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
              aria-expanded={!colapsado}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-raised hover:text-ink"
            >
              {colapsado ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </button>
          </div>
          {navegacion(colapsado)}
        </div>
        {pie(colapsado)}
      </motion.aside>
    </>
  );
}
