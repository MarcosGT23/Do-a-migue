package com.donamigue.pos.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.donamigue.pos.data.AuthRepository
import com.donamigue.pos.data.PosRepository
import com.donamigue.pos.model.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class PosUiState(
    val sesion: SesionUsuario? = null,
    val estaAutenticado: Boolean = false,
    val cajaActiva: CajaTurno? = null,
    val categorias: List<Categoria> = emptyList(),
    val categoriaSeleccionadaId: Int? = null, // null = Todas
    val busqueda: String = "",
    val productos: List<ProductoPOS> = emptyList(),
    val productosFiltrados: List<ProductoPOS> = emptyList(),
    val carrito: List<CartItem> = emptyList(),
    val clienteNombre: String = "",
    val numeroMesa: String = "",
    val descuentoGlobal: Double = 0.0,

    // Dialogs & Modals
    val showOpenRegisterDialog: Boolean = false,
    val showCloseRegisterDialog: Boolean = false,
    val showCartSheet: Boolean = false,
    val showCheckoutDialog: Boolean = false,
    val showTicketDialog: Boolean = false,
    val showArqueoDialog: Boolean = false,

    // Resultados y feedback
    val ticketActivo: TicketData? = null,
    val arqueoResultado: ArqueoResult? = null,
    val mensajeToast: String? = null,
    val isProcesando: Boolean = false,

    // Carga de datos remotos
    val cargando: Boolean = false,
    val errorCarga: String? = null,

    // Historial
    val mostrarHistorial: Boolean = false,
    val historial: List<PedidoHistorial> = emptyList(),
    val cargandoHistorial: Boolean = false,
    val errorHistorial: String? = null,
    val busquedaHistorial: String = "",
    val historialFiltrado: List<PedidoHistorial> = emptyList(),
    val detalleSeleccionado: DetalleHistorial? = null,
    val cargandoDetalle: Boolean = false,
    val showDetalleHistorialDialog: Boolean = false,

    // Edición de pedido
    val showEditarPedidoDialog: Boolean = false,
    val edicionItems: List<EdicionItem> = emptyList(),
    val edicionCliente: String = "",
    val edicionMesa: String = "",
    val edicionDescuento: Double = 0.0,
    val edicionMetodoPago: MetodoPago? = null,

    // Anulación de pedido
    val showAnularPedidoDialog: Boolean = false
) {
    val totalItemsCarrito: Int
        get() = carrito.sumOf { it.cantidad }

    val subtotalCarrito: Double
        get() = carrito.sumOf { it.subtotal }

    val totalPagar: Double
        get() = maxOf(0.0, subtotalCarrito - descuentoGlobal)
}

class PosViewModel(
    private val repository: PosRepository = PosRepository(),
    private val authRepository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(PosUiState())
    val uiState: StateFlow<PosUiState> = _uiState.asStateFlow()

    init {
        observarFlujos()
        restaurarSesion()
    }

    private fun observarFlujos() {
        viewModelScope.launch {
            repository.getCategoriasFlow().collect { categorias ->
                _uiState.update { it.copy(categorias = categorias) }
            }
        }

        viewModelScope.launch {
            repository.getProductosFlow().collect { prods ->
                _uiState.update { state ->
                    state.copy(
                        productos = prods,
                        productosFiltrados = filtrarProductos(prods, state.categoriaSeleccionadaId, state.busqueda)
                    )
                }
            }
        }

        viewModelScope.launch {
            repository.getCajaActivaFlow().collect { caja ->
                _uiState.update { it.copy(cajaActiva = caja) }
            }
        }
    }

    /** Restaura una sesión persistida y carga los datos iniciales desde Supabase. */
    private fun restaurarSesion() {
        viewModelScope.launch {
            _uiState.update { it.copy(cargando = true) }
            try {
                val usuarioId = authRepository.usuarioActualId()
                if (usuarioId == null) {
                    _uiState.update { it.copy(cargando = false) }
                    return@launch
                }
                iniciarDatosConSesion(usuarioId)
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        cargando = false,
                        errorCarga = "No se pudo restaurar la sesión: ${e.message}"
                    )
                }
            }
        }
    }

    private suspend fun iniciarDatosConSesion(usuarioId: String) {
        val sesion = repository.cargarSesion(usuarioId)
        repository.cargarCatalogo(sesion.sucursalId)
        repository.sincronizarCajaAbierta(sesion)
        _uiState.update {
            it.copy(
                sesion = sesion,
                estaAutenticado = true,
                cargando = false,
                errorCarga = null
            )
        }
    }

    // ------------------------------------------------------------------
    // Autenticación
    // ------------------------------------------------------------------
    fun iniciarSesion(email: String, password: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isProcesando = true, errorCarga = null) }
            try {
                val usuarioId = authRepository.iniciarSesion(email, password)
                iniciarDatosConSesion(usuarioId)
                _uiState.update {
                    it.copy(isProcesando = false, mensajeToast = "¡Bienvenido de nuevo!")
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isProcesando = false,
                        errorCarga = mensajeAmigable(e)
                    )
                }
            }
        }
    }

    fun cerrarSesion() {
        viewModelScope.launch {
            try {
                authRepository.cerrarSesion()
            } catch (_: Exception) {
            }
            _uiState.value = PosUiState()
        }
    }

    fun limpiarError() {
        _uiState.update { it.copy(errorCarga = null) }
    }

    private fun mensajeAmigable(e: Exception): String {
        val raw = e.message ?: return "No se pudo iniciar sesión."
        return when {
            raw.contains("Invalid login credentials", ignoreCase = true) ->
                "Correo o contraseña incorrectos."
            raw.contains("Email not confirmed", ignoreCase = true) ->
                "La cuenta aún no ha sido confirmada."
            else -> raw
        }
    }

    // ------------------------------------------------------------------
    // Filtros de catálogo
    // ------------------------------------------------------------------
    private fun filtrarProductos(
        lista: List<ProductoPOS>,
        catId: Int?,
        query: String
    ): List<ProductoPOS> {
        return lista.filter { prod ->
            val coincideCat = catId == null || prod.categoriaId == catId
            val coincideTexto = query.isBlank() || prod.nombre.contains(query, ignoreCase = true)
            coincideCat && coincideTexto
        }
    }

    fun onBuscarChanged(nuevoTexto: String) {
        _uiState.update { state ->
            val filtrados = filtrarProductos(state.productos, state.categoriaSeleccionadaId, nuevoTexto)
            state.copy(busqueda = nuevoTexto, productosFiltrados = filtrados)
        }
    }

    fun onCategoriaSeleccionada(catId: Int?) {
        _uiState.update { state ->
            val filtrados = filtrarProductos(state.productos, catId, state.busqueda)
            state.copy(categoriaSeleccionadaId = catId, productosFiltrados = filtrados)
        }
    }

    // ------------------------------------------------------------------
    // Carrito
    // ------------------------------------------------------------------
    fun agregarAlCarrito(producto: ProductoPOS) {
        if (_uiState.value.cajaActiva == null) {
            _uiState.update { it.copy(mensajeToast = "Debes abrir caja antes de registrar productos.") }
            return
        }

        _uiState.update { state ->
            val listaActual = state.carrito.toMutableList()
            val index = listaActual.indexOfFirst { it.producto.id == producto.id }

            if (index >= 0) {
                val item = listaActual[index]
                if (item.cantidad < producto.stockActual) {
                    listaActual[index] = item.copy(cantidad = item.cantidad + 1)
                } else {
                    return@update state.copy(mensajeToast = "Stock máximo alcanzado para ${producto.nombre}")
                }
            } else {
                if (producto.stockActual > 0) {
                    listaActual.add(CartItem(producto = producto, cantidad = 1))
                } else {
                    return@update state.copy(mensajeToast = "No hay stock disponible de ${producto.nombre}")
                }
            }
            state.copy(carrito = listaActual, mensajeToast = "${producto.nombre} agregado al pedido")
        }
    }

    fun incrementarCantidad(item: CartItem) {
        if (item.cantidad >= item.producto.stockActual) {
            _uiState.update { it.copy(mensajeToast = "Stock máximo alcanzado") }
            return
        }
        _uiState.update { state ->
            val nuevaLista = state.carrito.map {
                if (it.producto.id == item.producto.id) it.copy(cantidad = it.cantidad + 1) else it
            }
            state.copy(carrito = nuevaLista)
        }
    }

    fun decrementarCantidad(item: CartItem) {
        _uiState.update { state ->
            val nuevaLista = state.carrito.mapNotNull {
                if (it.producto.id == item.producto.id) {
                    if (it.cantidad > 1) it.copy(cantidad = it.cantidad - 1) else null
                } else it
            }
            state.copy(carrito = nuevaLista)
        }
    }

    fun removerDelCarrito(item: CartItem) {
        _uiState.update { state ->
            val nuevaLista = state.carrito.filterNot { it.producto.id == item.producto.id }
            state.copy(carrito = nuevaLista, mensajeToast = "Item eliminado de la comanda")
        }
    }

    fun vaciarCarrito() {
        _uiState.update { it.copy(carrito = emptyList(), clienteNombre = "", numeroMesa = "", descuentoGlobal = 0.0) }
    }

    fun onClienteNombreChanged(nombre: String) {
        _uiState.update { it.copy(clienteNombre = nombre) }
    }

    fun onNumeroMesaChanged(mesa: String) {
        _uiState.update { it.copy(numeroMesa = mesa) }
    }

    fun onDescuentoGlobalChanged(descuento: Double) {
        _uiState.update { it.copy(descuentoGlobal = maxOf(0.0, descuento)) }
    }

    // ------------------------------------------------------------------
    // Apertura y Cierre de Caja
    // ------------------------------------------------------------------
    fun abrirDialogoApertura(show: Boolean) {
        _uiState.update { it.copy(showOpenRegisterDialog = show) }
    }

    fun abrirCaja(montoInicial: Double) {
        val sesion = _uiState.value.sesion ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isProcesando = true) }
            try {
                val (caja, yaAbierta) = repository.abrirCaja(montoInicial, sesion)
                val mensaje = if (yaAbierta) {
                    "Ya existía una caja abierta (#${caja.id}). Se sincronizó el turno."
                } else {
                    "¡Caja #${caja.id} aperturada con Bs. $montoInicial!"
                }
                _uiState.update {
                    it.copy(
                        isProcesando = false,
                        cajaActiva = caja,
                        showOpenRegisterDialog = false,
                        mensajeToast = mensaje
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isProcesando = false, mensajeToast = "Error al abrir caja: ${e.message}")
                }
            }
        }
    }

    fun abrirDialogoCierre(show: Boolean) {
        _uiState.update { it.copy(showCloseRegisterDialog = show) }
    }

    fun cerrarCaja(efectivoDeclarado: Double, digitalDeclarado: Double, observaciones: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isProcesando = true) }
            try {
                val arqueo = repository.cerrarCaja(efectivoDeclarado, digitalDeclarado, observaciones)
                _uiState.update {
                    it.copy(
                        isProcesando = false,
                        showCloseRegisterDialog = false,
                        arqueoResultado = arqueo,
                        showArqueoDialog = true,
                        mensajeToast = "Caja cerrada correctamente. Se generó el arqueo de turno."
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isProcesando = false, mensajeToast = "Error al cerrar caja: ${e.message}")
                }
            }
        }
    }

    fun cerrarDialogoArqueo() {
        _uiState.update { it.copy(showArqueoDialog = false, arqueoResultado = null) }
    }

    // ------------------------------------------------------------------
    // Cobro & Checkout
    // ------------------------------------------------------------------
    fun abrirDialogoCobro(show: Boolean) {
        if (_uiState.value.carrito.isEmpty() && show) {
            _uiState.update { it.copy(mensajeToast = "El carrito está vacío") }
            return
        }
        _uiState.update { it.copy(showCheckoutDialog = show) }
    }

    fun abrirCartSheet(show: Boolean) {
        _uiState.update { it.copy(showCartSheet = show) }
    }

    fun procesarCobro(
        metodoPago: MetodoPago,
        efectivoRecibido: Double?
    ) {
        val state = _uiState.value
        if (state.carrito.isEmpty()) return
        val sesion = state.sesion ?: return

        _uiState.update { it.copy(isProcesando = true) }

        val numMesa = state.numeroMesa.toIntOrNull()
        viewModelScope.launch {
            try {
                val ticket = repository.registrarVenta(
                    cartItems = state.carrito,
                    metodoPago = metodoPago,
                    clienteNombre = state.clienteNombre,
                    numeroMesa = numMesa,
                    descuentoGlobal = state.descuentoGlobal,
                    efectivoRecibido = efectivoRecibido,
                    sesion = sesion
                )

                _uiState.update {
                    it.copy(
                        isProcesando = false,
                        showCheckoutDialog = false,
                        showCartSheet = false,
                        ticketActivo = ticket,
                        showTicketDialog = true,
                        carrito = emptyList(),
                        clienteNombre = "",
                        numeroMesa = "",
                        descuentoGlobal = 0.0,
                        mensajeToast = "¡Venta registrada con éxito! Comanda #${ticket.pedidoId}"
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isProcesando = false,
                        mensajeToast = "Error al procesar cobro: ${e.message}"
                    )
                }
            }
        }
    }

    fun cerrarTicketDialog() {
        _uiState.update { it.copy(showTicketDialog = false, ticketActivo = null) }
    }

    fun limpiarMensajeToast() {
        _uiState.update { it.copy(mensajeToast = null) }
    }

    // ------------------------------------------------------------------
    // Historial de ventas
    // ------------------------------------------------------------------
    fun abrirHistorial(show: Boolean) {
        _uiState.update { it.copy(mostrarHistorial = show) }
        if (show) cargarHistorial()
    }

    fun cargarHistorial() {
        val sesion = _uiState.value.sesion ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(cargandoHistorial = true, errorHistorial = null) }
            try {
                val lista = repository.cargarHistorial(sesion.sucursalId)
                _uiState.update { state ->
                    state.copy(
                        cargandoHistorial = false,
                        historial = lista,
                        historialFiltrado = filtrarHistorial(lista, state.busquedaHistorial)
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        cargandoHistorial = false,
                        errorHistorial = "No se pudo cargar el historial: ${e.message}"
                    )
                }
            }
        }
    }

    fun onBusquedaHistorialChanged(texto: String) {
        _uiState.update { state ->
            state.copy(
                busquedaHistorial = texto,
                historialFiltrado = filtrarHistorial(state.historial, texto)
            )
        }
    }

    private fun filtrarHistorial(
        lista: List<PedidoHistorial>,
        query: String
    ): List<PedidoHistorial> {
        if (query.isBlank()) return lista
        val q = query.trim()
        return lista.filter { p ->
            p.clienteNombre.contains(q, ignoreCase = true) ||
                p.id.toString().contains(q) ||
                (p.numeroMesa?.toString()?.contains(q) == true) ||
                p.total.toString().contains(q)
        }
    }

    fun verDetalleHistorial(pedido: PedidoHistorial) {
        viewModelScope.launch {
            _uiState.update { it.copy(showDetalleHistorialDialog = true, cargandoDetalle = true) }
            try {
                val items = repository.cargarDetallePedido(pedido.id)
                _uiState.update {
                    it.copy(
                        cargandoDetalle = false,
                        detalleSeleccionado = DetalleHistorial(pedido = pedido, items = items)
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        cargandoDetalle = false,
                        showDetalleHistorialDialog = false,
                        mensajeToast = "Error al cargar el detalle: ${e.message}"
                    )
                }
            }
        }
    }

    fun cerrarDetalleHistorial() {
        _uiState.update {
            it.copy(showDetalleHistorialDialog = false, detalleSeleccionado = null)
        }
    }

    /** El rol MESERO no puede editar ni anular pedidos (igual que en el web). */
    val puedeEditarPedidos: Boolean
        get() = _uiState.value.sesion?.rol?.uppercase() != "MESERO"

    // ------------------------------------------------------------------
    // Edición de pedido
    // ------------------------------------------------------------------
    fun abrirEditarPedido() {
        val detalle = _uiState.value.detalleSeleccionado ?: return
        if (!puedeEditarPedidos) {
            _uiState.update { it.copy(mensajeToast = "No tienes permisos para editar pedidos.") }
            return
        }
        val pedido = detalle.pedido
        _uiState.update {
            it.copy(
                showDetalleHistorialDialog = false,
                showEditarPedidoDialog = true,
                edicionItems = detalle.items.map { d ->
                    EdicionItem(
                        productoId = 0,
                        nombre = d.nombre,
                        cantidad = d.cantidad,
                        precioUnitario = d.precioUnitario,
                        descuentoItem = 0.0,
                        notas = d.notas ?: ""
                    )
                },
                edicionCliente = pedido.clienteNombre,
                edicionMesa = pedido.numeroMesa?.toString() ?: "",
                edicionDescuento = pedido.descuento,
                edicionMetodoPago = pedido.metodoPago
            )
        }
        // Cargar IDs reales de producto para poder guardar.
        completarIdsEdicion(pedido.id)
    }

    private fun completarIdsEdicion(pedidoId: Long) {
        val sesion = _uiState.value.sesion ?: return
        viewModelScope.launch {
            try {
                val detalles = repository.cargarDetallePedidoConIds(pedidoId)
                _uiState.update { state ->
                    val nuevos = state.edicionItems.mapIndexed { index, item ->
                        val match = detalles.getOrNull(index)
                        if (match != null) item.copy(productoId = match.productoId) else item
                    }
                    state.copy(edicionItems = nuevos)
                }
            } catch (_: Exception) {
            }
        }
    }

    fun cerrarEditarPedido() {
        _uiState.update { it.copy(showEditarPedidoDialog = false) }
    }

    fun onEdicionClienteChanged(valor: String) {
        _uiState.update { it.copy(edicionCliente = valor) }
    }

    fun onEdicionMesaChanged(valor: String) {
        _uiState.update { it.copy(edicionMesa = valor) }
    }

    fun onEdicionDescuentoChanged(valor: Double) {
        _uiState.update { it.copy(edicionDescuento = maxOf(0.0, valor)) }
    }

    fun onEdicionMetodoPagoChanged(metodo: MetodoPago) {
        _uiState.update { it.copy(edicionMetodoPago = metodo) }
    }

    fun onEdicionCantidadChanged(index: Int, delta: Int) {
        _uiState.update { state ->
            val lista = state.edicionItems.toMutableList()
            val item = lista.getOrNull(index) ?: return@update state
            val nueva = (item.cantidad + delta).coerceAtLeast(1)
            lista[index] = item.copy(cantidad = nueva)
            state.copy(edicionItems = lista)
        }
    }

    fun onEdicionPrecioChanged(index: Int, valor: Double) {
        _uiState.update { state ->
            val lista = state.edicionItems.toMutableList()
            val item = lista.getOrNull(index) ?: return@update state
            lista[index] = item.copy(precioUnitario = maxOf(0.0, valor))
            state.copy(edicionItems = lista)
        }
    }

    fun onEdicionNotasChanged(index: Int, valor: String) {
        _uiState.update { state ->
            val lista = state.edicionItems.toMutableList()
            val item = lista.getOrNull(index) ?: return@update state
            lista[index] = item.copy(notas = valor)
            state.copy(edicionItems = lista)
        }
    }

    fun removerEdicionItem(index: Int) {
        _uiState.update { state ->
            if (state.edicionItems.size <= 1) {
                return@update state.copy(mensajeToast = "El pedido debe tener al menos un producto.")
            }
            val lista = state.edicionItems.toMutableList().also { it.removeAt(index) }
            state.copy(edicionItems = lista)
        }
    }

    fun guardarEdicionPedido() {
        val state = _uiState.value
        val pedido = state.detalleSeleccionado?.pedido ?: return
        val sesion = state.sesion ?: return

        if (state.edicionItems.isEmpty()) {
            _uiState.update { it.copy(mensajeToast = "El pedido debe tener al menos un producto.") }
            return
        }
        if (state.edicionItems.any { it.productoId == 0L }) {
            _uiState.update { it.copy(mensajeToast = "No se pudieron identificar los productos. Reintenta.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isProcesando = true) }
            try {
                repository.editarVenta(
                    pedidoId = pedido.id,
                    clienteNombre = state.edicionCliente,
                    numeroMesa = state.edicionMesa.toIntOrNull(),
                    descuentoGlobal = state.edicionDescuento,
                    items = state.edicionItems,
                    metodoPago = state.edicionMetodoPago,
                    sesion = sesion
                )
                _uiState.update {
                    it.copy(
                        isProcesando = false,
                        showEditarPedidoDialog = false,
                        mensajeToast = "Pedido #${pedido.id} actualizado correctamente."
                    )
                }
                cargarHistorial()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isProcesando = false, mensajeToast = "Error al editar: ${e.message}")
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // Anulación de pedido
    // ------------------------------------------------------------------
    fun abrirAnularPedido() {
        if (!puedeEditarPedidos) {
            _uiState.update { it.copy(mensajeToast = "No tienes permisos para anular pedidos.") }
            return
        }
        _uiState.update { it.copy(showAnularPedidoDialog = true) }
    }

    fun cerrarAnularPedido() {
        _uiState.update { it.copy(showAnularPedidoDialog = false) }
    }

    fun anularPedido(motivo: String, devolverStock: Boolean) {
        val state = _uiState.value
        val pedido = state.detalleSeleccionado?.pedido ?: return
        val sesion = state.sesion ?: return

        if (motivo.trim().length < 5) {
            _uiState.update { it.copy(mensajeToast = "El motivo debe tener al menos 5 caracteres.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isProcesando = true) }
            try {
                repository.anularVenta(
                    pedidoId = pedido.id,
                    motivo = motivo.trim(),
                    devolverStock = devolverStock,
                    sesion = sesion
                )
                _uiState.update {
                    it.copy(
                        isProcesando = false,
                        showAnularPedidoDialog = false,
                        showDetalleHistorialDialog = false,
                        detalleSeleccionado = null,
                        mensajeToast = "Pedido #${pedido.id} anulado exitosamente."
                    )
                }
                cargarHistorial()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isProcesando = false, mensajeToast = "Error al anular: ${e.message}")
                }
            }
        }
    }
}
