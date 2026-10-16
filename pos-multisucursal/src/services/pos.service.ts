import { supabase } from '../core/supabaseClient';

export type MetodoPago = 'EFECTIVO' | 'QR' | 'TARJETA' | 'TRANSFERENCIA';
export type TipoMovimientoInv = 'ENTRADA_ABASTECIMIENTO' | 'AJUSTE_POSITIVO' | 'AJUSTE_MERMA';
export type RolUsuario = 'ADMIN' | 'SUPERVISOR' | 'CAJERO' | 'MESERO';

export interface ItemCarritoDTO {
    producto_id: number;
    cantidad: number;
    descuento_item: number;
    notas?: string;
}

/** Flag `Secure` solo cuando se navega por HTTPS (en local por http no aplica). */
function secureFlag(): string {
    return typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
}

/** Persiste la sesión en cookie (legible por el SSR) y en localStorage. */
export function guardarSesionCliente(sesionData: Record<string, unknown>) {
    if (typeof document === 'undefined') return;
    const serializado = encodeURIComponent(JSON.stringify(sesionData));
    document.cookie = `dona_migue_user=${serializado}; path=/; max-age=604800; SameSite=Lax${secureFlag()}`;
    try {
        localStorage.setItem('dona_migue_user', JSON.stringify(sesionData));
    } catch {}
}

export const PosService = {
    // ==========================================================================
    // 1. AUTENTICACIÓN Y SESIÓN (auth.users.id -> usuarios)
    // ==========================================================================
    async iniciarSesion(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);

        // Guardar el JWT en cookie para que Astro SSR pueda leer las tablas protegidas por RLS
        if (data.session) {
            document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=604800; SameSite=Lax${secureFlag()}`;
        }
        return data;
    },

    async cerrarSesion() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch {}
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.error('Error cerrando sesión en Supabase:', e);
        }
        if (typeof document !== 'undefined') {
            document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag()}`;
            document.cookie = `dona_migue_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag()}`;
            try {
                localStorage.removeItem('dona_migue_user');
            } catch {}
        }
    },

    // ==========================================================================
    // 2. FUNCIONES TRANSACCIONALES RPC (PEDIDOS, PAGOS, CAJA Y KARDEX)
    // ==========================================================================
    async abrirCaja(params: { sucursal_id: number; usuario_id: string; monto_inicial: number }) {
        const res = await fetch('/api/caja/abrir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
            throw new Error(data.error || 'No se pudo abrir la caja.');
        }
        return data.caja;
    },

    async obtenerEstadoCaja(sucursalId: number) {
        const res = await fetch(`/api/caja/estado?sucursalId=${sucursalId}`);
        const data = await res.json();
        if (!res.ok || !data.ok) {
            throw new Error(data.error || 'No se pudo consultar el estado de la caja.');
        }
        return data;
    },

    async crearPedido(params: {
        apertura_caja_id: number;
        usuario_id: string;
        cliente_nombre: string;
        numero_mesa: number | null;
        descuento_global: number;
        items: ItemCarritoDTO[];
    }) {
        const { data, error } = await supabase.rpc('crear_pedido_pos', {
            p_apertura_caja_id: params.apertura_caja_id,
            p_usuario_id: params.usuario_id,
            p_cliente_nombre: params.cliente_nombre,
            p_numero_mesa: params.numero_mesa,
            p_descuento_global: params.descuento_global,
            p_items: params.items,
        });
        if (error) throw new Error(error.message);
        return data as number;
    },

    async registrarPago(params: {
        pedido_id: number;
        apertura_caja_id: number;
        usuario_id: string;
        metodo: MetodoPago;
        monto: number;
        referencia_pago?: string;
    }) {
        const { data, error } = await supabase.rpc('registrar_pago_pos', {
            p_pedido_id: params.pedido_id,
            p_apertura_caja_id: params.apertura_caja_id,
            p_usuario_id: params.usuario_id,
            p_metodo: params.metodo,
            p_monto: params.monto,
            p_referencia_pago: params.referencia_pago || null,
        });
        if (error) throw new Error(error.message);
        return data;
    },

    async listarPedidos(params?: { sucursalId?: number; cajaId?: number; estado?: string }) {
        const queryParams = new URLSearchParams();
        if (params?.sucursalId) queryParams.set('sucursalId', String(params.sucursalId));
        if (params?.cajaId) queryParams.set('cajaId', String(params.cajaId));
        if (params?.estado) queryParams.set('estado', params.estado);

        const res = await fetch(`/api/pedidos/listar?${queryParams.toString()}`);
        const data = await res.json();
        if (!res.ok || !data.ok) {
            throw new Error(data.error || 'No se pudieron obtener los pedidos.');
        }
        return data.pedidos;
    },

    async editarPedido(params: {
        pedido_id: number;
        cliente_nombre: string;
        numero_mesa: number | null;
        descuento: number;
        metodo_pago?: string;
        items: Array<{
            producto_id: number;
            cantidad: number;
            precio_unitario: number;
            descuento_item?: number;
            notas?: string;
        }>;
    }) {
        const res = await fetch('/api/pedidos/editar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
            throw new Error(data.error || 'No se pudo editar el pedido.');
        }
        return data.pedido;
    },

    async anularPedido(params: {
        pedido_id: number;
        usuario_id?: string;
        motivo: string;
        devolver_stock?: boolean;
    }) {
        const res = await fetch('/api/pedidos/anular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
            throw new Error(data.error || 'No se pudo anular el pedido.');
        }
        return data.resultado;
    },

    async cerrarCaja(params: {
        apertura_caja_id: number;
        monto_efectivo_declarado: number;
        monto_digital_declarado: number;
        observaciones?: string;
    }) {
        const res = await fetch('/api/caja/cerrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
            throw new Error(data.error || 'No se pudo cerrar la caja.');
        }
        return data.arqueo;
    },

    async ajustarInventario(params: {
        sucursal_id: number;
        producto_id: number;
        usuario_id: string;
        tipo: TipoMovimientoInv;
        cantidad: number;
        motivo: string;
    }) {
        const { data, error } = await supabase.rpc('ajustar_inventario_pos', {
            p_sucursal_id: params.sucursal_id,
            p_producto_id: params.producto_id,
            p_usuario_id: params.usuario_id,
            p_tipo: params.tipo,
            p_cantidad: params.cantidad,
            p_motivo: params.motivo,
        });
        if (error) throw new Error(error.message);
        return data;
    },

    // ==========================================================================
    // 3. GESTIÓN DE CATÁLOGO (CATEGORÍAS Y PRODUCTOS TERMINADOS)
    // ==========================================================================
    async crearCategoria(params: { nombre: string; descripcion: string; orden: number }) {
        const { data, error } = await supabase.from('categorias').insert(params).select().single();
        if (error) throw new Error(error.message);
        return data;
    },

    async guardarProducto(params: {
        id?: number;
        categoria_id: number;
        nombre: string;
        descripcion: string;
        precio_base: number;
        imagen_url?: string;
        activo: boolean;
    }) {
        if (params.id) {
            const { data, error } = await supabase
                .from('productos')
                .update({
                    categoria_id: params.categoria_id,
                    nombre: params.nombre,
                    descripcion: params.descripcion,
                    precio_base: params.precio_base,
                    imagen_url: params.imagen_url || null,
                    activo: params.activo,
                })
                .eq('id', params.id)
                .select()
                .single();
            if (error) throw new Error(error.message);
            return data;
        } else {
            const { data, error } = await supabase.from('productos').insert(params).select().single();
            if (error) throw new Error(error.message);
            return data;
        }
    },

    // ==========================================================================
    // 4. GESTIÓN DE SUCURSALES Y USUARIOS
    // ==========================================================================
    async crearSucursal(params: { nombre: string; direccion: string; telefono: string }) {
        const { data, error } = await supabase.from('sucursales').insert(params).select().single();
        if (error) throw new Error(error.message);
        return data;
    },

    async toggleSucursalActiva(id: number, activa: boolean) {
        const { error } = await supabase.from('sucursales').update({ activa }).eq('id', id);
        if (error) throw new Error(error.message);
    },

    async actualizarUsuario(params: {
        id: string;
        nombre_completo: string;
        rol: RolUsuario;
        sucursal_id: number | null;
        activo: boolean;
    }) {
        const { data, error } = await supabase
            .from('usuarios')
            .update({
                nombre_completo: params.nombre_completo,
                rol: params.rol,
                sucursal_id: params.sucursal_id,
                activo: params.activo,
            })
            .eq('id', params.id)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },
};