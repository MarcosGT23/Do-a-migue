import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, PackageSearch, WalletCards, Building2, 
  ChevronLeft, ChevronRight, Flame, ExternalLink, LogOut 
} from 'lucide-react';
import { PosService } from '../../services/pos.service';

interface Props {
  rutaActual: string;
  adminNombre: string;
  sucursalNombre: string;
}

export default function AdminSidebar({ rutaActual, adminNombre, sucursalNombre }: Props) {
  const [colapsado, setColapsado] = useState(false);

  const enlacesAdmin = [
    { href: '/admin/dashboard', label: 'Monitor y Kardex', icon: LayoutDashboard },
    { href: '/admin/catalogo', label: 'Carta y Menú', icon: PackageSearch },
    { href: '/admin/cajas', label: 'Auditoría de Cajas', icon: WalletCards },
    { href: '/admin/organizacion', label: 'Sucursales y Personal', icon: Building2 },
  ];

  const handleLogout = async () => {
    await PosService.cerrarSesion();
    window.location.href = '/login';
  };

  return (
    <motion.aside
      animate={{ width: colapsado ? 74 : 260 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="h-screen bg-[#161412] border-r border-[#26211c] flex flex-col justify-between p-3 select-none shrink-0 z-30 shadow-2xl"
    >
      <div>
        {/* Cabecera Sidebar con Identidad Doña Migue */}
        <div className="flex items-center justify-between px-2 py-3 border-b border-[#26211c] mb-4">
          {!colapsado && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600/30 to-orange-700/20 border border-amber-600/40 text-amber-500 flex items-center justify-center">
                <Flame className="w-4 h-4 fill-amber-500/20" />
              </div>
              <div>
                <span className="font-extrabold text-white text-xs block leading-tight tracking-tight">Doña Migue</span>
                <span className="text-[10px] text-[#9c907f]">{sucursalNombre}</span>
              </div>
            </motion.div>
          )}
          <button
            onClick={() => setColapsado(!colapsado)}
            className="p-1.5 rounded-xl bg-[#11100f] border border-[#26211c] text-[#8c806f] hover:text-white transition mx-auto"
            title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
          >
            {colapsado ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Enlaces de Navegación */}
        <nav className="space-y-1">
          {enlacesAdmin.map(({ href, label, icon: Icon }) => {
            const activo = rutaActual.startsWith(href);
            return (
              <a
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activo
                    ? 'bg-[#26201a] text-amber-400 border border-amber-600/30 shadow-inner'
                    : 'text-[#9c907f] hover:bg-[#1f1c19] hover:text-[#ede7dc]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${activo ? 'text-amber-500' : 'text-[#7a6f5f]'}`} />
                {!colapsado && <span className="truncate">{label}</span>}
              </a>
            );
          })}
        </nav>
      </div>

      {/* Acceso Rápido a Terminal POS y Logout */}
      <div className="space-y-2 pt-3 border-t border-[#26211c]">
        <a
          href="/pos"
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-600/20 to-orange-600/20 text-amber-300 border border-amber-600/30 hover:bg-amber-600/30 text-xs font-bold transition"
          title="Abrir Terminal de Ventas"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          {!colapsado && <span>Terminal POS</span>}
        </a>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/20 transition w-full"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!colapsado && <span>Salir ({adminNombre.split(' ')[0]})</span>}
        </button>
      </div>
    </motion.aside>
  );
}
