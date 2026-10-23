/**
 * Tipos de corte de carne del POS.
 *
 * Al tocar un plato "mixto" aparece la burbuja de corte: se pueden combinar
 * varios cortes (costilla + matahambre, etc.). "Completo" es la porción
 * estándar del plato y excluye a los demás. La chuleta se vende por piezas,
 * por eso es la única opción que abre el contador de cantidad.
 *
 * En la base de datos los cortes de una línea se guardan en
 * `detalle_pedidos.tipo_corte` como texto separado por comas: 'COSTILLA,MATAHAMBRE'.
 */

export type TipoCorte = 'COMPLETO' | 'COSTILLA' | 'MATAHAMBRE' | 'CHULETA';

export interface OpcionCorte {
  id: TipoCorte;
  nombre: string;
  descripcion: string;
  /** El corte se vende por piezas y necesita contador de cantidad. */
  porPiezas: boolean;
}

export const OPCIONES_CORTE: OpcionCorte[] = [
  { id: 'COMPLETO', nombre: 'Completo', descripcion: 'Porción completa', porPiezas: false },
  { id: 'COSTILLA', nombre: 'Costilla', descripcion: 'Costilla de res', porPiezas: false },
  { id: 'MATAHAMBRE', nombre: 'Matahambre', descripcion: 'Matahambre de res', porPiezas: false },
  { id: 'CHULETA', nombre: 'Chuleta', descripcion: 'Chuletas por pieza', porPiezas: true },
];

/** Tope de piezas de chuleta que se pueden pedir en una sola línea de comanda. */
export const MAX_PIEZAS_CHULETA = 6;

const ETIQUETAS: Record<TipoCorte, string> = {
  COMPLETO: 'Completo',
  COSTILLA: 'Costilla',
  MATAHAMBRE: 'Matahambre',
  CHULETA: 'Chuleta',
};

export function etiquetaCorte(corte: TipoCorte | null | undefined): string {
  return corte ? ETIQUETAS[corte] : '';
}

/** Etiquetas de varios cortes: 'Costilla, Matahambre'. */
export function etiquetasCortes(cortes: TipoCorte[] | null | undefined): string {
  if (!cortes || cortes.length === 0) return '';
  return cortes.map((c) => ETIQUETAS[c] ?? c).join(', ');
}

export function opcionCorte(id: TipoCorte): OpcionCorte {
  return OPCIONES_CORTE.find((o) => o.id === id) ?? OPCIONES_CORTE[0];
}

export function normalizarTipoCorte(valor: string | null | undefined): TipoCorte | null {
  if (!valor) return null;
  const normalizado = valor.trim().toUpperCase();
  return OPCIONES_CORTE.some((o) => o.id === normalizado) ? (normalizado as TipoCorte) : null;
}

/**
 * Convierte el valor de la base de datos ('COSTILLA,MATAHAMBRE') en la lista de
 * cortes de la línea, sin repetir y en el orden del catálogo.
 */
export function parsearCortes(valor: string | null | undefined): TipoCorte[] {
  if (!valor) return [];
  const vistos = new Set<TipoCorte>();
  for (const parte of valor.split(',')) {
    const corte = normalizarTipoCorte(parte);
    if (corte) vistos.add(corte);
  }
  return OPCIONES_CORTE.map((o) => o.id).filter((id) => vistos.has(id));
}

/** Formato de la base de datos: 'COSTILLA,MATAHAMBRE'. */
export function formatearCortes(cortes: TipoCorte[] | null | undefined): string | null {
  if (!cortes || cortes.length === 0) return null;
  const lista = parsearCortes(cortes.join(','));
  // Si ningún valor es un corte válido se devuelve null (nunca cadena vacía:
  // la base de datos no admite '' en tipo_corte).
  return lista.length > 0 ? lista.join(',') : null;
}

// ---------------------------------------------------------------------------
// Detección de los productos que ofrecen cortes
// ---------------------------------------------------------------------------

/**
 * La selección de corte (COMPLETO / COSTILLA / MATAHAMBRE / CHULETA) se ofrece
 * únicamente en los platos cuyo nombre contiene "mixto" (Mixto pequeño,
 * Mixto mediano, Mixto grande, ...). Cualquier otro plato se agrega al carrito
 * directamente, sin corte.
 *
 * Para ampliarlo a otros platos, agrega aquí la palabra correspondiente,
 * por ejemplo: /mixto|costilla/i
 */
const PATRON_PRODUCTOS_CON_CORTES = /mixto/i;

/** Un producto ofrece cortes si su nombre contiene "mixto". */
export function productoTieneCortes(nombreProducto: string | null | undefined): boolean {
  const nombre = (nombreProducto || '').trim().toLowerCase();
  if (!nombre) return false;
  return PATRON_PRODUCTOS_CON_CORTES.test(nombre);
}

// ---------------------------------------------------------------------------
// Transporte del corte hacia la base de datos
// ---------------------------------------------------------------------------

/**
 * La RPC `crear_pedido_pos` (compartida con la app Android) solo acepta
 * producto_id, cantidad, descuento_item y notas. Para no romperla, los cortes
 * viajan dentro de las notas con una marca que el trigger de la base de datos
 * extrae a la columna `detalle_pedidos.tipo_corte` y luego borra de las notas.
 *
 * Formato: `~corte=COSTILLA,MATAHAMBRE~` (varios cortes separados por coma).
 */
export const MARCA_CORTE = '~corte=';

const REGEX_MARCA = /~corte=[A-Z]+(,[A-Z]+)*~\s*/g;
const REGEX_MARCA_SIMPLE = /~corte=([A-Z]+(,[A-Z]+)*)~/;

export function construirNotasConCorte(
  notas: string,
  cortes: TipoCorte[] | TipoCorte | null | undefined
): string {
  const texto = (notas || '').trim();
  const lista = Array.isArray(cortes) ? cortes : cortes ? [cortes] : [];
  const valor = formatearCortes(lista);
  if (!valor) return texto;
  return `${MARCA_CORTE}${valor}~ ${texto}`.trim();
}

/** Quita la marca de corte de unas notas (para mostrarlas al cajero). */
export function limpiarNotas(notas: string | null | undefined): string {
  if (!notas) return '';
  return notas.replace(REGEX_MARCA, '').trim();
}

/** Recupera los cortes que viajan dentro de las notas (por si la BD aún no los extrajo). */
export function extraerCortesDeNotas(notas: string | null | undefined): TipoCorte[] {
  if (!notas) return [];
  const match = notas.match(REGEX_MARCA_SIMPLE);
  return match ? parsearCortes(match[1]) : [];
}

/**
 * Identidad de una línea del carrito: el mismo producto con cortes distintos
 * son líneas distintas.
 */
export function claveLinea(productoId: number, cortes: TipoCorte[] | null | undefined): string {
  const valor = formatearCortes(cortes) ?? 'SIN_CORTE';
  return `${productoId}:${valor}`;
}
