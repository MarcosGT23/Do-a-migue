package com.donamigue.pos

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.lifecycle.viewmodel.compose.viewModel
import com.donamigue.pos.ui.LoginScreen
import com.donamigue.pos.ui.PosScreen
import com.donamigue.pos.ui.theme.DonaMiguePOSTheme
import com.donamigue.pos.ui.viewmodel.PosViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            DonaMiguePOSTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AppRoot()
                }
            }
        }
    }
}

@Composable
private fun AppRoot(viewModel: PosViewModel = viewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    when {
        uiState.estaAutenticado -> PosScreen(viewModel = viewModel)
        uiState.cargando -> Box(modifier = Modifier.fillMaxSize()) {
            CircularProgressIndicator(modifier = Modifier.fillMaxSize(0.1f))
        }
        else -> LoginScreen(
            isProcesando = uiState.isProcesando,
            errorMensaje = uiState.errorCarga,
            onIniciarSesion = { email, password -> viewModel.iniciarSesion(email, password) },
            onLimpiarError = { viewModel.limpiarError() }
        )
    }
}
