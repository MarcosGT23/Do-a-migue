import { Flame, Lock as LockIcon, Shield, LogOut, UserCheck, Search, X, Receipt } from 'lucide-react';
import { PosService } from '../../services/pos.service';

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

  return (
    <header className="px-6 py-3.5 bg-[#171513] border-b border-[#2b2520] flex items-center justify-between gap-5 shrink-0 select-none">
      {/* Identidad de Marca: Doña Migue */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600/30 to-orange-700/20 border border-amber-600/40 text-amber-500 flex items-center justify-center shadow-inner">
          <Flame className="w-5 h-5 fill-amber-500/20" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-base tracking-tight">Doña Migue</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-600/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Caja #{cajaId} • ABIERTA
            </span>
          </div>
          <p className="text-[11px] text-[#9e9382]">
            {sucursalNombre}
            {cajaInfo?.monto_inicial ? ` • Fondo inicial: Bs ${cajaInfo.monto_inicial}` : ''}
          </p>
        </div>
      </div>

      {/* Buscador de Platos y Productos */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-[#7a6f5f] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          placeholder="Buscar plato o bebida (ej. Kjara, Costilla, Refresco)..."
          className="w-full pl-10 pr-9 py-2 bg-[#100f0e] border border-[#2e2721] rounded-xl text-xs text-[#ede7dc] placeholder-[#6e6355] focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30 transition"
        />
        {busqueda && (
          <button
            onClick={() => onBusquedaChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a6f5f] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Acciones y Operador */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#100f0e] border border-[#29231e]">
          <div className="w-6 h-6 rounded-lg bg-emerald-950/60 border border-emerald-700/40 text-emerald-400 flex items-center justify-center">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#ede7dc] leading-tight">{cajeroNombre}</p>
            <span className="text-[9px] font-semibold text-[#8a7e6e] uppercase tracking-wider">{rol}</span>
          </div>
        </div>

        {esAdminOSupervisor && (
          <a
            href="/admin/dashboard"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-950/40 text-amber-400 border border-amber-700/40 hover:bg-orange-900/40 text-xs font-semibold transition"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </a>
        )}

        <button
          type="button"
          onClick={onAbrirHistorial}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#201b17] hover:bg-amber-950/40 text-amber-300 border border-amber-600/30 hover:border-amber-600/60 text-xs font-bold transition shadow-sm cursor-pointer"
          title="Ver historial de pedidos y editar comandas"
        >
          <Receipt className="w-3.5 h-3.5 text-amber-400" />
          <span>Historial</span>
        </button>

        <button
          onClick={onAbrirArqueo}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/30 text-rose-300 border border-rose-800/40 hover:bg-red-900/40 text-xs font-semibold transition"
        >
          <LockIcon className="w-3.5 h-3.5" />
          <span>Cerrar Caja</span>
        </button>

        <button
          onClick={handleLogout}
          title="Cerrar sesión y volver al login"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181513] hover:bg-rose-950/40 text-[#c2b4a3] hover:text-rose-200 border border-[#2e2620] hover:border-rose-800/50 text-xs font-semibold transition shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </header>
  );
}
