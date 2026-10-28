package com.donamigue.pos.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.window.Dialog
import com.donamigue.pos.model.MetodoPago
import com.donamigue.pos.ui.theme.*

@Composable
fun CheckoutDialog(
    totalPagar: Double,
    isProcesando: Boolean,
    onConfirmarPago: (MetodoPago, Double?) -> Unit,
    onDismiss: () -> Unit
) {
    var metodoSeleccionado by remember { mutableStateOf(MetodoPago.EFECTIVO) }
    var efectivoRecibidoTexto by remember { mutableStateOf("") }

    val efectivoRecibido = efectivoRecibidoTexto.toDoubleOrNull() ?: 0.0
    val cambio = maxOf(0.0, efectivoRecibido - totalPagar)
    val esMontoSuficiente = metodoSeleccionado != MetodoPago.EFECTIVO || efectivoRecibido >= totalPagar

    Dialog(onDismissRequest = { if (!isProcesando) onDismiss() }) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Registrar Cobro",
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        color = TextPrimary
                    )
                    IconButton(
                        onClick = onDismiss,
                        enabled = !isProcesando,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Cerrar")
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Tarjeta de Total a Pagar
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(AmberLight)
                        .padding(14.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "MONTO TOTAL",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = AmberDark
                        )
                        Text(
                            text = "Bs. ${String.format("%.2f", totalPagar)}",
                            fontSize = 26.sp,
                            fontWeight = FontWeight.Black,
                            color = AmberDark
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = "Método de Pago",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextSecondary
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Selector de Métodos de Pago
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    MetodoPago.values().forEach { metodo ->
                        val isSelected = metodoSeleccionado == metodo
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (isSelected) AmberPrimary else StoneBackground)
                                .border(1.dp, if (isSelected) AmberPrimary else StoneBorder, RoundedCornerShape(10.dp))
                                .clickable { metodoSeleccionado = metodo }
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    imageVector = when (metodo) {
                                        MetodoPago.EFECTIVO -> Icons.Default.Payments
                                        MetodoPago.QR -> Icons.Default.QrCode
                                        MetodoPago.TARJETA -> Icons.Default.CreditCard
                                        MetodoPago.TRANSFERENCIA -> Icons.Default.AccountBalance
                                    },
                                    contentDescription = metodo.label,
                                    tint = if (isSelected) Color.White else TextPrimary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = when (metodo) {
                                        MetodoPago.EFECTIVO -> "Efectivo"
                                        MetodoPago.QR -> "QR"
                                        MetodoPago.TARJETA -> "Tarjeta"
                                        MetodoPago.TRANSFERENCIA -> "Transf."
                                    },
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Color.White else TextPrimary
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Sección Especial si es Efectivo: Billetes rápidos y Cambio
                if (metodoSeleccionado == MetodoPago.EFECTIVO) {
                    OutlinedTextField(
                        value = efectivoRecibidoTexto,
                        onValueChange = { efectivoRecibidoTexto = it },
                        label = { Text("Monto Recibido (Bs.)") },
                        placeholder = { Text("0.00") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Billetes de corte rápido en Bolivianos
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf(
                            "Exacto" to totalPagar,
                            "Bs. 20" to 20.0,
                            "Bs. 50" to 50.0,
                            "Bs. 100" to 100.0,
                            "Bs. 200" to 200.0
                        ).forEach { (label, monto) ->
                            OutlinedButton(
                                onClick = { efectivoRecibidoTexto = String.format("%.2f", monto) },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(34.dp),
                                contentPadding = PaddingValues(0.dp),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(text = label, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Caja de Cambio / Vuelto
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (esMontoSuficiente) SuccessGreenLight else DangerRedLight)
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (esMontoSuficiente) "Cambio / Vuelto a entregar:" else "Monto insuficiente:",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (esMontoSuficiente) SuccessGreen else DangerRed
                        )
                        Text(
                            text = "Bs. ${String.format("%.2f", cambio)}",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Black,
                            color = if (esMontoSuficiente) SuccessGreen else DangerRed
                        )
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(StoneBackground)
                            .padding(14.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Cobro electrónico directo. Se registrará la comanda y descontará stock automáticamente.",
                            fontSize = 12.sp,
                            color = TextSecondary,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                // Botón Confirmar
                Button(
                    onClick = {
                        val recib = if (metodoSeleccionado == MetodoPago.EFECTIVO) efectivoRecibido else null
                        onConfirmarPago(metodoSeleccionado, recib)
                    },
                    enabled = esMontoSuficiente && !isProcesando,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AmberPrimary,
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                ) {
                    if (isProcesando) {
                        CircularProgressIndicator(
                            color = Color.White,
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(imageVector = Icons.Default.Check, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Confirmar Pago y Emitir Comanda",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }
    }
}
