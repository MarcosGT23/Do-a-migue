package com.donamigue.pos.data

import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email

/**
 * Maneja la autenticación contra Supabase Auth (GoTrue).
 * Mantiene el JWT en el cliente, por lo que las consultas Postgrest
 * posteriores viajan como rol `authenticated` y respetan las políticas RLS.
 */
class AuthRepository {

    private val client = SupabaseConfig.client

    /** Inicia sesión con email y contraseña. Devuelve el id del usuario. */
    suspend fun iniciarSesion(email: String, password: String): String {
        client.auth.signInWith(Email) {
            this.email = email.trim().lowercase()
            this.password = password
        }
        return client.auth.currentUserOrNull()?.id
            ?: throw IllegalStateException("La autenticación no devolvió una sesión válida")
    }

    /** Devuelve el id del usuario si ya hay una sesión activa persistida. */
    suspend fun usuarioActualId(): String? {
        return try {
            client.auth.currentUserOrNull()?.id
        } catch (e: Exception) {
            null
        }
    }

    /** Cierra la sesión actual. */
    suspend fun cerrarSesion() {
        client.auth.signOut()
    }
}
