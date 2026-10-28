package com.donamigue.pos.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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
import com.donamigue.pos.model.CartItem
import com.donamigue.pos.ui.theme.*

@Composable
fun CartSummaryBar(
    totalItems: Int,
    totalPagar: Double,
    onVerComandaClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = totalItems > 0,
        enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
        modifier = modifier
    ) {
        Surface(
            color = CharcoalDark,
            shadowElevation = 10.dp,
            shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Info Carrito
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { onVerComandaClick() }
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(AmberPrimary),
                        contentAlignment = Alignment.Center
                    ) {
                        BadgedBox(
                            badge = {
                                Badge(
                                    containerColor = Color.White,
                                    contentColor = CharcoalDark
                                ) {
                                    Text(text = "$totalItems", fontWeight = FontWeight.Bold)
                                }
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Default.ShoppingCart,
                                contentDescription = "Carrito",
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Text(
                            text = "Total a Pagar",
                            fontSize = 11.sp,
                            color = StoneBorder,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = "Bs. ${String.format("%.2f", totalPagar)}",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                    }
                }

                // Botón Acción
                Button(
                    onClick = onVerComandaClick,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AmberPrimary,
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(14.dp),
                    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 10.dp)
                ) {
                    Text(
                        text = "Cobrar",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(
                        imageVector = Icons.Default.ArrowForward,
                        contentDescription = "Cobrar",
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartBottomSheet(
    carrito: List<CartItem>,
    subtotal: Double,
    descuentoGlobal: Double,
    totalPagar: Double,
    clienteNombre: String,
    numeroMesa: String,
    onClienteNombreChanged: (String) -> Unit,
    onNumeroMesaChanged: (String) -> Unit,
    onDescuentoChanged: (Double) -> Unit,
    onIncrementar: (CartItem) -> Unit,
    onDecrementar: (CartItem) -> Unit,
    onRemover: (CartItem) -> Unit,
    onVaciarCarrito: () -> Unit,
    onProcederCobro: () -> Unit,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Color.White,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp)
        ) {
            // Header del Sheet
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.ReceiptLong,
                        contentDescription = null,
                        tint = AmberPrimary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Comanda Actual",
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        color = TextPrimary
                    )
                }

                if (carrito.isNotEmpty()) {
                    TextButton(onClick = onVaciarCarrito) {
                        Icon(
                            imageVector = Icons.Default.DeleteOutline,
                            contentDescription = "Vaciar",
                            tint = DangerRed,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "Vaciar", color = DangerRed, fontSize = 12.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Campos de Datos del Cliente y Mesa
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = clienteNombre,
                    onValueChange = onClienteNombreChanged,
                    label = { Text("Cliente", fontSize = 12.sp) },
                    placeholder = { Text("General / Nombre", fontSize = 12.sp) },
                    modifier = Modifier.weight(1.8f),
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp)
                )

                OutlinedTextField(
                    value = numeroMesa,
                    onValueChange = onNumeroMesaChanged,
                    label = { Text("Mesa #", fontSize = 12.sp) },
                    placeholder = { Text("Ej: 4", fontSize = 12.sp) },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(10.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Divider(color = StoneBorder)

            // Lista de Items en el carrito
            if (carrito.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "La comanda no tiene productos aún",
                        color = TextSecondary,
                        fontSize = 14.sp
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 280.dp)
                        .padding(vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(carrito, key = { it.producto.id }) { item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(StoneBackground)
                                .padding(10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1.5f)) {
                                Text(
                                    text = item.producto.nombre,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = TextPrimary
                                )
                                Text(
                                    text = "Bs. ${String.format("%.2f", item.producto.precioBase)} c/u",
                                    fontSize = 11.sp,
                                    color = TextSecondary
                                )
                            }

                            // Controles de Cantidad
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                IconButton(
                                    onClick = { onDecrementar(item) },
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape)
                                        .background(Color.White)
                                        .border(1.dp, StoneBorder, CircleShape)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Remove,
                                        contentDescription = "Menos",
                                        modifier = Modifier.size(14.dp)
                                    )
                                }

                                Text(
                                    text = "${item.cantidad}",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 14.sp,
                                    color = TextPrimary
                                )

                                IconButton(
                                    onClick = { onIncrementar(item) },
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape)
                                        .background(AmberPrimary)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Add,
                                        contentDescription = "Más",
                                        tint = Color.White,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            }

                            // Subtotal del item
                            Text(
                                text = "Bs. ${String.format("%.2f", item.subtotal)}",
                                fontWeight = FontWeight.Black,
                                fontSize = 13.sp,
                                color = AmberDark,
                                modifier = Modifier
                                    .padding(start = 12.dp)
                                    .widthIn(min = 60.dp)
                            )
                        }
                    }
                }
            }

            Divider(color = StoneBorder)

            Spacer(modifier = Modifier.height(10.dp))

            // Resumen de Totales
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = "Subtotal:", color = TextSecondary, fontSize = 13.sp)
                    Text(text = "Bs. ${String.format("%.2f", subtotal)}", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                }

                if (descuentoGlobal > 0) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "Descuento:", color = DangerRed, fontSize = 13.sp)
                        Text(text = "- Bs. ${String.format("%.2f", descuentoGlobal)}", color = DangerRed, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "TOTAL A COBRAR:", fontWeight = FontWeight.Black, fontSize = 16.sp, color = TextPrimary)
                    Text(
                        text = "Bs. ${String.format("%.2f", totalPagar)}",
                        fontWeight = FontWeight.Black,
                        fontSize = 20.sp,
                        color = AmberPrimary
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Botón Cobrar
            Button(
                onClick = onProcederCobro,
                enabled = carrito.isNotEmpty(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = AmberPrimary,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Icon(imageVector = Icons.Default.Payment, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Proceder al Cobro (Bs. ${String.format("%.2f", totalPagar)})",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            }
        }
    }
}
