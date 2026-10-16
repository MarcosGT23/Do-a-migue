import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import { Flame, Lock as LockIcon, Mail, ArrowRight, ShieldCheck, ShoppingCart, KeyRound } from 'lucide-react';
import { supabase } from '../../core/supabaseClient';

export default function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const ejecutarLogin = async (correo: string, pass: string) => {
    setCargando(true);

    try {
      // 1. Enviar credenciales al endpoint del servidor
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correo.trim(), password: pass }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo verificar el usuario.');
      }

      // 2. Sincronizar el cliente de Supabase en el navegador
      if (data.session) {
        await supabase.auth.setSession(data.session);
      }

      // 3. Escribir cookies en el navegador para que Astro SSR las lea en la navegación inmediata
      const cookieVal = encodeURIComponent(JSON.stringify(data.perfil));
      document.cookie = `dona_migue_user=${cookieVal}; path=/; max-age=604800; SameSite=Lax`;
      if (data.session?.access_token) {
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=604800; SameSite=Lax`;
      }
      localStorage.setItem('dona_migue_user', JSON.stringify(data.perfil));

      // 4. Mostrar feedback de acceso y rol
      const esAdmin = data.perfil.esAdminOSupervisor;
      toast.success(`¡Bienvenido/a, ${data.perfil.nombreCompleto}!`, {
        description: `Rol detectado: ${data.perfil.rol} • Ingresando a ${esAdmin ? 'Panel de Administración' : 'Terminal POS'}...`,
        duration: 2500,
      });

      // 5. Redirigir a la pantalla correspondiente
      setTimeout(() => {
        window.location.href = data.destino;
      }, 500);
    } catch (err: any) {
      toast.error('Acceso denegado', {
        description: err.message || 'Verifica tu usuario y contraseña.',
        duration: 4000,
      });
      setCargando(false);
    }
  };

  const handleCargarCredenciales = (correo: string, pass: string) => {
    setEmail(correo);
    setPassword(pass);
    ejecutarLogin(correo, pass);
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    await ejecutarLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-[#100f0e] flex items-center justify-center p-4 text-[#ede7dc] select-none">
      <Toaster position="top-right" richColors theme="dark" closeButton />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-w-md w-full bg-[#181614] border border-[#2e2721] rounded-3xl p-8 shadow-2xl space-y-6"
      >
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600/30 to-orange-700/20 border border-amber-600/40 text-amber-500 flex items-center justify-center shadow-inner">
            <Flame className="w-7 h-7 fill-amber-500/20" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Doña Migue</h1>
          <p className="text-xs text-[#9c907f]">
            Sistema POS y Control de Sucursales
          </p>
        </div>

        {/* Cuentas de Acceso Rápido */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[#8c806f] uppercase tracking-wider block">
            Selección rápida de cuenta
          </label>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleCargarCredenciales('marcos.caja@kjaras.local', 'Password123!')}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-950/20 hover:bg-orange-900/30 border border-amber-600/30 text-amber-400 text-left transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-500" />
              <div className="truncate">
                <span className="font-bold block leading-tight text-white">Admin General</span>
                <span className="text-[10px] text-[#9c907f] truncate block">marcos.caja@...</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleCargarCredenciales('cajero@donamigue.com', 'Password123!')}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/20 hover:bg-emerald-900/30 border border-emerald-600/30 text-emerald-400 text-left transition cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 shrink-0 text-emerald-400" />
              <div className="truncate">
                <span className="font-bold block leading-tight text-white">Cajero Doña Migue</span>
                <span className="text-[10px] text-[#9c907f] truncate block">cajero@donamigue.com</span>
              </div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#ede7dc]">Correo o Usuario</label>
            <div className="relative mt-1.5">
              <Mail className="w-4 h-4 text-[#7a6f5f] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marcos.caja@kjaras.local o cajero@donamigue.com"
                className="w-full pl-10 pr-4 py-3 bg-[#100f0e] border border-[#2e2721] rounded-xl text-xs text-white placeholder-[#6e6355] focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600/40"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#ede7dc]">Contraseña</label>
              <span className="text-[10px] text-[#8c806f] flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-amber-500/70" /> Clave: Password123!
              </span>
            </div>
            <div className="relative mt-1.5">
              <LockIcon className="w-4 h-4 text-[#7a6f5f] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-[#100f0e] border border-[#2e2721] rounded-xl text-xs text-white placeholder-[#6e6355] focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600/40"
              />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={cargando}
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-sm shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            <span>{cargando ? 'Verificando credenciales y rol...' : 'Ingresar al Sistema'}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
