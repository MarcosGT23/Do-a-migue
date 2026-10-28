package com.donamigue.pos.model

import java.util.Date

enum class MetodoPago(val label: String) {
    EFECTIVO("Efectivo"),
    QR("Pago QR"),
    TARJETA("Tarjeta Débito/Crédito"),
    TRANSFERENCIA("Transferencia")
}

data class SesionUsuario(
    val usuarioId: String,
    val nombreCompleto: String,
    val rol: String,
    val sucursalId: Int,
    val sucursalNombre: String
)

data class Categoria(
    val id: Int,
    val nombre: String,
    val iconName: String = "restaurant"
)

data class ProductoPOS(
    val id: Int,
    val categoriaId: Int,
    val nombre: String,
    val precioBase: Double,
    val stockActual: Int,
    val stockMinimo: Int = 5,
    val descripcion: String = "",
    val imagenUrl: String? = null
)

data class CartItem(
    val producto: ProductoPOS,
    var cantidad: Int = 1,
    var descuentoItem: Double = 0.0,
    var notas: String = ""
) {
    val subtotal: Double
        get() = (producto.precioBase * cantidad) - descuentoItem
}

data class CajaTurno(
    val id: Long,
    val sucursalId: Int,
    val sucursalNombre: String,
    val usuarioId: String,
    val cajeroNombre: String,
    val montoInicial: Double,
    val fechaApertura: Date = Date(),
    val estaAbierta: Boolean = true,
    val totalVentasEfectivo: Double = 0.0,
    val totalVentasDigital: Double = 0.0
) {
    val totalEsperado: Double
        get() = montoInicial + totalVentasEfectivo
}

data class ArqueoResult(
    val aperturaId: Long,
    val fechaCierre: Date = Date(),
    val efectivoDeclarado: Double,
    val digitalDeclarado: Double,
    val efectivoEsperado: Double,
    val digitalEsperado: Double,
    val diferenciaEfectivo: Double,
    val diferenciaDigital: Double,
    val observaciones: String
)

data class TicketItem(
    val nombre: String,
    val cantidad: Int,
    val precioUnitario: Double,
    val subtotal: Double,
    val notas: String? = null
)

data class TicketData(
    val pedidoId: Long,
    val aperturaCajaId: Long?,
    val sucursalNombre: String,
    val cajeroNombre: String,
    val clienteNombre: String,
    val numeroMesa: Int?,
    val fecha: Date,
    val items: List<TicketItem>,
    val subtotal: Double,
    val descuento: Double,
    val total: Double,
    val metodoPago: MetodoPago,
    val efectivoRecibido: Double? = null,
    val cambio: Double? = null
)

enum class EstadoPedido(val label: String) {
    PENDIENTE("Pendiente"),
    PAGADO("Pagado"),
    ANULADO("Anulado"),
    OTRO("—");

    companion object {
        fun fromDb(valor: String?): EstadoPedido = when (valor?.uppercase()) {
            "PENDIENTE" -> PENDIENTE
            "PAGADO" -> PAGADO
            "ANULADO" -> ANULADO
            else -> OTRO
        }
    }
}

data class PedidoHistorial(
    val id: Long,
    val clienteNombre: String,
    val numeroMesa: Int?,
    val estado: EstadoPedido,
    val subtotal: Double,
    val descuento: Double,
    val total: Double,
    val metodoPago: MetodoPago?,
    val cajeroNombre: String,
    val cajaId: Long?,
    val fecha: Date,
    val motivoAnulacion: String? = null
)

data class DetalleHistorialItem(
    val nombre: String,
    val cantidad: Int,
    val precioUnitario: Double,
    val subtotal: Double,
    val notas: String? = null
)

data class DetalleHistorial(
    val pedido: PedidoHistorial,
    val items: List<DetalleHistorialItem>
)

data class EdicionItem(
    val productoId: Long,
    val nombre: String,
    val cantidad: Int,
    val precioUnitario: Double,
    val descuentoItem: Double = 0.0,
    val notas: String = ""
) {
    val subtotal: Double
        get() = maxOf(0.0, (cantidad * precioUnitario) - descuentoItem)
}
