import { Flame, LogOut, Search, Shield, Receipt, Lock as LockIcon, X } from 'lucide-react';
import { PosService } from '../../services/pos.service';
import { IconButton } from '../ui/IconButton';
import { Badge } from '../ui/Badge';

interface Props {
  sucursalNombre: string;
  cajaId: number;
  cajaInfo?: any | null;
  cajeroNombre: string;
  rol: string;
  esAdminOSupervisor: boolean;
  busqueda: string;
  onBusquedaChange: (val: string) => void;
  onAbrirArqueo: () => void;
  onAbrirHistorial: () => void;
}

export default function PosHeader({
  sucursalNombre,
  cajaId,
  cajaInfo,
  cajeroNombre,
  rol,
  esAdminOSupervisor,
  busqueda,
  onBusquedaChange,
  onAbrirArqueo,
  onAbrirHistorial,
}: Props) {
  const handleLogout = async () => {
    await PosService.cerrarSesion();
    window.location.href = '/login';
  };

  const inicial = cajeroNombre.trim().charAt(0).toUpperCase() || '?';

  return (
    <header className="shrink-0 select-none border-b border-line bg-chrome/95 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:flex-nowrap sm:px-5 sm:py-2.5">
        {/* Identidad y estado del turno */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-ember/35 bg-ember/12 text-ember">
            <Flame className="size-5 fill-ember/25" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
                Doña Migue
              </span>
              <Badge tono="ok" mono className="hidden sm:inline-flex">
                <span className="size-1.5 rounded-full bg-ok" aria-hidden />
                Caja {cajaId}
              </Badge>
            </div>
            <p className="truncate text-[11px] leading-tight text-ink-muted">
              {sucursalNombre}
              {cajaInfo?.monto_inicial
                ? ` · Fondo Bs ${Number(cajaInfo.monto_inicial).toFixed(2)}`
                : ''}
            </p>
          </div>
        </div>

        {/* Buscador: en pantallas angostas cae a una línea propia */}
        <div className="order-3 w-full sm:order-none sm:w-auto sm:min-w-40 sm:max-w-md sm:flex-1">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
              strokeWidth={2}
              aria-hidden
            />
            <label htmlFor="pos-busqueda" className="sr-only">
              Buscar plato o bebida
            </label>
            <input
              id="pos-busqueda"
              type="search"
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              placeholder="Buscar plato o bebida…"
              autoComplete="off"
              className="h-11 w-full rounded-field border border-line-strong bg-sunken pl-10 pr-9 text-[15px] text-ink placeholder:text-ink-faint transition-colors hover:border-control focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/25 [&::-webkit-search-cancel-button]:hidden"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => onBusquedaChange('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-raised hover:text-ink"
              >
                <X className="size-3.5" strokeWidth={2.25} />
              </button>
            )}
          </div>
        </div>

        {/* Acciones: etiquetas en escritorio, iconos con nombre accesible en táctil */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <div className="mr-1 hidden items-center gap-2 rounded-field border border-line bg-sunken px-2.5 py-1.5 lg:flex">
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-lg border border-ok/35 bg-ok/12 text-[11px] font-bold text-ok"
            >
              {inicial}
            </span>
            <span className="min-w-0">
              <span className="block max-w-32 truncate text-[12px] font-semibold leading-tight text-ink">
                {cajeroNombre}
              </span>
              <span className="block text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-ink-muted">
                {rol}
              </span>
            </span>
          </div>

          {esAdminOSupervisor && (
            <a
              href="/admin/dashboard"
              className="inline-flex h-10 items-center gap-2 rounded-field border border-ember/35 bg-ember/10 px-3 text-[13px] font-semibold text-ember transition-colors hover:bg-ember/18"
              title="Ir al panel de administración"
            >
              <Shield className="size-4" strokeWidth={2.25} />
              <span className="hidden lg:inline">Admin</span>
            </a>
          )}

          <button
            type="button"
            onClick={onAbrirHistorial}
            className="inline-flex h-10 items-center gap-2 rounded-field border border-line-strong bg-raised px-3 text-[13px] font-semibold text-ink transition-colors hover:border-ember/45 hover:text-ember"
            title="Historial de comandas"
          >
            <Receipt className="size-4 text-ember" strokeWidth={2.25} />
            <span className="hidden lg:inline">Historial</span>
          </button>

          <button
            type="button"
            onClick={onAbrirArqueo}
            className="inline-flex h-10 items-center gap-2 rounded-field border border-line-strong bg-raised px-3 text-[13px] font-semibold text-ink transition-colors hover:border-danger/45 hover:bg-danger/12 hover:text-danger"
            title="Arqueo y cierre de caja"
          >
            <LockIcon className="size-4" strokeWidth={2.25} />
            <span className="hidden lg:inline">Cerrar caja</span>
          </button>

          <IconButton
            etiqueta="Cerrar sesión"
            onClick={handleLogout}
            tono="peligro"
            icono={<LogOut className="size-4.5" strokeWidth={2} />}
          />
        </div>
      </div>
    </header>
  );
}
