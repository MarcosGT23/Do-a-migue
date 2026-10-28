package com.donamigue.pos.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.donamigue.pos.data.PrinterManager
import com.donamigue.pos.ui.theme.*
import com.epson.epos2.discovery.DeviceInfo
import com.epson.epos2.printer.Printer
import kotlinx.coroutines.launch

private data class ModeloEpson(val nombre: String, val constante: Int)
private val MODELOS = listOf(
    ModeloEpson("TM-T20", Printer.TM_T20),
    ModeloEpson("TM-T20II/III", Printer.TM_T20),
    ModeloEpson("TM-T88", Printer.TM_T88),
    ModeloEpson("TM-T88VII", Printer.TM_T88VII),
    ModeloEpson("TM-m30", Printer.TM_M30),
    ModeloEpson("TM-m30II", Printer.TM_M30II),
    ModeloEpson("TM-m30III", Printer.TM_M30III),
    ModeloEpson("TM-m50", Printer.TM_M50),
    ModeloEpson("TM-m50II", Printer.TM_M50II),
    ModeloEpson("TM-m55", Printer.TM_M55),
    ModeloEpson("TM-P80", Printer.TM_P80),
    ModeloEpson("TM-T100", Printer.TM_T100),
    ModeloEpson("TM-T60", Printer.TM_T60),
    ModeloEpson("TM-T70", Printer.TM_T70),
    ModeloEpson("TM-L90", Printer.TM_L90)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrinterConfigDialog(
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var buscando by remember { mutableStateOf(false) }
    var dispositivos by remember { mutableStateOf<List<DeviceInfo>>(emptyList()) }
    var seleccionado by remember { mutableStateOf<DeviceInfo?>(null) }
    var guardado by remember { mutableStateOf(PrinterManager.cargarConfig(context)) }
    var mensaje by remember { mutableStateOf<String?>(null) }
    var modeloIdx by remember {
        mutableStateOf(
            MODELOS.indexOfFirst { it.constante == (guardado?.model ?: Printer.TM_T20) }
                .coerceAtLeast(0)
        )
    }

    Dialog(onDismissRequest = onDismiss) {
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
                    .verticalScroll(rememberScrollState())
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Print, contentDescription = null, tint = AmberPrimary)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Impresora Epson",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = TextPrimary
                        )
                    }
                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Cerrar")
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Estado actual
                Surface(
                    color = Color(0xFFFFFBEB),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = if (guardado != null) "Configurada" else "Sin configurar",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (guardado != null) SuccessGreen else DangerRed
                        )
                        if (guardado != null) {
                            Text(
                                text = "${guardado!!.name.ifBlank { "(sin nombre)" }}\n${guardado!!.target}",
                                fontSize = 11.sp,
                                color = TextSecondary
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = {
                        buscando = true
                        mensaje = null
                        scope.launch {
                            dispositivos = PrinterManager.descubrir(context)
                            buscando = false
                            if (dispositivos.isEmpty()) {
                                mensaje = "No se encontraron impresoras. Revisa el cable USB/red."
                            }
                        }
                    },
                    enabled = !buscando,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CharcoalDark,
                        contentColor = Color.White
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (buscando) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(16.dp))
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(if (buscando) "Buscando..." else "Buscar impresoras", fontSize = 13.sp)
                }

                if (dispositivos.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Selecciona una impresora:", fontSize = 12.sp, color = TextSecondary)
                    Spacer(modifier = Modifier.height(4.dp))
                    dispositivos.forEach { dev ->
                        val activo = seleccionado?.target == dev.target
                        Surface(
                            onClick = { seleccionado = dev },
                            color = if (activo) AmberLight else Color(0xFFF5F5F4),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 3.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = when {
                                        dev.target.startsWith("USB") -> Icons.Default.Usb
                                        dev.target.startsWith("BT") -> Icons.Default.Bluetooth
                                        else -> Icons.Default.Wifi
                                    },
                                    contentDescription = null,
                                    tint = if (activo) AmberDark else TextSecondary,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = dev.deviceName.ifBlank { dev.target },
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                    Text(text = dev.target, fontSize = 10.sp, color = TextSecondary)
                                }
                                if (activo) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = SuccessGreen)
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text("Modelo de impresora:", fontSize = 12.sp, color = TextSecondary)
                Spacer(modifier = Modifier.height(4.dp))

                var menuAbierto by remember { mutableStateOf(false) }
                Box {
                    OutlinedButton(
                        onClick = { menuAbierto = true },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(MODELOS[modeloIdx].nombre, modifier = Modifier.weight(1f))
                        Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                    }
                    DropdownMenu(
                        expanded = menuAbierto,
                        onDismissRequest = { menuAbierto = false },
                        modifier = Modifier.heightIn(max = 300.dp)
                    ) {
                        MODELOS.forEachIndexed { idx, m ->
                            DropdownMenuItem(
                                text = { Text(m.nombre) },
                                onClick = {
                                    modeloIdx = idx
                                    menuAbierto = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            PrinterManager.borrarConfig(context)
                            guardado = null
                            seleccionado = null
                            mensaje = "Configuración eliminada"
                        },
                        enabled = guardado != null,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Borrar", fontSize = 12.sp)
                    }

                    Button(
                        onClick = {
                            val dev = seleccionado
                            if (dev == null) {
                                mensaje = "Selecciona o busca una impresora primero"
                                return@Button
                            }
                            PrinterManager.guardarConfig(
                                context = context,
                                target = dev.target,
                                name = dev.deviceName.ifBlank { dev.target },
                                model = MODELOS[modeloIdx].constante,
                                lang = Printer.LANG_MULTI
                            )
                            guardado = PrinterManager.cargarConfig(context)
                            mensaje = "Impresora guardada"
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = AmberPrimary,
                            contentColor = Color.White
                        ),
                        modifier = Modifier.weight(1.2f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Guardar", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = {
                        mensaje = null
                        scope.launch {
                            val r = PrinterManager.imprimirPrueba(context)
                            mensaje = r.fold(
                                onSuccess = { "Página de prueba enviada" },
                                onFailure = { it.message ?: "Error al imprimir prueba" }
                            )
                        }
                    },
                    enabled = guardado != null,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Receipt, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Imprimir página de prueba", fontSize = 12.sp)
                }

                mensaje?.let {
                    Spacer(modifier = Modifier.height(10.dp))
                    Surface(
                        color = Color(0xFFF5F5F4),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = it,
                            fontSize = 12.sp,
                            color = TextPrimary,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }
            }
        }
    }
}
