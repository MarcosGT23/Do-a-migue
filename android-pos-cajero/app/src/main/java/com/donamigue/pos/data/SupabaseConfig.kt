package com.donamigue.pos.data

import com.donamigue.pos.BuildConfig
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.gotrue.MemorySessionManager
import io.github.jan.supabase.postgrest.Postgrest
import io.ktor.client.engine.android.Android

/**
 * Supabase client configuration for the Android POS.
 *
 * Auth attaches the user's JWT to PostgREST requests so authenticated RLS
 * policies are applied. The in-memory session manager avoids lifecycle and
 * persistent-storage dependencies.
 */
object SupabaseConfig {
    const val SUPABASE_URL = BuildConfig.SUPABASE_URL
    const val SUPABASE_ANON_KEY = BuildConfig.SUPABASE_ANON_KEY

    val client by lazy {
        check(SUPABASE_ANON_KEY.isNotBlank()) {
            "Configure PUBLIC_SUPABASE_ANON_KEY or supabase.anonKey in local.properties to connect Android to Supabase."
        }
        createSupabaseClient(
            supabaseUrl = SUPABASE_URL,
            supabaseKey = SUPABASE_ANON_KEY
        ) {
            httpEngine = Android.create()
            install(Auth) {
                sessionManager = MemorySessionManager()
                enableLifecycleCallbacks = false
                alwaysAutoRefresh = false
            }
            install(Postgrest)
        }
    }
}
