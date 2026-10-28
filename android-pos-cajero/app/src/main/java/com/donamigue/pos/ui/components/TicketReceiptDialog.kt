package com.donamigue.pos.ui.components

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.donamigue.pos.data.PrinterManager
import com.donamigue.pos.model.TicketData
import com.donamigue.pos.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Locale

@Composable
fun TicketReceiptDialog(
    ticket: TicketData?,
    onDismiss: () -> Unit
) {
    if (ticket == null) return

    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
    val fechaStr = sdf.format(ticket.fecha)

    var imprimiendo by remember { mutableStateOf(false) }
    var aviso by remember { mutableStateOf<String?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(aviso) {
        aviso?.let {
            snackbarHostState.showSnackbar(it)
            aviso = null
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Box(modifier = Modifier.fillMaxSize()) {
            Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                // Header con Botón Cerrar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Receipt,
                            contentDescription = null,
                            tint = AmberPrimary
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Comprobante de Venta",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = TextPrimary
                        )
                    }
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Cerrar")
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Contenedor Visual de Ticket Térmico
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFFFFFBEB))
                        .border(1.dp, AmberLight, RoundedCornerShape(12.dp))
                        .padding(16.dp)
                        .verticalScroll(rememberScrollState()),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Logo Doña Migue
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocalFireDepartment,
                            contentDescription = null,
                            tint = WarningOrange,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "DOÑA MIGUE",
                            fontWeight = FontWeight.Black,
                            fontSize = 16.sp,
                            color = TextPrimary,
                            letterSpacing = 1.sp
                        )
                    }

                    Text(
                        text = ticket.sucursalNombre.uppercase(),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextSecondary
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    // Badge Comanda
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, StoneBorder)
                    ) {
                        Text(
                            text = "COMANDA #${ticket.pedidoId} • TURNO #${ticket.aperturaCajaId ?: "-"}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Divider(color = Color.LightGray)
                    Spacer(modifier = Modifier.height(8.dp))

                    // Metadatos
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(text = "Cliente:", fontSize = 11.sp, color = TextSecondary, fontWeight = FontWeight.Bold)
                            Text(text = ticket.clienteNombre, fontSize = 11.sp, fontWeight = FontWeight.Black, color = TextPrimary)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(text = "Ubicación:", fontSize = 11.sp, color = TextSecondary, fontWeight = FontWeight.Bold)
                            Text(
                                text = if (ticket.numeroMesa != null) "MESA #${ticket.numeroMesa}" else "LLEVAR / MOSTRADOR",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = AmberDark
                            )
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(text = "Fecha:", fontSize = 11.sp, color = TextSecondary)
                            Text(text = fechaStr, fontSize = 11.sp, color = TextPrimary)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(text = "Cajero:", fontSize = 11.sp, color = TextSecondary)
                            Text(text = ticket.cajeroNombre, fontSize = 11.sp, color = TextPrimary)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Divider(color = Color.LightGray)
                    Spacer(modifier = Modifier.height(8.dp))

                    // Items
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        ticket.items.forEach { item ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "${item.cantidad}x ${item.nombre}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = "Bs. ${String.format("%.2f", item.subtotal)}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Black,
                                    color = TextPrimary
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Divider(color = Color.LightGray)
                    Spacer(modifier = Modifier.height(8.dp))

                    // Totales
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(text = "Subtotal:", fontSize = 12.sp, color = TextSecondary)
                            Text(text = "Bs. ${String.format("%.2f", ticket.subtotal)}", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        }
                        if (ticket.descuento > 0) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(text = "Descuento:", fontSize = 12.sp, color = DangerRed)
                                Text(text = "- Bs. ${String.format("%.2f", ticket.descuento)}", fontSize = 12.sp, color = DangerRed, fontWeight = FontWeight.Bold)
                            }
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(text = "TOTAL:", fontSize = 15.sp, fontWeight = FontWeight.Black, color = TextPrimary)
                            Text(text = "Bs. ${String.format("%.2f", ticket.total)}", fontSize = 18.sp, fontWeight = FontWeight.Black, color = AmberDark)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Divider(color = Color.LightGray)
                    Spacer(modifier = Modifier.height(8.dp))

                    // Método de Pago y Vuelto
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(text = "Método de Pago:", fontSize = 11.sp, color = TextSecondary)
                        Text(text = ticket.metodoPago.label, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                    if (ticket.efectivoRecibido != null) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(text = "Efectivo Recibido:", fontSize = 11.sp, color = TextSecondary)
                            Text(text = "Bs. ${String.format("%.2f", ticket.efectivoRecibido)}", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    if (ticket.cambio != null && ticket.cambio > 0) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(text = "Cambio:", fontSize = 11.sp, color = SuccessGreen, fontWeight = FontWeight.Bold)
                            Text(text = "Bs. ${String.format("%.2f", ticket.cambio)}", fontSize = 11.sp, fontWeight = FontWeight.Black, color = SuccessGreen)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "¡Gracias por su preferencia!\nDoña Migue el auténtico sabor tradicional",
                        fontSize = 10.sp,
                        color = TextSecondary,
                        textAlign = TextAlign.Center
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Botones: Compartir e Imprimir
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            val sendIntent = Intent().apply {
                                action = Intent.ACTION_SEND
                                putExtra(
                                    Intent.EXTRA_TEXT,
                                    "Ticket Doña Migue - Comanda #${ticket.pedidoId}\nTotal: Bs. ${String.format("%.2f", ticket.total)}\nCliente: ${ticket.clienteNombre}"
                                )
                                type = "text/plain"
                            }
                            context.startActivity(Intent.createChooser(sendIntent, "Compartir Comanda"))
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = "Compartir", fontSize = 12.sp)
                    }

                    Button(
                        onClick = {
                            if (PrinterManager.cargarConfig(context) == null) {
                                aviso = "Configura la impresora primero (menú Imprimir en la barra superior)"
                                return@Button
                            }
                            imprimiendo = true
                            scope.launch {
                                val resultado = PrinterManager.imprimirTicket(context, ticket)
                                imprimiendo = false
                                aviso = resultado.fold(
                                    onSuccess = { "Ticket enviado a la impresora" },
                                    onFailure = { it.message ?: "Error al imprimir" }
                                )
                            }
                        },
                        enabled = !imprimiendo,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = AmberPrimary,
                            contentColor = Color.White
                        ),
                        modifier = Modifier.weight(1.2f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (imprimiendo) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(imageVector = Icons.Default.Print, contentDescription = null, modifier = Modifier.size(16.dp))
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = if (imprimiendo) "Imprimiendo..." else "Imprimir", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }

                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(0.8f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(text = "Listo", fontSize = 12.sp)
                    }
                }
            }
        }

            SnackbarHost(
                hostState = snackbarHostState,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp)
            )
        }
    }
}
