import React from 'react';
import { motion } from 'framer-motion';
import { Check, Minus, Plus, Scissors, X } from 'lucide-react';
import {
  OPCIONES_CORTE,
  MAX_PIEZAS_CHULETA,
  etiquetasCortes,
  type TipoCorte,
} from '../../core/tiposCorte';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';

interface Props {
  productoNombre: string;
  precioBase: number;
  stockDisponible: number;
  /** Tarjeta del catálogo desde la que se abrió la burbuja. */
  ancla: HTMLElement | null;
  onCerrar: () => void;
  onSeleccionar: (cortes: TipoCorte[], cantidad: number, piezasChuleta?: number) => void;
}

const ANCHO_BURBUJA = 316;
const MARGEN_VENTANA = 12;

export default function PosCorteBurbuja({
  productoNombre,
  precioBase,
  stockDisponible,
  ancla,
  onCerrar,
  onSeleccionar,
}: Props) {
  const [seleccion, setSeleccion] = React.useState<TipoCorte[]>(['COMPLETO']);
  const [piezas, setPiezas] = React.useState<number>(1);
  /** En pantallas angostas la burbuja anclada no cabe: se usa hoja inferior. */
  const [angosta, setAngosta] = React.useState(false);
  const [posicion, setPosicion] = React.useState<{
    left: number;
    top: number;
    placement: 'arriba' | 'abajo';
    cola: number;
    altoMaximo: number;
  } | null>(null);

  const panelRef = React.useRef<HTMLDivElement>(null);

  const maxPiezas = Math.max(1, Math.min(MAX_PIEZAS_CHULETA, stockDisponible));

  // "Completo" es la porción estándar: excluye a los demás cortes.
  const incluyeChuleta = seleccion.includes('CHULETA');

  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px), (max-height: 560px)');
    const aplicar = () => setAngosta(mq.matches);
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, []);

  // Recalcula la posición de la burbuja respecto de la tarjeta que la abrió.
  // La burbuja nunca debe salirse de la ventana: si no cabe debajo se coloca
  // arriba y, en última instancia, se limita al alto disponible con scroll.
  const posicionar = React.useCallback(() => {
    if (!ancla || !panelRef.current || angosta) return;
    const rectAncla = ancla.getBoundingClientRect();
    const altoVentana = window.innerHeight;
    const altoMaximo = Math.max(180, altoVentana - MARGEN_VENTANA * 2);
    const alto = Math.min(panelRef.current.offsetHeight || 320, altoMaximo);
    const ancho = panelRef.current.offsetWidth || ANCHO_BURBUJA;

    const centroX = rectAncla.left + rectAncla.width / 2;
    let left = centroX - ancho / 2;
    left = Math.max(MARGEN_VENTANA, Math.min(left, window.innerWidth - ancho - MARGEN_VENTANA));

    const espacioDebajo = altoVentana - rectAncla.bottom;
    const espacioArriba = rectAncla.top;
    const colocarArriba = espacioDebajo < alto + 24 && espacioArriba > espacioDebajo;

    const topBruto = colocarArriba ? rectAncla.top - 12 - alto : rectAncla.bottom + 12;
    const top = Math.max(
      MARGEN_VENTANA,
      Math.min(topBruto, altoVentana - alto - MARGEN_VENTANA)
    );
    const cola = Math.max(16, Math.min(centroX - left, ancho - 16));

    setPosicion({ left, top, placement: colocarArriba ? 'arriba' : 'abajo', cola, altoMaximo });
  }, [ancla, angosta]);

  React.useLayoutEffect(() => {
    posicionar();
  }, [posicionar]);

  // La burbuja cambia de alto (contador de chuletas): se vuelve a posicionar.
  React.useEffect(() => {
    if (!panelRef.current || angosta) return;
    const observer = new ResizeObserver(() => posicionar());
    observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, [posicionar, angosta]);

  React.useEffect(() => {
    const alMover = () => posicionar();
    window.addEventListener('scroll', alMover, true);
    window.addEventListener('resize', alMover);
    return () => {
      window.removeEventListener('scroll', alMover);
      window.removeEventListener('resize', alMover);
    };
  }, [posicionar]);

  React.useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [onCerrar]);

  const alternar = (id: TipoCorte) => {
    if (id === 'COMPLETO') {
      setSeleccion(['COMPLETO']);
      return;
    }
    setSeleccion((prev) => {
      const sinCompleto = prev.filter((c) => c !== 'COMPLETO');
      return sinCompleto.includes(id)
        ? sinCompleto.filter((c) => c !== id)
        : [...sinCompleto, id];
    });
  };

  const cambiarPiezas = (delta: number) => {
    setPiezas((prev) => Math.max(1, Math.min(maxPiezas, prev + delta)));
  };

  // Al añadir chuleta no se multiplica el precio, se mantiene el precio base del plato.
  // El contador de piezas solo determina cuántas chuletas van en la porción.
  const cantidadFinal = 1;
  const total = precioBase;

  const otrosCortes = etiquetasCortes(seleccion.filter((c) => c !== 'CHULETA'));
  const textoChuletas = `${piezas} ${piezas === 1 ? 'chuleta' : 'chuletas'}`;
  const resumen = incluyeChuleta
    ? otrosCortes
      ? `${otrosCortes} + ${textoChuletas}`
      : textoChuletas
    : etiquetasCortes(seleccion) || 'Sin corte';

  const contenido = (
    <>
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 pb-3 pt-3.5">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ember">
            <Scissors className="size-3" strokeWidth={2.5} aria-hidden />
            Tipo de corte
          </p>
          <h3 className="mt-1 truncate text-[15px] font-bold leading-tight tracking-[-0.01em] text-ink">
            {productoNombre}
          </h3>
          <p className="mt-0.5 font-mono text-[11.5px] text-ink-muted tnum">
            Bs {precioBase.toFixed(2)} por unidad
          </p>
        </div>
        <IconButton
          etiqueta="Cerrar"
          onClick={onCerrar}
          tamano="sm"
          icono={<X className="size-4" strokeWidth={2.25} />}
        />
      </div>

      {/* Cortes combinables */}
      <div className="grid grid-cols-2 gap-2 p-3">
        {OPCIONES_CORTE.map((opt) => {
          const activa = seleccion.includes(opt.id);
          const ocupaDosColumnas = opt.id === 'CHULETA';
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => alternar(opt.id)}
              aria-pressed={activa}
              className={`relative flex min-h-14 flex-col items-start justify-center rounded-[11px] border px-3 py-2 text-left transition-colors ${
                ocupaDosColumnas ? 'col-span-2' : ''
              } ${
                activa
                  ? 'border-ember/60 bg-ember/12'
                  : 'border-line-strong bg-sunken hover:border-control hover:bg-raised'
              }`}
            >
              <span className="flex items-center gap-1.5 pr-5 text-[13.5px] font-bold leading-none text-ink">
                {opt.nombre}
              </span>
              <span className="mt-1 text-[11px] leading-tight text-ink-muted">{opt.descripcion}</span>
              {activa && (
                <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-ember text-app">
                  <Check className="size-3" strokeWidth={3.5} aria-hidden />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="px-3 pb-2 text-[11px] leading-4 text-ink-muted">
        Puedes combinar varios cortes. «Completo» es la porción estándar y va solo.
      </p>

      {/* Contador de piezas (solo chuleta) */}
      <motion.div
        initial={false}
        animate={{ height: incluyeChuleta ? 'auto' : 0, opacity: incluyeChuleta ? 1 : 0 }}
        transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
        className="overflow-hidden"
      >
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between gap-3 rounded-[11px] border border-line bg-sunken p-2.5">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink">Piezas de chuleta</p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                Máximo {maxPiezas} {maxPiezas === 1 ? 'pieza' : 'piezas'} en stock
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => cambiarPiezas(-1)}
                disabled={piezas <= 1}
                aria-label="Quitar una pieza"
                className="flex size-10 items-center justify-center rounded-[9px] border border-line-strong bg-raised text-ink-soft transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-35"
              >
                <Minus className="size-4" strokeWidth={2.5} />
              </button>
              <span className="w-7 text-center font-mono text-[17px] font-bold text-ember tnum">
                {piezas}
              </span>
              <button
                type="button"
                onClick={() => cambiarPiezas(1)}
                disabled={piezas >= maxPiezas}
                aria-label="Agregar una pieza"
                className="flex size-10 items-center justify-center rounded-[9px] border border-line-strong bg-raised text-ember transition-colors hover:bg-ember/12 disabled:pointer-events-none disabled:opacity-35"
              >
                <Plus className="size-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Resumen y acciones */}
      <div className="space-y-2.5 border-t border-line px-3 pb-3 pt-3">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <span className="truncate text-[12px] text-ink-soft">{resumen}</span>
          <span className="shrink-0 font-mono text-[15px] font-semibold text-ember tnum">
            Bs {total.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variante="secundaria" tamano="md" onClick={onCerrar} className="shrink-0">
            Cancelar
          </Button>
          <Button
            variante="primaria"
            tamano="md"
            bloque
            onClick={() => onSeleccionar(seleccion, cantidadFinal, incluyeChuleta ? piezas : undefined)}
          >
            Añadir a la comanda
          </Button>
        </div>
      </div>
    </>
  );

  // Pantallas angostas: hoja inferior, siempre alcanzable con el pulgar.
  if (angosta) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[70] flex items-end"
      >
        <div
          onClick={onCerrar}
          className="absolute inset-0 bg-sunken/80 backdrop-blur-[2px]"
          aria-hidden
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Tipo de corte para ${productoNombre}`}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="relative w-full overflow-hidden rounded-t-panel border border-b-0 border-line-strong bg-chrome pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-pop"
        >
          {contenido}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="pointer-events-none fixed inset-0 z-[70]"
    >
      <div
        onClick={onCerrar}
        className="pointer-events-auto absolute inset-0 bg-sunken/60 backdrop-blur-[2px]"
        aria-hidden
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Tipo de corte para ${productoNombre}`}
        initial={{ opacity: 0, scale: 0.94, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        style={{
          position: 'absolute',
          left: posicion?.left ?? 0,
          top: posicion?.top ?? 0,
          width: ANCHO_BURBUJA,
          visibility: posicion ? 'visible' : 'hidden',
          transformOrigin: posicion?.placement === 'arriba' ? 'bottom center' : 'top center',
        }}
        className="pointer-events-auto overflow-hidden rounded-panel border border-line-strong bg-chrome shadow-pop"
      >
        {posicion && (
          <span
            aria-hidden
            className="absolute size-3 rotate-45 border-line-strong bg-chrome"
            style={{
              left: posicion.cola - 6,
              ...(posicion.placement === 'arriba'
                ? { bottom: -7, borderRight: 'none', borderBottom: 'none' }
                : { top: -7, borderLeft: 'none', borderTop: 'none' }),
            }}
          />
        )}
        <div
          className="overscroll-contain"
          style={{
            maxHeight: posicion ? Math.max(180, posicion.altoMaximo - 2) : undefined,
            overflowY: 'auto',
          }}
        >
          {contenido}
        </div>
      </motion.div>
    </motion.div>
  );
}
