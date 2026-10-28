package com.donamigue.pos.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.donamigue.pos.model.CajaTurno
import com.donamigue.pos.model.SesionUsuario
import com.donamigue.pos.ui.theme.*

@Composable
fun PosTopBar(
    cajaActiva: CajaTurno?,
    sesion: SesionUsuario?,
    onAbrirCajaClick: () -> Unit,
    onCerrarCajaClick: () -> Unit,
    onHistorialClick: () -> Unit,
    onConfigurarImpresoraClick: () -> Unit,
    onCerrarSesionClick: () -> Unit
) {
    Surface(
        color = CharcoalDark,
        shadowElevation = 6.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            // Fila Superior: Marca y Botón de Estado de Caja
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(AmberPrimary),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocalFireDepartment,
                            contentDescription = "Logo Doña Migue",
                            tint = Color.White,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "DOÑA MIGUE",
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 17.sp,
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = sesion?.sucursalNombre ?: cajaActiva?.sucursalNombre ?: "Sucursal",
                            color = AmberLight,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                // Botón Acción de Turno de Caja
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (cajaActiva != null) {
                        FilledTonalButton(
                            onClick = onCerrarCajaClick,
                            colors = ButtonDefaults.filledTonalButtonColors(
                                containerColor = Color(0xFF3B1818),
                                contentColor = DangerRed
                            ),
                            shape = RoundedCornerShape(20.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = "Cerrar Caja",
                                modifier = Modifier.size(16.dp),
                                tint = DangerRed
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Cerrar Caja",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    } else {
                        Button(
                            onClick = onAbrirCajaClick,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = SuccessGreen,
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(20.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.LockOpen,
                                contentDescription = "Abrir Caja",
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Abrir Caja",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(6.dp))

                    IconButton(
                        onClick = onHistorialClick,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Receipt,
                            contentDescription = "Historial de ventas",
                            tint = AmberLight,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    IconButton(
                        onClick = onConfigurarImpresoraClick,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Print,
                            contentDescription = "Configurar impresora",
                            tint = AmberLight,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    IconButton(
                        onClick = onCerrarSesionClick,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Logout,
                            contentDescription = "Cerrar sesión",
                            tint = AmberLight,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Fila Inferior: Indicador de Turno y Saldo
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0xFF292524))
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(if (cajaActiva != null) SuccessGreen else DangerRed)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (cajaActiva != null) "Caja #${cajaActiva.id} Activa (${cajaActiva.cajeroNombre})" else "Caja Cerrada (Turno sin abrir)",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                if (cajaActiva != null) {
                    Text(
                        text = "Saldo: Bs. ${String.format("%.2f", cajaActiva.totalEsperado)}",
                        color = AmberLight,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
