import { useState, useMemo } from 'react';
import {
  Search, CheckCircle2, AlertTriangle, Clock,
  ArrowDownLeft, ArrowUpRight, X,
} from 'lucide-react';
import { Badge } from '../ui/Badge';

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

const FILTROS = [
  { id: 'TODAS', label: 'Todos' },
  { id: 'ABIERTA', label: 'En curso' },
  { id: 'CERRADA', label: 'Cerrados' },
] as const;

function fechaCorta(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
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
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      {/* Cabecera */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ember">
            Control de arqueos y cierres
          </p>
          <h1 className="mt-1 text-[22px] font-extrabold leading-tight tracking-[-0.025em] text-ink sm:text-[26px]">
            Auditoría de cajas
          </h1>
          <p className="mt-1 max-w-xl text-[12.5px] leading-5 text-ink-muted">
            Turnos, arqueos ciegos y diferencias entre lo declarado y lo registrado por el sistema.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="flex items-center gap-2.5 rounded-card border border-line-strong bg-card px-3 py-2">
            <Clock className="size-4 text-ok" strokeWidth={2.25} aria-hidden />
            <div>
              <span className="block text-[10px] uppercase tracking-[0.07em] text-ink-muted">
                En operación
              </span>
              <span className="font-mono text-[13px] font-bold text-ink tnum">
                {totalCajasAbiertas} {totalCajasAbiertas === 1 ? 'activa' : 'activas'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-card border border-line-strong bg-card px-3 py-2">
            <AlertTriangle
              className={`size-4 ${totalDiferenciasNegativas > 0 ? 'text-warn' : 'text-ink-faint'}`}
              strokeWidth={2.25}
              aria-hidden
            />
            <div>
              <span className="block text-[10px] uppercase tracking-[0.07em] text-ink-muted">
                Descuadres
              </span>
              <span
                className={`font-mono text-[13px] font-bold tnum ${
                  totalDiferenciasNegativas > 0 ? 'text-warn' : 'text-ink'
                }`}
              >
                {totalDiferenciasNegativas} {totalDiferenciasNegativas === 1 ? 'turno' : 'turnos'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="mt-5 flex flex-col gap-2.5 rounded-card border border-line-strong bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            strokeWidth={2}
            aria-hidden
          />
          <label htmlFor="cajas-busqueda" className="sr-only">
            Buscar caja
          </label>
          <input
            id="cajas-busqueda"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cajero o número de turno"
            className="h-10 w-full rounded-field border border-line-strong bg-sunken pl-9 pr-8 text-[13.5px] text-ink placeholder:text-ink-faint transition-colors hover:border-control focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/25 [&::-webkit-search-cancel-button]:hidden"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:bg-raised hover:text-ink"
            >
              <X className="size-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 rounded-field border border-line bg-sunken p-0.5">
          {FILTROS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltroEstado(id)}
              aria-pressed={filtroEstado === id}
              className={`h-9 flex-1 rounded-[7px] px-3 text-[12.5px] font-semibold transition-colors sm:flex-none ${
                filtroEstado === id
                  ? 'bg-raised text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Listado */}
      <section className="mt-3 overflow-hidden rounded-card border border-line-strong bg-card">
        {cajasFiltradas.length === 0 ? (
          <p className="px-4 py-12 text-center text-[12.5px] text-ink-faint">
            No hay turnos registrados con este criterio.
          </p>
        ) : (
          <>
            {/* Escritorio */}
            <table className="hidden w-full border-collapse text-left lg:table">
              <caption className="sr-only">
                Turnos de caja con fondo inicial, arqueo de efectivo y digital, diferencia y estado
              </caption>
              <thead>
                <tr className="border-b border-line bg-sunken text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                  <th scope="col" className="px-4 py-2.5 font-semibold">Turno / cajero</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Fondo</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Efectivo (sis / decl)</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Digital (sis / decl)</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Diferencia</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Estado</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Apertura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {cajasFiltradas.map((c) => {
                  const difEfec = Number(c.diferencia_efectivo) || 0;
                  const difDig = Number(c.diferencia_digital) || 0;
                  const totalDif = difEfec + difDig;

                  return (
                    <tr key={c.id} className="transition-colors hover:bg-raised/60">
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-[12.5px] font-bold text-ember tnum">
                          #{String(c.id).padStart(3, '0')}
                        </span>
                        <span className="mt-0.5 block max-w-[150px] truncate text-[12.5px] text-ink">
                          {c.usuario_nombre}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[12px] text-ink-soft tnum">
                        {Number(c.monto_inicial).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5">
                        {c.estado === 'CERRADA' ? (
                          <span className="font-mono text-[11.5px] text-ink-muted tnum">
                            {Number(c.monto_efectivo_sistema).toFixed(2)}
                            <span aria-hidden className="mx-1 text-ink-faint">/</span>
                            <span className="font-semibold text-ink">
                              {Number(c.monto_efectivo_declarado).toFixed(2)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[11.5px] italic text-ink-faint">En curso…</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {c.estado === 'CERRADA' ? (
                          <span className="font-mono text-[11.5px] text-ink-muted tnum">
                            {Number(c.monto_digital_sistema).toFixed(2)}
                            <span aria-hidden className="mx-1 text-ink-faint">/</span>
                            <span className="font-semibold text-ink">
                              {Number(c.monto_digital_declarado).toFixed(2)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[11.5px] italic text-ink-faint">En curso…</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {c.estado === 'CERRADA' ? (
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-[12px] font-bold tnum ${
                              totalDif < 0 ? 'text-danger' : totalDif > 0 ? 'text-ok' : 'text-ink-soft'
                            }`}
                          >
                            {totalDif < 0 ? (
                              <ArrowDownLeft className="size-3.5" strokeWidth={2.75} aria-hidden />
                            ) : totalDif > 0 ? (
                              <ArrowUpRight className="size-3.5" strokeWidth={2.75} aria-hidden />
                            ) : (
                              <CheckCircle2 className="size-3.5" strokeWidth={2.75} aria-hidden />
                            )}
                            {totalDif.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[12px] text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tono={c.estado === 'ABIERTA' ? 'ok' : 'neutro'}>{c.estado}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-ink-muted tnum">
                        {fechaCorta(c.fecha_inicio)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Móvil / tablet */}
            <ul className="divide-y divide-line lg:hidden">
              {cajasFiltradas.map((c) => {
                const difEfec = Number(c.diferencia_efectivo) || 0;
                const difDig = Number(c.diferencia_digital) || 0;
                const totalDif = difEfec + difDig;
                const cerrada = c.estado === 'CERRADA';

                return (
                  <li key={c.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-[13px] font-bold text-ember tnum">
                            #{String(c.id).padStart(3, '0')}
                          </span>
                          <span className="truncate text-[13px] font-semibold text-ink">
                            {c.usuario_nombre}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[10.5px] text-ink-faint tnum">
                          Apertura {fechaCorta(c.fecha_inicio)}
                        </p>
                      </div>
                      <Badge tono={c.estado === 'ABIERTA' ? 'ok' : 'neutro'}>{c.estado}</Badge>
                    </div>

                    <dl className="mt-2.5 grid grid-cols-2 gap-2 rounded-[10px] border border-line bg-sunken p-2.5">
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.07em] text-ink-muted">
                          Fondo inicial
                        </dt>
                        <dd className="font-mono text-[12.5px] font-semibold text-ink tnum">
                          Bs {Number(c.monto_inicial).toFixed(2)}
                        </dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-[10px] uppercase tracking-[0.07em] text-ink-muted">
                          Diferencia
                        </dt>
                        <dd
                          className={`font-mono text-[12.5px] font-bold tnum ${
                            !cerrada
                              ? 'text-ink-faint'
                              : totalDif < 0
                                ? 'text-danger'
                                : totalDif > 0
                                  ? 'text-ok'
                                  : 'text-ink-soft'
                          }`}
                        >
                          {cerrada ? `Bs ${totalDif.toFixed(2)}` : '—'}
                        </dd>
                      </div>

                      <div className="col-span-2 mt-0.5 grid grid-cols-2 gap-2 border-t border-line pt-2">
                        <div>
                          <dt className="text-[10px] uppercase tracking-[0.07em] text-ink-muted">
                            Efectivo
                          </dt>
                          <dd className="font-mono text-[11.5px] text-ink-muted tnum">
                            {cerrada ? (
                              <>
                                {Number(c.monto_efectivo_sistema).toFixed(2)} /{' '}
                                <span className="font-semibold text-ink">
                                  {Number(c.monto_efectivo_declarado).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              'En curso'
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] uppercase tracking-[0.07em] text-ink-muted">
                            Digital
                          </dt>
                          <dd className="font-mono text-[11.5px] text-ink-muted tnum">
                            {cerrada ? (
                              <>
                                {Number(c.monto_digital_sistema).toFixed(2)} /{' '}
                                <span className="font-semibold text-ink">
                                  {Number(c.monto_digital_declarado).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              'En curso'
                            )}
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <p className="mt-2 font-mono text-[10.5px] text-ink-faint">
        Sistema / declarado · diferencia = efectivo + digital
      </p>
    </div>
  );
}
