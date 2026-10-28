package com.donamigue.pos.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.donamigue.pos.model.DetalleHistorial
import com.donamigue.pos.model.EdicionItem
import com.donamigue.pos.model.EstadoPedido
import com.donamigue.pos.model.MetodoPago
import com.donamigue.pos.model.PedidoHistorial
import com.donamigue.pos.ui.theme.*
import com.donamigue.pos.ui.viewmodel.PosUiState
import com.donamigue.pos.ui.viewmodel.PosViewModel
import java.text.SimpleDateFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistorialScreen(
    viewModel: PosViewModel,
    uiState: PosUiState
) {
    Scaffold(
        topBar = {
            Surface(color = CharcoalDark, shadowElevation = 6.dp) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { viewModel.abrirHistorial(false) }) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Volver",
                            tint = Color.White
                        )
                    }
                    Spacer(modifier = Modifier.width(4.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "HISTORIAL DE VENTAS",
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 16.sp
                        )
                        Text(
                            text = uiState.sesion?.sucursalNombre ?: "Sucursal",
                            color = AmberLight,
                            fontSize = 11.sp
                        )
                    }
                    IconButton(onClick = { viewModel.cargarHistorial() }) {
                        Icon(
                            imageVector = Icons.Default.Receipt,
                            contentDescription = "Recargar",
                            tint = AmberLight
                        )
                    }
                }
            }
        },
        containerColor = StoneBackground
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                OutlinedTextField(
                    value = uiState.busquedaHistorial,
                    onValueChange = { viewModel.onBusquedaHistorialChanged(it) },
                    placeholder = { Text("Buscar por cliente, #pedido o mesa...", fontSize = 13.sp) },
                    leadingIcon = {
                        Icon(imageVector = Icons.Default.Search, contentDescription = "Buscar", tint = AmberPrimary)
                    },
                    trailingIcon = {
                        if (uiState.busquedaHistorial.isNotEmpty()) {
                            IconButton(onClick = { viewModel.onBusquedaHistorialChanged("") }) {
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

            when {
                uiState.cargandoHistorial -> {
                    Box(
                        modifier = Modifier.fillMaxSize().padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = AmberPrimary)
                    }
                }
                uiState.errorHistorial != null -> {
                    Box(
                        modifier = Modifier.fillMaxSize().padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = uiState.errorHistorial,
                            color = DangerRed,
                            fontSize = 14.sp
                        )
                    }
                }
                uiState.historialFiltrado.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize().padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No hay ventas registradas.",
                            color = TextSecondary,
                            fontSize = 14.sp
                        )
                    }
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(uiState.historialFiltrado, key = { it.id }) { pedido ->
                            PedidoHistorialCard(
                                pedido = pedido,
                                onClick = { viewModel.verDetalleHistorial(pedido) }
                            )
                        }
                    }
                }
            }
        }
    }

    if (uiState.showDetalleHistorialDialog) {
        DetalleHistorialDialog(
            detalle = uiState.detalleSeleccionado,
            cargando = uiState.cargandoDetalle,
            puedeEditar = uiState.sesion?.rol?.uppercase() != "MESERO",
            onEditar = { viewModel.abrirEditarPedido() },
            onAnular = { viewModel.abrirAnularPedido() },
            onDismiss = { viewModel.cerrarDetalleHistorial() }
        )
    }

    if (uiState.showEditarPedidoDialog) {
        EditarPedidoDialog(
            uiState = uiState,
            onClienteChanged = { viewModel.onEdicionClienteChanged(it) },
            onMesaChanged = { viewModel.onEdicionMesaChanged(it) },
            onDescuentoChanged = { viewModel.onEdicionDescuentoChanged(it) },
            onMetodoPagoChanged = { viewModel.onEdicionMetodoPagoChanged(it) },
            onCantidadChanged = { index, delta -> viewModel.onEdicionCantidadChanged(index, delta) },
            onPrecioChanged = { index, valor -> viewModel.onEdicionPrecioChanged(index, valor) },
            onNotasChanged = { index, valor -> viewModel.onEdicionNotasChanged(index, valor) },
            onRemoverItem = { viewModel.removerEdicionItem(it) },
            onGuardar = { viewModel.guardarEdicionPedido() },
            onDismiss = { viewModel.cerrarEditarPedido() }
        )
    }

    if (uiState.showAnularPedidoDialog) {
        AnularPedidoDialog(
            pedido = uiState.detalleSeleccionado?.pedido,
            isProcesando = uiState.isProcesando,
            onConfirmar = { motivo, devolverStock -> viewModel.anularPedido(motivo, devolverStock) },
            onDismiss = { viewModel.cerrarAnularPedido() }
        )
    }
}

@Composable
private fun PedidoHistorialCard(
    pedido: PedidoHistorial,
    onClick: () -> Unit
) {
    val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "#${pedido.id}",
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    EstadoChip(pedido.estado)
                }
                Text(
                    text = "Bs. ${String.format("%.2f", pedido.total)}",
                    fontWeight = FontWeight.Black,
                    fontSize = 15.sp,
                    color = AmberPrimary
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = pedido.clienteNombre,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = if (pedido.numeroMesa != null) "Mesa ${pedido.numeroMesa}" else "Mostrador",
                    fontSize = 11.sp,
                    color = TextSecondary
                )
                Text(
                    text = pedido.metodoPago?.label ?: "Sin pago",
                    fontSize = 11.sp,
                    color = TextSecondary
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = sdf.format(pedido.fecha),
                    fontSize = 11.sp,
                    color = TextMuted
                )
                Text(
                    text = pedido.cajeroNombre,
                    fontSize = 11.sp,
                    color = TextMuted
                )
            }

            if (pedido.estado == EstadoPedido.ANULADO && !pedido.motivoAnulacion.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Motivo anulación: ${pedido.motivoAnulacion}",
                    fontSize = 11.sp,
                    color = DangerRed,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
private fun EstadoChip(estado: EstadoPedido) {
    val (fondo, texto) = when (estado) {
        EstadoPedido.PAGADO -> SuccessGreenLight to SuccessGreen
        EstadoPedido.PENDIENTE -> Color(0xFFFFEDD5) to WarningOrange
        EstadoPedido.ANULADO -> DangerRedLight to DangerRed
        EstadoPedido.OTRO -> StoneBackground to TextSecondary
    }
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(fondo)
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(
            text = estado.label.uppercase(),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = texto
        )
    }
}

@Composable
private fun DetalleHistorialDialog(
    detalle: DetalleHistorial?,
    cargando: Boolean,
    puedeEditar: Boolean,
    onEditar: () -> Unit,
    onAnular: () -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                if (cargando || detalle == null) {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = AmberPrimary)
                    }
                    return@Column
                }

                val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
                val pedido = detalle.pedido

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Comanda #${pedido.id}",
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        color = TextPrimary
                    )
                    EstadoChip(pedido.estado)
                }

                Spacer(modifier = Modifier.height(4.dp))
                Text(text = sdf.format(pedido.fecha), fontSize = 12.sp, color = TextSecondary)
                Text(
                    text = "Cliente: ${pedido.clienteNombre}" +
                        (if (pedido.numeroMesa != null) "  •  Mesa ${pedido.numeroMesa}" else ""),
                    fontSize = 12.sp,
                    color = TextSecondary
                )
                Text(text = "Cajero: ${pedido.cajeroNombre}", fontSize = 12.sp, color = TextSecondary)

                Spacer(modifier = Modifier.height(12.dp))
                Divider(color = StoneBorder)
                Spacer(modifier = Modifier.height(8.dp))

                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 260.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(detalle.items) { item ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${item.cantidad}x ${item.nombre}",
                                    fontSize = 13.sp,
                                    color = TextPrimary,
                                    fontWeight = FontWeight.Medium
                                )
                                if (!item.notas.isNullOrBlank()) {
                                    Text(
                                        text = "Nota: ${item.notas}",
                                        fontSize = 11.sp,
                                        color = TextMuted
                                    )
                                }
                            }
                            Text(
                                text = "Bs. ${String.format("%.2f", item.subtotal)}",
                                fontSize = 13.sp,
                                color = TextPrimary
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))
                Divider(color = StoneBorder)
                Spacer(modifier = Modifier.height(8.dp))

                FilaResumen("Subtotal", pedido.subtotal)
                if (pedido.descuento > 0) {
                    FilaResumen("Descuento", -pedido.descuento)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = "TOTAL", fontWeight = FontWeight.Black, fontSize = 15.sp, color = TextPrimary)
                    Text(
                        text = "Bs. ${String.format("%.2f", pedido.total)}",
                        fontWeight = FontWeight.Black,
                        fontSize = 15.sp,
                        color = AmberPrimary
                    )
                }

                if (pedido.metodoPago != null) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Pagado con: ${pedido.metodoPago.label}",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }

                if (pedido.estado == EstadoPedido.ANULADO && !pedido.motivoAnulacion.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Motivo anulación: ${pedido.motivoAnulacion}",
                        fontSize = 12.sp,
                        color = DangerRed,
                        fontWeight = FontWeight.Medium
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (puedeEditar && pedido.estado != EstadoPedido.ANULADO) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = onEditar,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f).height(46.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(text = "Editar", fontWeight = FontWeight.Bold)
                        }
                        Button(
                            onClick = onAnular,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = DangerRed,
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f).height(46.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Cancel,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(text = "Anular", fontWeight = FontWeight.Bold)
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }

                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AmberPrimary,
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().height(46.dp)
                ) {
                    Text(text = "Cerrar", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun FilaResumen(label: String, valor: Double) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, fontSize = 12.sp, color = TextSecondary)
        Text(text = "Bs. ${String.format("%.2f", valor)}", fontSize = 12.sp, color = TextPrimary)
    }
}

@Composable
private fun EditarPedidoDialog(
    uiState: PosUiState,
    onClienteChanged: (String) -> Unit,
    onMesaChanged: (String) -> Unit,
    onDescuentoChanged: (Double) -> Unit,
    onMetodoPagoChanged: (MetodoPago) -> Unit,
    onCantidadChanged: (Int, Int) -> Unit,
    onPrecioChanged: (Int, Double) -> Unit,
    onNotasChanged: (Int, String) -> Unit,
    onRemoverItem: (Int) -> Unit,
    onGuardar: () -> Unit,
    onDismiss: () -> Unit
) {
    val pedidoId = uiState.detalleSeleccionado?.pedido?.id
    val subtotal = uiState.edicionItems.sumOf { it.subtotal }
    val total = maxOf(0.0, subtotal - uiState.edicionDescuento)
    var descuentoTexto by remember { mutableStateOf(uiState.edicionDescuento.toString()) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(18.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(imageVector = Icons.Default.Edit, contentDescription = null, tint = AmberPrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Editar Comanda #$pedidoId",
                            fontWeight = FontWeight.Black,
                            fontSize = 17.sp,
                            color = TextPrimary
                        )
                    }
                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.Clear, contentDescription = "Cerrar")
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = uiState.edicionCliente,
                        onValueChange = onClienteChanged,
                        label = { Text("Cliente", fontSize = 12.sp) },
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(2f)
                    )
                    OutlinedTextField(
                        value = uiState.edicionMesa,
                        onValueChange = onMesaChanged,
                        label = { Text("Mesa", fontSize = 12.sp) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "Productos",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = TextSecondary
                )
                Spacer(modifier = Modifier.height(6.dp))

                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 300.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    itemsIndexed(uiState.edicionItems) { index, item ->
                        Card(
                            shape = RoundedCornerShape(10.dp),
                            colors = CardDefaults.cardColors(containerColor = StoneBackground),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.fillMaxWidth().padding(10.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = item.nombre,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 13.sp,
                                        color = TextPrimary,
                                        modifier = Modifier.weight(1f)
                                    )
                                    IconButton(
                                        onClick = { onRemoverItem(index) },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Delete,
                                            contentDescription = "Quitar",
                                            tint = DangerRed,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(4.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    IconButton(
                                        onClick = { onCantidadChanged(index, -1) },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(imageVector = Icons.Default.Remove, contentDescription = "Menos", tint = TextPrimary)
                                    }
                                    Text(
                                        text = item.cantidad.toString(),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = TextPrimary
                                    )
                                    IconButton(
                                        onClick = { onCantidadChanged(index, 1) },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(imageVector = Icons.Default.Add, contentDescription = "Más", tint = TextPrimary)
                                    }

                                    OutlinedTextField(
                                        value = item.precioUnitario.toString(),
                                        onValueChange = { onPrecioChanged(index, it.toDoubleOrNull() ?: 0.0) },
                                        label = { Text("P. Unit", fontSize = 10.sp) },
                                        singleLine = true,
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.weight(1f)
                                    )

                                    Text(
                                        text = "Bs. ${String.format("%.2f", item.subtotal)}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = AmberPrimary
                                    )
                                }

                                OutlinedTextField(
                                    value = item.notas,
                                    onValueChange = { onNotasChanged(index, it) },
                                    label = { Text("Notas", fontSize = 11.sp) },
                                    singleLine = true,
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "Método de pago",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = TextSecondary
                )
                Spacer(modifier = Modifier.height(6.dp))
                FlowRowMetodoPago(
                    seleccionado = uiState.edicionMetodoPago,
                    onSeleccion = onMetodoPagoChanged
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = descuentoTexto,
                    onValueChange = {
                        descuentoTexto = it
                        onDescuentoChanged(it.toDoubleOrNull() ?: 0.0)
                    },
                    label = { Text("Descuento global (Bs.)", fontSize = 12.sp) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))
                Divider(color = StoneBorder)
                Spacer(modifier = Modifier.height(8.dp))
                FilaResumen("Subtotal", subtotal)
                if (uiState.edicionDescuento > 0) FilaResumen("Descuento", -uiState.edicionDescuento)
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = "TOTAL", fontWeight = FontWeight.Black, fontSize = 15.sp, color = TextPrimary)
                    Text(
                        text = "Bs. ${String.format("%.2f", total)}",
                        fontWeight = FontWeight.Black,
                        fontSize = 15.sp,
                        color = AmberPrimary
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = onGuardar,
                    enabled = !uiState.isProcesando,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AmberPrimary,
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    if (uiState.isProcesando) {
                        CircularProgressIndicator(
                            color = Color.White,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(20.dp)
                        )
                    } else {
                        Text(text = "Guardar Cambios", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun FlowRowMetodoPago(
    seleccionado: MetodoPago?,
    onSeleccion: (MetodoPago) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        MetodoPago.entries.forEach { metodo ->
            val activo = seleccionado == metodo
            FilterChip(
                selected = activo,
                onClick = { onSeleccion(metodo) },
                label = { Text(metodo.label, fontSize = 10.sp) },
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun AnularPedidoDialog(
    pedido: PedidoHistorial?,
    isProcesando: Boolean,
    onConfirmar: (String, Boolean) -> Unit,
    onDismiss: () -> Unit
) {
    if (pedido == null) return
    var motivo by remember { mutableStateOf("") }
    var devolverStock by remember { mutableStateOf(true) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(imageVector = Icons.Default.Cancel, contentDescription = null, tint = DangerRed)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Anular Comanda #${pedido.id}",
                        fontWeight = FontWeight.Black,
                        fontSize = 17.sp,
                        color = TextPrimary
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = "Esta acción anula el pedido #${pedido.id} por Bs. " +
                        String.format("%.2f", pedido.total) + ". No se puede deshacer.",
                    fontSize = 13.sp,
                    color = TextSecondary
                )

                Spacer(modifier = Modifier.height(14.dp))

                OutlinedTextField(
                    value = motivo,
                    onValueChange = { motivo = it },
                    label = { Text("Motivo de anulación (mín. 5 caracteres)") },
                    placeholder = { Text("Ej: Cliente canceló el pedido") },
                    maxLines = 3,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = devolverStock,
                        onCheckedChange = { devolverStock = it }
                    )
                    Text(
                        text = "Devolver productos al inventario",
                        fontSize = 13.sp,
                        color = TextPrimary
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f).height(46.dp)
                    ) {
                        Text(text = "Cancelar", fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = { onConfirmar(motivo, devolverStock) },
                        enabled = !isProcesando,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = DangerRed,
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f).height(46.dp)
                    ) {
                        if (isProcesando) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(20.dp)
                            )
                        } else {
                            Text(text = "Confirmar", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
