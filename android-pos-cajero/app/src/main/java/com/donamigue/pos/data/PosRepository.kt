@file:OptIn(kotlinx.serialization.ExperimentalSerializationApi::class, kotlinx.serialization.InternalSerializationApi::class)
package com.donamigue.pos.data

import com.donamigue.pos.model.*
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.postgrest.rpc
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.Date

// ================================================
// Mapeo de Tablas del Esquema de Supabase
// ================================================

@Serializable
data class CategoriaDb(
    val id: Long,
    val nombre: String,
    val descripcion: String? = null,
    val orden: Int = 0,
    val activa: Boolean = true
)

@Serializable
data class ProductoDb(
    val id: Long,
    @SerialName("categoria_id") val categoriaId: Long,
    val nombre: String,
    val descripcion: String? = null,
    @SerialName("precio_base") val precioBase: Double,
    @SerialName("imagen_url") val imagenUrl: String? = null,
    val activo: Boolean = true
)

@Serializable
data class InventarioDb(
    val id: Long? = null,
    @SerialName("sucursal_id") val sucursalId: Long,
    @SerialName("producto_id") val productoId: Long,
    @SerialName("stock_actual") val stockActual: Int,
    @SerialName("stock_minimo") val stockMinimo: Int = 0
)

@Serializable
data class SucursalDb(
    val id: Long,
    val nombre: String,
    val direccion: String? = null,
    val telefono: String? = null,
    val activa: Boolean = true
)

@Serializable
data class UsuarioDb(
    val id: String,
    @SerialName("sucursal_id") val sucursalId: Long? = null,
    @SerialName("nombre_completo") val nombreCompleto: String,
    val rol: String = "CAJERO",
    val activo: Boolean = true
)

@Serializable
data class CajaAbiertaDb(
    val id: Long,
    @SerialName("sucursal_id") val sucursalId: Long,
    @SerialName("usuario_id") val usuarioId: String,
    @SerialName("monto_inicial") val montoInicial: Double = 0.0,
    val estado: String = "ABIERTA"
)

@Serializable
data class NuevaCajaDb(
    val id: Long,
    @SerialName("sucursal_id") val sucursalId: Long,
    @SerialName("usuario_id") val usuarioId: String,
    @SerialName("monto_inicial") val montoInicial: Double = 0.0,
    val estado: String = "ABIERTA"
)

@Serializable
data class PagoRegistroRpc(
    @SerialName("pedido_id") val pedidoId: Long,
    @SerialName("total_pedido") val totalPedido: Double = 0.0,
    @SerialName("total_pagado") val totalPagado: Double = 0.0,
    @SerialName("saldo_pendiente") val saldoPendiente: Double = 0.0,
    @SerialName("estado_pedido") val estadoPedido: String = "PAGADO"
)

@Serializable
data class CerrarCajaRpc(
    @SerialName("caja_id") val cajaId: Long = 0,
    @SerialName("efectivo_esperado_en_gaveta") val efectivoEsperado: Double = 0.0,
    @SerialName("efectivo_declarado") val efectivoDeclarado: Double = 0.0,
    @SerialName("diferencia_efectivo") val diferenciaEfectivo: Double = 0.0,
    @SerialName("digital_esperado") val digitalEsperado: Double = 0.0,
    @SerialName("digital_declarado") val digitalDeclarado: Double = 0.0,
    @SerialName("diferencia_digital") val diferenciaDigital: Double = 0.0
)

@Serializable
data class PedidoDb(
    val id: Long,
    @SerialName("sucursal_id") val sucursalId: Long = 0,
    @SerialName("apertura_caja_id") val aperturaCajaId: Long? = null,
    @SerialName("usuario_id") val usuarioId: String? = null,
    @SerialName("cliente_nombre") val clienteNombre: String? = null,
    @SerialName("numero_mesa") val numeroMesa: Int? = null,
    val estado: String? = null,
    val subtotal: Double = 0.0,
    val descuento: Double = 0.0,
    val total: Double = 0.0,
    @SerialName("motivo_anulacion") val motivoAnulacion: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class PagoDb(
    val id: Long,
    @SerialName("pedido_id") val pedidoId: Long,
    @SerialName("apertura_caja_id") val aperturaCajaId: Long? = null,
    @SerialName("usuario_id") val usuarioId: String? = null,
    val metodo: String? = null,
    val monto: Double = 0.0
)

@Serializable
data class DetallePedidoDb(
    val id: Long,
    @SerialName("pedido_id") val pedidoId: Long,
    @SerialName("producto_id") val productoId: Long,
    val cantidad: Int = 1,
    @SerialName("precio_unitario") val precioUnitario: Double = 0.0,
    val subtotal: Double = 0.0,
    val notas: String? = null
)

// ================================================
// Repositorio (usa RPCs existentes del sistema web)
// ================================================

/**
 * Repositorio de datos del POS conectado a Supabase (Postgrest + Auth + RPC).
 *
 * Reutiliza las mismas funciones RPC del sistema web:
 *   - crear_pedido_pos      (crea el pedido y descuenta inventario)
 *   - registrar_pago_pos    (registra el pago y marca el pedido como PAGADO)
 *   - cerrar_caja_pos       (arqueo y cierre de caja)
 *   - anular_pedido_pos     (anulación con devolución de stock)
 *
 * La apertura de caja se hace con un INSERT directo en `apertura_cajas`,
 * igual que el endpoint /api/caja/abrir del sistema web.
 */
class PosRepository {

    private val client = SupabaseConfig.client

    private val _categorias = MutableStateFlow<List<Categoria>>(emptyList())
    fun getCategoriasFlow(): StateFlow<List<Categoria>> = _categorias.asStateFlow()

    private val _productos = MutableStateFlow<List<ProductoPOS>>(emptyList())
    fun getProductosFlow(): StateFlow<List<ProductoPOS>> = _productos.asStateFlow()

    private val _cajaActiva = MutableStateFlow<CajaTurno?>(null)
    fun getCajaActivaFlow(): StateFlow<CajaTurno?> = _cajaActiva.asStateFlow()

    fun getCategorias(): List<Categoria> = _categorias.value

    // ------------------------------------------------------------------
    // Catálogo (lectura de Supabase)
    // ------------------------------------------------------------------

    suspend fun cargarCatalogo(sucursalId: Int) {
        val catDbList = client.postgrest["categorias"]
            .select {
                filter { eq("activa", true) }
                order("orden", Order.ASCENDING)
            }.decodeList<CategoriaDb>()

        _categorias.value = catDbList.map {
            Categoria(id = it.id.toInt(), nombre = it.nombre)
        }

        val prodDbList = client.postgrest["productos"]
            .select {
                filter { eq("activo", true) }
                order("nombre", Order.ASCENDING)
            }.decodeList<ProductoDb>()

        val invDbList = client.postgrest["inventario"]
            .select { filter { eq("sucursal_id", sucursalId) } }
            .decodeList<InventarioDb>()

        val mapaStock = invDbList.associateBy { it.productoId }

        _productos.value = prodDbList.map { p ->
            val inv = mapaStock[p.id]
            ProductoPOS(
                id = p.id.toInt(),
                categoriaId = p.categoriaId.toInt(),
                nombre = p.nombre,
                precioBase = p.precioBase,
                stockActual = inv?.stockActual ?: 0,
                stockMinimo = inv?.stockMinimo ?: 5,
                descripcion = p.descripcion ?: "",
                imagenUrl = p.imagenUrl
            )
        }
    }

    // ------------------------------------------------------------------
    // Sesión / perfil
    // ------------------------------------------------------------------

    suspend fun cargarSesion(usuarioId: String): SesionUsuario {
        val perfil = client.postgrest["usuarios"]
            .select { filter { eq("id", usuarioId) } }
            .decodeSingle<UsuarioDb>()

        val sucursalId = (perfil.sucursalId ?: 1L).toInt()
        val sucursal = client.postgrest["sucursales"]
            .select { filter { eq("id", sucursalId) } }
            .decodeSingleOrNull<SucursalDb>()

        return SesionUsuario(
            usuarioId = perfil.id,
            nombreCompleto = perfil.nombreCompleto,
            rol = perfil.rol,
            sucursalId = sucursalId,
            sucursalNombre = sucursal?.nombre ?: "Sucursal Principal"
        )
    }

    /** Consulta si ya hay una caja ABIERTA para la sucursal y la adopta. */
    suspend fun sincronizarCajaAbierta(sesion: SesionUsuario) {
        val caja = client.postgrest["apertura_cajas"]
            .select {
                filter {
                    eq("sucursal_id", sesion.sucursalId)
                    eq("estado", "ABIERTA")
                }
                order("fecha_inicio", Order.DESCENDING)
                limit(1)
            }.decodeSingleOrNull<CajaAbiertaDb>()

        _cajaActiva.value = caja?.let {
            CajaTurno(
                id = it.id,
                sucursalId = it.sucursalId.toInt(),
                sucursalNombre = sesion.sucursalNombre,
                usuarioId = it.usuarioId,
                cajeroNombre = sesion.nombreCompleto,
                montoInicial = it.montoInicial,
                fechaApertura = Date(),
                estaAbierta = true
            )
        }
    }

    // ------------------------------------------------------------------
    // Caja: apertura (INSERT directo) y cierre (RPC cerrar_caja_pos)
    // ------------------------------------------------------------------

    suspend fun abrirCaja(
        montoInicial: Double,
        sesion: SesionUsuario
    ): Pair<CajaTurno, Boolean> {
        // 1. ¿Ya existe una caja abierta en esta sucursal?
        val existente = client.postgrest["apertura_cajas"]
            .select {
                filter {
                    eq("sucursal_id", sesion.sucursalId)
                    eq("estado", "ABIERTA")
                }
                order("fecha_inicio", Order.DESCENDING)
                limit(1)
            }.decodeSingleOrNull<CajaAbiertaDb>()

        if (existente != null) {
            val caja = CajaTurno(
                id = existente.id,
                sucursalId = existente.sucursalId.toInt(),
                sucursalNombre = sesion.sucursalNombre,
                usuarioId = existente.usuarioId,
                cajeroNombre = sesion.nombreCompleto,
                montoInicial = existente.montoInicial,
                fechaApertura = Date(),
                estaAbierta = true
            )
            _cajaActiva.value = caja
            return caja to true
        }

        // 2. Aperturar nueva caja (mismo flujo que /api/caja/abrir)
        val nueva = client.postgrest["apertura_cajas"]
            .insert(
                buildJsonObject {
                    put("sucursal_id", sesion.sucursalId)
                    put("usuario_id", sesion.usuarioId)
                    put("monto_inicial", montoInicial)
                    put("monto_efectivo_sistema", 0)
                    put("monto_digital_sistema", 0)
                    put("estado", "ABIERTA")
                }
            ) {
                select()
            }.decodeSingle<NuevaCajaDb>()

        val caja = CajaTurno(
            id = nueva.id,
            sucursalId = nueva.sucursalId.toInt(),
            sucursalNombre = sesion.sucursalNombre,
            usuarioId = nueva.usuarioId,
            cajeroNombre = sesion.nombreCompleto,
            montoInicial = nueva.montoInicial,
            fechaApertura = Date(),
            estaAbierta = true
        )
        _cajaActiva.value = caja
        return caja to false
    }

    suspend fun cerrarCaja(
        efectivoDeclarado: Double,
        digitalDeclarado: Double,
        observaciones: String
    ): ArqueoResult {
        val cajaActual = _cajaActiva.value
            ?: throw IllegalStateException("No hay caja abierta")

        val r = client.postgrest.rpc(
            function = "cerrar_caja_pos",
            parameters = buildJsonObject {
                put("p_apertura_caja_id", cajaActual.id)
                put("p_monto_efectivo_declarado", efectivoDeclarado)
                put("p_monto_digital_declarado", digitalDeclarado)
                put("p_observaciones", observaciones)
            }
        ).decodeAs<CerrarCajaRpc>()

        _cajaActiva.value = null

        return ArqueoResult(
            aperturaId = cajaActual.id,
            fechaCierre = Date(),
            efectivoDeclarado = r.efectivoDeclarado,
            digitalDeclarado = r.digitalDeclarado,
            efectivoEsperado = r.efectivoEsperado,
            digitalEsperado = r.digitalEsperado,
            diferenciaEfectivo = r.diferenciaEfectivo,
            diferenciaDigital = r.diferenciaDigital,
            observaciones = observaciones
        )
    }

    // ------------------------------------------------------------------
    // Venta: crear_pedido_pos -> registrar_pago_pos
    // ------------------------------------------------------------------

    suspend fun registrarVenta(
        cartItems: List<CartItem>,
        metodoPago: MetodoPago,
        clienteNombre: String,
        numeroMesa: Int?,
        descuentoGlobal: Double,
        efectivoRecibido: Double?,
        sesion: SesionUsuario
    ): TicketData {
        val cajaActual = _cajaActiva.value
            ?: throw IllegalStateException("Debe abrir caja antes de registrar ventas")

        val subtotal = cartItems.sumOf { it.subtotal }
        val total = maxOf(0.0, subtotal - descuentoGlobal)
        val cambio = if (metodoPago == MetodoPago.EFECTIVO && efectivoRecibido != null) {
            maxOf(0.0, efectivoRecibido - total)
        } else null

        // 1. Crear el pedido (descuenta inventario). Devuelve el pedido_id (BIGINT).
        val itemsJson = buildJsonArray {
            cartItems.forEach { item ->
                add(
                    buildJsonObject {
                        put("producto_id", item.producto.id)
                        put("cantidad", item.cantidad)
                        put("descuento_item", item.descuentoItem)
                        put("notas", item.notas)
                    }
                )
            }
        }

        val pedidoId = client.postgrest.rpc(
            function = "crear_pedido_pos",
            parameters = buildJsonObject {
                put("p_apertura_caja_id", cajaActual.id)
                put("p_usuario_id", sesion.usuarioId)
                put("p_cliente_nombre", clienteNombre.ifBlank { "CLIENTE GENERAL" })
                put("p_numero_mesa", numeroMesa)
                put("p_descuento_global", descuentoGlobal)
                put("p_items", itemsJson)
            }
        ).decodeAs<Long>()

        // 2. Registrar el pago (marca el pedido como PAGADO).
        val pago = client.postgrest.rpc(
            function = "registrar_pago_pos",
            parameters = buildJsonObject {
                put("p_pedido_id", pedidoId)
                put("p_apertura_caja_id", cajaActual.id)
                put("p_usuario_id", sesion.usuarioId)
                put("p_metodo", metodoPago.name)
                put("p_monto", total)
                put("p_referencia_pago", null as String?)
            }
        ).decodeAs<PagoRegistroRpc>()

        // Refrescar stock desde la base de datos tras el descuento del RPC.
        cargarCatalogo(sesion.sucursalId)

        val ticketItems = cartItems.map {
            TicketItem(
                nombre = it.producto.nombre,
                cantidad = it.cantidad,
                precioUnitario = it.producto.precioBase,
                subtotal = it.subtotal,
                notas = it.notas.ifBlank { null }
            )
        }

        return TicketData(
            pedidoId = pedidoId,
            aperturaCajaId = cajaActual.id,
            sucursalNombre = sesion.sucursalNombre,
            cajeroNombre = sesion.nombreCompleto,
            clienteNombre = clienteNombre.ifBlank { "CLIENTE GENERAL" },
            numeroMesa = numeroMesa,
            fecha = Date(),
            items = ticketItems,
            subtotal = subtotal,
            descuento = descuentoGlobal,
            total = pago.totalPagado.takeIf { it > 0 } ?: total,
            metodoPago = metodoPago,
            efectivoRecibido = efectivoRecibido,
            cambio = cambio
        )
    }

    // ------------------------------------------------------------------
    // Anulación de una venta (RPC anular_pedido_pos)
    // ------------------------------------------------------------------

    suspend fun anularVenta(
        pedidoId: Long,
        motivo: String,
        devolverStock: Boolean,
        sesion: SesionUsuario
    ) {
        client.postgrest.rpc(
            function = "anular_pedido_pos",
            parameters = buildJsonObject {
                put("p_pedido_id", pedidoId)
                put("p_usuario_id", sesion.usuarioId)
                put("p_motivo", motivo)
                put("p_devolver_stock", devolverStock)
            }
        )
        cargarCatalogo(sesion.sucursalId)
    }

    /**
     * Edita un pedido existente (RPC editar_pedido_pos).
     * Ajusta inventario por diferencias, reemplaza el detalle y recalcula totales.
     */
    suspend fun editarVenta(
        pedidoId: Long,
        clienteNombre: String,
        numeroMesa: Int?,
        descuentoGlobal: Double,
        items: List<EdicionItem>,
        metodoPago: MetodoPago?,
        sesion: SesionUsuario
    ) {
        val itemsJson = buildJsonArray {
            items.forEach { item ->
                add(
                    buildJsonObject {
                        put("producto_id", item.productoId)
                        put("cantidad", item.cantidad)
                        put("descuento_item", item.descuentoItem)
                        put("notas", item.notas)
                        put("precio_unitario", item.precioUnitario)
                    }
                )
            }
        }

        client.postgrest.rpc(
            function = "editar_pedido_pos",
            parameters = buildJsonObject {
                put("p_pedido_id", pedidoId)
                put("p_usuario_id", sesion.usuarioId)
                put("p_cliente_nombre", clienteNombre.ifBlank { "Cliente Mostrador" })
                put("p_numero_mesa", numeroMesa)
                put("p_descuento_global", descuentoGlobal)
                put("p_items", itemsJson)
                put("p_metodo_pago", metodoPago?.name)
            }
        )
        cargarCatalogo(sesion.sucursalId)
    }

    // ------------------------------------------------------------------
    // Historial de ventas / pedidos
    // ------------------------------------------------------------------

    /**
     * Carga el historial de pedidos de la sucursal (más recientes primero),
     * junto con sus pagos y nombres de cajeros para mostrar un resumen.
     */
    suspend fun cargarHistorial(sucursalId: Int): List<PedidoHistorial> {
        val pedidos = client.postgrest["pedidos"]
            .select {
                filter { eq("sucursal_id", sucursalId) }
                order("created_at", Order.DESCENDING)
                limit(200)
            }.decodeList<PedidoDb>()

        if (pedidos.isEmpty()) return emptyList()

        val pedidoIds = pedidos.map { it.id }

        val pagos = client.postgrest["pagos"]
            .select { filter { isIn("pedido_id", pedidoIds) } }
            .decodeList<PagoDb>()
            .groupBy { it.pedidoId }

        val nombresUsuarios = cargarNombresUsuarios(
            pedidos.mapNotNull { it.usuarioId }.distinct()
        )

        return pedidos.map { p ->
            val pago = pagos[p.id]?.firstOrNull()
            PedidoHistorial(
                id = p.id,
                clienteNombre = p.clienteNombre?.takeIf { it.isNotBlank() } ?: "Cliente general",
                numeroMesa = p.numeroMesa,
                estado = EstadoPedido.fromDb(p.estado),
                subtotal = p.subtotal,
                descuento = p.descuento,
                total = p.total,
                metodoPago = pago?.metodo?.let(::parseMetodoPago),
                cajeroNombre = p.usuarioId?.let { nombresUsuarios[it] } ?: "—",
                cajaId = p.aperturaCajaId,
                fecha = parseFecha(p.createdAt),
                motivoAnulacion = p.motivoAnulacion
            )
        }
    }

    /** Carga el detalle (items) de un pedido del historial. */
    suspend fun cargarDetallePedido(pedidoId: Long): List<DetalleHistorialItem> {
        val detalles = client.postgrest["detalle_pedidos"]
            .select { filter { eq("pedido_id", pedidoId) } }
            .decodeList<DetallePedidoDb>()

        if (detalles.isEmpty()) return emptyList()

        val nombres = cargarNombresProductos(detalles.map { it.productoId }.distinct())

        return detalles.map { d ->
            DetalleHistorialItem(
                nombre = nombres[d.productoId] ?: "Producto #${d.productoId}",
                cantidad = d.cantidad,
                precioUnitario = d.precioUnitario,
                subtotal = d.subtotal,
                notas = d.notas?.takeIf { it.isNotBlank() }
            )
        }
    }

    /** Detalle de pedido incluyendo el producto_id, para el editor. */
    suspend fun cargarDetallePedidoConIds(pedidoId: Long): List<EdicionItem> {
        val detalles = client.postgrest["detalle_pedidos"]
            .select { filter { eq("pedido_id", pedidoId) } }
            .decodeList<DetallePedidoDb>()

        if (detalles.isEmpty()) return emptyList()

        val nombres = cargarNombresProductos(detalles.map { it.productoId }.distinct())

        return detalles.map { d ->
            EdicionItem(
                productoId = d.productoId,
                nombre = nombres[d.productoId] ?: "Producto #${d.productoId}",
                cantidad = d.cantidad,
                precioUnitario = d.precioUnitario,
                descuentoItem = 0.0,
                notas = d.notas ?: ""
            )
        }
    }

    private suspend fun cargarNombresUsuarios(ids: List<String>): Map<String, String> {
        if (ids.isEmpty()) return emptyMap()
        return client.postgrest["usuarios"]
            .select { filter { isIn("id", ids) } }
            .decodeList<UsuarioDb>()
            .associate { it.id to it.nombreCompleto }
    }

    private suspend fun cargarNombresProductos(ids: List<Long>): Map<Long, String> {
        if (ids.isEmpty()) return emptyMap()
        return client.postgrest["productos"]
            .select { filter { isIn("id", ids) } }
            .decodeList<ProductoDb>()
            .associate { it.id to it.nombre }
    }

    private fun parseMetodoPago(valor: String): MetodoPago? =
        MetodoPago.entries.firstOrNull { it.name.equals(valor, ignoreCase = true) }

    private fun parseFecha(iso: String?): Date {
        if (iso == null) return Date()
        return try {
            java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
                .also { it.timeZone = java.util.TimeZone.getTimeZone("UTC") }
                .parse(iso.substringBefore('.'))
        } catch (e: Exception) {
            Date()
        }
    }
}
