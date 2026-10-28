package com.donamigue.pos.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.donamigue.pos.ui.components.*
import com.donamigue.pos.ui.theme.*
import com.donamigue.pos.ui.viewmodel.PosViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PosScreen(
    viewModel: PosViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    if (uiState.mostrarHistorial) {
        HistorialScreen(viewModel = viewModel, uiState = uiState)
        return
    }

    var mostrarConfigImpresora by remember { mutableStateOf(false) }

    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    // Manejar Notificaciones Toast / Snackbar
    LaunchedEffect(uiState.mensajeToast) {
        uiState.mensajeToast?.let { mensaje ->
            coroutineScope.launch {
                snackbarHostState.showSnackbar(
                    message = mensaje,
                    duration = SnackbarDuration.Short
                )
                viewModel.limpiarMensajeToast()
            }
        }
    }

    Scaffold(
        topBar = {
            PosTopBar(
                cajaActiva = uiState.cajaActiva,
                sesion = uiState.sesion,
                onAbrirCajaClick = { viewModel.abrirDialogoApertura(true) },
                onCerrarCajaClick = { viewModel.abrirDialogoCierre(true) },
                onHistorialClick = { viewModel.abrirHistorial(true) },
                onConfigurarImpresoraClick = { mostrarConfigImpresora = true },
                onCerrarSesionClick = { viewModel.cerrarSesion() }
            )
        },
        bottomBar = {
            CartSummaryBar(
                totalItems = uiState.totalItemsCarrito,
                totalPagar = uiState.totalPagar,
                onVerComandaClick = { viewModel.abrirCartSheet(true) }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = StoneBackground
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Buscador de Platos y Productos
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                OutlinedTextField(
                    value = uiState.busqueda,
                    onValueChange = { viewModel.onBuscarChanged(it) },
                    placeholder = { Text("Buscar kjara, plato, bebida...", fontSize = 13.sp) },
                    leadingIcon = {
                        Icon(imageVector = Icons.Default.Search, contentDescription = "Buscar", tint = AmberPrimary)
                    },
                    trailingIcon = {
                        if (uiState.busqueda.isNotEmpty()) {
                            IconButton(onClick = { viewModel.onBuscarChanged("") }) {
                                Icon(imageVector = Icons.Default.Clear, contentDescription = "Limpiar")
                            }
                        }
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color.White,
                        unfocusedContainerColor = Color.White,
                        focusedBorderColor = AmberPrimary,
                        unfocusedBorderColor = StoneBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            // Barra de Categorías con Chips
            CategoryTabs(
                categorias = uiState.categorias,
                categoriaSeleccionadaId = uiState.categoriaSeleccionadaId,
                onCategoriaSeleccionada = { viewModel.onCategoriaSeleccionada(it) }
            )

            // Rejilla de Productos (Grid 2 Columnas Móvil)
            if (uiState.cargando) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = AmberPrimary)
                }
            } else if (uiState.errorCarga != null) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = uiState.errorCarga ?: "",
                        color = DangerRed,
                        fontSize = 14.sp
                    )
                }
            } else if (uiState.productosFiltrados.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No se encontraron productos coincidentes.",
                        color = TextSecondary,
                        fontSize = 14.sp
                    )
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        end = 16.dp,
                        top = 8.dp,
                        bottom = if (uiState.totalItemsCarrito > 0) 80.dp else 16.dp
                    ),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(uiState.productosFiltrados, key = { it.id }) { producto ->
                        val itemEnCarrito = uiState.carrito.find { it.producto.id == producto.id }
                        val cantidad = itemEnCarrito?.cantidad ?: 0

                        ProductCard(
                            producto = producto,
                            cantidadEnCarrito = cantidad,
                            onAgregarClick = { viewModel.agregarAlCarrito(it) }
                        )
                    }
                }
            }
        }
    }

    // Modal de la Comanda Completa
    if (uiState.showCartSheet) {
        CartBottomSheet(
            carrito = uiState.carrito,
            subtotal = uiState.subtotalCarrito,
            descuentoGlobal = uiState.descuentoGlobal,
            totalPagar = uiState.totalPagar,
            clienteNombre = uiState.clienteNombre,
            numeroMesa = uiState.numeroMesa,
            onClienteNombreChanged = { viewModel.onClienteNombreChanged(it) },
            onNumeroMesaChanged = { viewModel.onNumeroMesaChanged(it) },
            onDescuentoChanged = { viewModel.onDescuentoGlobalChanged(it) },
            onIncrementar = { viewModel.incrementarCantidad(it) },
            onDecrementar = { viewModel.decrementarCantidad(it) },
            onRemover = { viewModel.removerDelCarrito(it) },
            onVaciarCarrito = { viewModel.vaciarCarrito() },
            onProcederCobro = {
                viewModel.abrirCartSheet(false)
                viewModel.abrirDialogoCobro(true)
            },
            onDismiss = { viewModel.abrirCartSheet(false) }
        )
    }

    // Diálogo de Cobro
    if (uiState.showCheckoutDialog) {
        CheckoutDialog(
            totalPagar = uiState.totalPagar,
            isProcesando = uiState.isProcesando,
            onConfirmarPago = { metodo, efectivoRecibido ->
                viewModel.procesarCobro(metodo, efectivoRecibido)
            },
            onDismiss = { viewModel.abrirDialogoCobro(false) }
        )
    }

    // Diálogo de Ticket Térmico / Comanda
    if (uiState.showTicketDialog) {
        TicketReceiptDialog(
            ticket = uiState.ticketActivo,
            onDismiss = { viewModel.cerrarTicketDialog() }
        )
    }

    // Diálogo de Configuración de Impresora Epson
    if (mostrarConfigImpresora) {
        PrinterConfigDialog(onDismiss = { mostrarConfigImpresora = false })
    }

    // Diálogo de Apertura de Caja
    if (uiState.showOpenRegisterDialog) {
        OpenRegisterDialog(
            onConfirmarApertura = { monto ->
                viewModel.abrirCaja(monto)
            },
            onDismiss = { viewModel.abrirDialogoApertura(false) }
        )
    }

    // Diálogo de Cierre de Caja
    if (uiState.showCloseRegisterDialog) {
        CloseRegisterDialog(
            cajaActiva = uiState.cajaActiva,
            onConfirmarCierre = { efec, dig, obs ->
                viewModel.cerrarCaja(efec, dig, obs)
            },
            onDismiss = { viewModel.abrirDialogoCierre(false) }
        )
    }

    // Diálogo de Arqueo
    if (uiState.showArqueoDialog) {
        ArqueoSummaryDialog(
            arqueo = uiState.arqueoResultado,
            onDismiss = { viewModel.cerrarDialogoArqueo() }
        )
    }
}
