package com.donamigue.pos.ui.components

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.donamigue.pos.model.Categoria
import com.donamigue.pos.ui.theme.*

@Composable
fun CategoryTabs(
    categorias: List<Categoria>,
    categoriaSeleccionadaId: Int?,
    onCategoriaSeleccionada: (Int?) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Chip "Todas"
        FilterChip(
            selected = categoriaSeleccionadaId == null,
            onClick = { onCategoriaSeleccionada(null) },
            label = {
                Text(
                    text = "Todas",
                    fontWeight = if (categoriaSeleccionadaId == null) FontWeight.Bold else FontWeight.Normal,
                    fontSize = 13.sp
                )
            },
            colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = AmberPrimary,
                selectedLabelColor = Color.White,
                containerColor = Color.White,
                labelColor = TextPrimary
            ),
            border = FilterChipDefaults.filterChipBorder(
                enabled = true,
                selected = categoriaSeleccionadaId == null,
                borderColor = StoneBorder,
                selectedBorderColor = AmberPrimary
            ),
            shape = RoundedCornerShape(20.dp)
        )

        // Chips de cada Categoría
        categorias.forEach { cat ->
            val isSelected = categoriaSeleccionadaId == cat.id
            FilterChip(
                selected = isSelected,
                onClick = { onCategoriaSeleccionada(cat.id) },
                label = {
                    Text(
                        text = cat.nombre,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        fontSize = 13.sp
                    )
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = AmberPrimary,
                    selectedLabelColor = Color.White,
                    containerColor = Color.White,
                    labelColor = TextPrimary
                ),
                border = FilterChipDefaults.filterChipBorder(
                    enabled = true,
                    selected = isSelected,
                    borderColor = StoneBorder,
                    selectedBorderColor = AmberPrimary
                ),
                shape = RoundedCornerShape(20.dp)
            )
        }
    }
}
