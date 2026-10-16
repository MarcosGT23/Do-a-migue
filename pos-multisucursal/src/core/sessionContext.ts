import type { AstroCookies } from 'astro';
import { supabaseAdminServer } from './supabaseAdminServer';
import type { RolUsuario } from '../services/pos.service';

export interface UserSessionContext {
  autenticado: boolean;
  supabaseSSR: typeof supabaseAdminServer;
  usuarioId: string;
  nombreCompleto: string;
  rol: RolUsuario;
  sucursalId: number;
  sucursalNombre: string;
  esAdminOSupervisor: boolean;
}

export const SESSION_COOKIE_NAME = 'dona_migue_user';

export async function obtenerContextoSesion(cookies?: AstroCookies): Promise<UserSessionContext> {
  // 1. Verificar si existe la cookie de perfil de Doña Migue
  const cookieVal = cookies?.get(SESSION_COOKIE_NAME)?.value;
  if (cookieVal) {
    try {
      let raw = cookieVal;
      try {
        raw = decodeURIComponent(cookieVal);
      } catch (_) {
        raw = cookieVal;
      }
      const decoded = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (decoded && decoded.usuarioId) {
        const rol = ((decoded.rol || 'CAJERO') as string).toUpperCase() as RolUsuario;
        const esAdmin = rol === 'ADMIN' || rol === 'SUPERVISOR';

        return {
          autenticado: true,
          supabaseSSR: supabaseAdminServer,
          usuarioId: decoded.usuarioId,
          nombreCompleto: decoded.nombreCompleto || 'Operador',
          rol,
          sucursalId: Number(decoded.sucursalId) || 1,
          sucursalNombre: decoded.sucursalNombre || 'Sucursal Central',
          esAdminOSupervisor: esAdmin,
        };
      }
    } catch (e) {
      console.error('Error parseando dona_migue_user:', e);
    }
  }

  // 2. Verificar si existe el token JWT de Supabase
  const token = cookies?.get('sb-access-token')?.value;
  if (token) {
    try {
      const { data: authUser } = await supabaseAdminServer.auth.getUser(token);
      if (authUser?.user) {
        const { data: perfil } = await supabaseAdminServer
          .from('usuarios')
          .select('id, nombre_completo, rol, sucursal_id, activo')
          .eq('id', authUser.user.id)
          .eq('activo', true)
          .maybeSingle();

        if (perfil) {
          const rol = ((perfil.rol || 'CAJERO') as string).toUpperCase() as RolUsuario;
          const esAdmin = rol === 'ADMIN' || rol === 'SUPERVISOR';
          const { data: suc } = await supabaseAdminServer
            .from('sucursales')
            .select('nombre')
            .eq('id', perfil.sucursal_id || 1)
            .maybeSingle();

          return {
            autenticado: true,
            supabaseSSR: supabaseAdminServer,
            usuarioId: perfil.id,
            nombreCompleto: perfil.nombre_completo || 'Operador',
            rol,
            sucursalId: perfil.sucursal_id || 1,
            sucursalNombre: suc?.nombre || 'Sucursal Central',
            esAdminOSupervisor: esAdmin,
          };
        }
      }
    } catch (err) {
      console.error('Error verificando sb-access-token:', err);
    }
  }

  // 3. Usuario no autenticado
  return {
    autenticado: false,
    supabaseSSR: supabaseAdminServer,
    usuarioId: '',
    nombreCompleto: '',
    rol: 'CAJERO',
    sucursalId: 1,
    sucursalNombre: 'Sucursal Central',
    esAdminOSupervisor: false,
  };
}
