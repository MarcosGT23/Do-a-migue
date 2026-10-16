import { useState, useMemo } from 'react';
import {
  Search, CheckCircle2,
  AlertTriangle, Clock, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';

interface CajaAuditoria {
  id: number;
  monto_inicial: number;
  monto_efectivo_sistema: number;
  monto_digital_sistema: number;
  monto_efectivo_declarado: number;
  monto_digital_declarado: number;
  diferencia_efectivo: number;
  diferencia_digital: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: 'ABIERTA' | 'CERRADA';
  usuario_nombre: string;
}

interface Props {
  cajas: CajaAuditoria[];
}

export default function CajasManager({ cajas }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | 'ABIERTA' | 'CERRADA'>('TODAS');

  const cajasFiltradas = useMemo(() => {
    return cajas.filter((c) => {
      const matchEstado = filtroEstado === 'TODAS' || c.estado === filtroEstado;
      const matchTexto =
        c.usuario_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.id.toString().includes(busqueda);
      return matchEstado && matchTexto;
    });
  }, [cajas, filtroEstado, busqueda]);

  const totalCajasAbiertas = cajas.filter((c) => c.estado === 'ABIERTA').length;
  const totalDiferenciasNegativas = cajas.filter(
    (c) => c.estado === 'CERRADA' && Number(c.diferencia_efectivo) < 0
  ).length;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">
            Control de Arqueos y Cierres
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-0.5">
            Auditoría de Cajas
          </h1>
          <p className="text-xs text-[#9c907f] mt-1">
            Supervisión estricta de turnos, arqueos ciegos y diferencias de efectivo vs digital.
          </p>
        </div>

        {/* Métricas Rápidas */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-[#1a1715] border border-[#2b2520] flex items-center gap-3 text-xs">
            <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[#8c806f] block text-[10px]">Cajas en Operación</span>
              <span className="font-bold text-white num-tabular">{totalCajasAbiertas} activas</span>
            </div>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-[#1a1715] border border-[#2b2520] flex items-center gap-3 text-xs">
            <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-800/40 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[#8c806f] block text-[10px]">Descuadres Reportados</span>
              <span className="font-bold text-amber-400 num-tabular">{totalDiferenciasNegativas} turnos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#1a1715] border border-[#2b2520] p-4 rounded-2xl">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#7a6f5f] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cajero o número de turno..."
            className="w-full pl-10 pr-4 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white placeholder-[#6e6355] focus:outline-none focus:border-amber-600 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['TODAS', 'ABIERTA', 'CERRADA'] as const).map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
                filtroEstado === estado
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-600/40'
                  : 'text-[#9c907f] hover:text-white bg-[#100f0e]'
              }`}
            >
              {estado === 'TODAS' ? 'Todos' : estado === 'ABIERTA' ? 'En Curso' : 'Cerrados'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Auditoría */}
      <div className="bg-[#1a1715] border border-[#2b2520] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#29231e] text-[#8c806f] uppercase tracking-wider bg-[#141210]">
                <th className="py-3 px-4 font-semibold">Turno / Cajero</th>
                <th className="py-3 px-4 font-semibold">Fondo Inicial</th>
                <th className="py-3 px-4 font-semibold">Efectivo Sistema vs Declarado</th>
                <th className="py-3 px-4 font-semibold">Digital Sistema vs Declarado</th>
                <th className="py-3 px-4 font-semibold">Diferencia</th>
                <th className="py-3 px-4 font-semibold">Estado</th>
                <th className="py-3 px-4 font-semibold">Fecha Apertura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26211c]">
              {cajasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6e6355]">
                    No hay turnos registrados con este criterio.
                  </td>
                </tr>
              ) : (
                cajasFiltradas.map((c) => {
                  const difEfec = Number(c.diferencia_efectivo) || 0;
                  const difDig = Number(c.diferencia_digital) || 0;
                  const totalDif = difEfec + difDig;

                  return (
                    <tr key={c.id} className="hover:bg-[#201d19] transition">
                      <td className="py-3 px-4 font-medium text-white">
                        <span className="font-extrabold text-amber-400 mr-2 num-tabular">#{c.id}</span>
                        <span>{c.usuario_nombre}</span>
                      </td>
                      <td className="py-3 px-4 text-[#ede7dc] num-tabular">
                        Bs {Number(c.monto_inicial).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        {c.estado === 'CERRADA' ? (
                          <div className="text-[11px] num-tabular">
                            <span className="text-[#7a6f5f]">Sis: </span>
                            <span className="font-semibold text-[#ede7dc]">
                              Bs {Number(c.monto_efectivo_sistema).toFixed(2)}
                            </span>
                            <span className="text-[#473f36] mx-1">|</span>
                            <span className="text-[#7a6f5f]">Decl: </span>
                            <span className="font-bold text-white">
                              Bs {Number(c.monto_efectivo_declarado).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#6e6355] italic">Turno en curso...</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {c.estado === 'CERRADA' ? (
                          <div className="text-[11px] num-tabular">
                            <span className="text-[#7a6f5f]">Sis: </span>
                            <span className="font-semibold text-[#ede7dc]">
                              Bs {Number(c.monto_digital_sistema).toFixed(2)}
                            </span>
                            <span className="text-[#473f36] mx-1">|</span>
                            <span className="text-[#7a6f5f]">Decl: </span>
                            <span className="font-bold text-white">
                              Bs {Number(c.monto_digital_declarado).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#6e6355] italic">Turno en curso...</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {c.estado === 'CERRADA' ? (
                          <span
                            className={`inline-flex items-center gap-1 font-bold num-tabular ${
                              totalDif < 0
                                ? 'text-rose-400'
                                : totalDif > 0
                                ? 'text-emerald-400'
                                : 'text-[#a89b88]'
                            }`}
                          >
                            {totalDif < 0 ? (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            ) : totalDif > 0 ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            Bs {totalDif.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[#6e6355]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.estado === 'ABIERTA'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 animate-pulse'
                              : 'bg-[#221f1c] text-[#8c806f] border border-[#2e2721]'
                          }`}
                        >
                          {c.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#8c806f] text-[11px] num-tabular">
                        {new Date(c.fecha_inicio).toLocaleDateString()} {new Date(c.fecha_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
