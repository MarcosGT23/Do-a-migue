import type { AstroCookies } from 'astro';
import { supabaseAdminServer } from './supabaseAdminServer';

export interface VerifiedPosUser {
  id: string;
  rol: string;
  sucursalId: number;
}

export async function verificarUsuarioPOS(cookies: AstroCookies): Promise<VerifiedPosUser | null> {
  const accessToken = cookies.get('sb-access-token')?.value;
  if (!accessToken) return null;

  const { data: authData, error: authError } = await supabaseAdminServer.auth.getUser(accessToken);
  if (authError || !authData.user) return null;

  const { data: perfil, error: profileError } = await supabaseAdminServer
    .from('usuarios')
    .select('id, rol, sucursal_id, activo')
    .eq('id', authData.user.id)
    .eq('activo', true)
    .maybeSingle();

  if (profileError) throw new Error(`No se pudo verificar el perfil del cajero: ${profileError.message}`);
  if (!perfil) return null;

  return {
    id: perfil.id,
    rol: String(perfil.rol || '').toUpperCase(),
    sucursalId: Number(perfil.sucursal_id) || 1,
  };
}
