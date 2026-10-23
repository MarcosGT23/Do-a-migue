import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import {
  Flame,
  Lock as LockIcon,
  Mail,
  ArrowRight,
  ShieldCheck,
  ShoppingCart,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../core/supabaseClient';
import { Button } from '../ui/Button';
import { Field, Input } from '../ui/Field';

const CUENTAS_RAPIDAS = [
  {
    correo: 'marcos.caja@kjaras.local',
    clave: 'Password123!',
    nombre: 'Admin general',
    detalle: 'Panel, catálogo y reportes',
    Icono: ShieldCheck,
  },
  {
    correo: 'cajero@donamigue.com',
    clave: 'Password123!',
    nombre: 'Cajero',
    detalle: 'Terminal de venta y caja',
    Icono: ShoppingCart,
  },
] as const;

const MODULOS = [
  { n: '01', titulo: 'Terminal de venta', texto: 'Comandas con ficha, cortes por plato y cobro en efectivo, QR, tarjeta o transferencia.' },
  { n: '02', titulo: 'Caja y turnos', texto: 'Apertura, cierre con arqueo ciego y corte por sucursal, sin mezclar turnos.' },
  { n: '03', titulo: 'Administración', texto: 'Catálogo, inventario, sucursales y usuarios en un solo lugar.' },
];

export default function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ejecutarLogin = async (correo: string, pass: string) => {
    setCargando(true);
    setError(null);

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
      toast.success(`Bienvenido/a, ${data.perfil.nombreCompleto}!`, {
        description: `Rol detectado: ${data.perfil.rol} • Ingresando a ${esAdmin ? 'Panel de Administración' : 'Terminal POS'}...`,
        duration: 2500,
      });

      // 5. Redirigir a la pantalla correspondiente
      setTimeout(() => {
        window.location.href = data.destino;
      }, 500);
    } catch (err: any) {
      const mensaje = err.message || 'Verifica tu usuario y contraseña.';
      setError(mensaje);
      toast.error('Acceso denegado', { description: mensaje, duration: 4000 });
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
    <div className="min-h-dvh bg-app text-ink">
      <Toaster position="top-right" richColors theme="dark" closeButton />

      <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        {/* Panel de marca (escritorio) */}
        <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-chrome px-10 py-10 lg:flex xl:px-16 xl:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 -top-32 size-[420px] rounded-full bg-ember/10 blur-[120px]"
          />

          <div className="relative flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-[13px] border border-ember/35 bg-ember/12 text-ember">
              <Flame className="size-5.5 fill-ember/20" strokeWidth={2} />
            </span>
            <div>
              <p className="text-[15px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
                Doña Migue
              </p>
              <p className="text-[11.5px] text-ink-muted">POS multisucursal</p>
            </div>
          </div>

          <div className="relative max-w-md py-10">
            <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ember">
              Turno, comanda y caja
            </p>
            <h2 className="text-[30px] font-extrabold leading-[1.12] tracking-[-0.03em] text-ink xl:text-[34px]">
              Cada comanda con su ficha,
              <br />
              cada caja con su turno.
            </h2>

            <ul className="mt-8 divide-y divide-line border-y border-line">
              {MODULOS.map(({ n, titulo, texto }) => (
                <li key={n} className="flex gap-4 py-3.5">
                  <span className="mt-0.5 font-mono text-[11px] font-bold text-ember/80 tnum">{n}</span>
                  <div>
                    <p className="text-[13.5px] font-semibold text-ink">{titulo}</p>
                    <p className="mt-0.5 text-[12px] leading-[1.5] text-ink-muted">{texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">
            Kjaras 2.0 · Doña Migue
          </p>
        </aside>

        {/* Formulario */}
        <main className="flex flex-col justify-center px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className="mx-auto w-full max-w-[392px]"
          >
            {/* Marca compacta (móvil) */}
            <div className="mb-7 flex items-center gap-3 lg:hidden">
              <span className="flex size-11 items-center justify-center rounded-[13px] border border-ember/35 bg-ember/12 text-ember">
                <Flame className="size-5.5 fill-ember/20" strokeWidth={2} />
              </span>
              <div>
                <p className="text-[15px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
                  Doña Migue
                </p>
                <p className="text-[11.5px] text-ink-muted">POS multisucursal</p>
              </div>
            </div>

            <header>
              <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.025em] text-ink">
                Iniciar sesión
              </h1>
              <p className="mt-1 text-[13px] leading-5 text-ink-muted">
                Entra con tu cuenta de caja o de administración.
              </p>
            </header>

            <section aria-labelledby="acceso-rapido" className="mt-6">
              <h2
                id="acceso-rapido"
                className="mb-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-muted"
              >
                Acceso rápido
              </h2>
              <div className="grid gap-2">
                {CUENTAS_RAPIDAS.map(({ correo, clave, nombre, detalle, Icono }) => (
                  <button
                    key={correo}
                    type="button"
                    disabled={cargando}
                    onClick={() => handleCargarCredenciales(correo, clave)}
                    aria-label={`Entrar como ${nombre}`}
                    className="group flex min-h-14 items-center gap-3 rounded-card border border-line-strong bg-card px-3 text-left transition-colors hover:border-ember/45 hover:bg-raised focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/25 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-sunken text-ink-soft transition-colors group-hover:text-ember">
                      <Icono className="size-4" strokeWidth={2.25} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold leading-tight text-ink">
                        {nombre}
                      </span>
                      <span className="block truncate font-mono text-[10.5px] text-ink-muted">
                        {correo}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="hidden text-[10.5px] text-ink-faint sm:block">{detalle}</span>
                      <ArrowRight
                        className="size-4 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ember"
                        strokeWidth={2.25}
                      />
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <div className="my-5 flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-line" />
              <span className="text-[10.5px] uppercase tracking-[0.1em] text-ink-faint">
                o con tus credenciales
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field etiqueta="Correo o usuario" htmlFor="login-email">
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <Input
                    id="login-email"
                    type="text"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu.correo@donamigue.com"
                    className="pl-9"
                  />
                </div>
              </Field>

              <Field etiqueta="Contraseña" htmlFor="login-password">
                <div className="relative">
                  <LockIcon
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <Input
                    id="login-password"
                    type={verClave ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setVerClave((v) => !v)}
                    aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={verClave}
                    className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[7px] text-ink-muted transition-colors hover:bg-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
                  >
                    {verClave ? (
                      <EyeOff className="size-4" strokeWidth={2.25} />
                    ) : (
                      <Eye className="size-4" strokeWidth={2.25} />
                    )}
                  </button>
                </div>
              </Field>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-field border border-danger/35 bg-danger/10 px-3 py-2.5 text-[12.5px] leading-5 text-danger"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} aria-hidden />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                tamano="lg"
                bloque
                cargando={cargando}
                aria-busy={cargando}
                icono={<ArrowRight className="size-4.5" strokeWidth={2.5} />}
              >
                {cargando ? 'Verificando credenciales…' : 'Ingresar al sistema'}
              </Button>
            </form>

            <div className="mt-4 space-y-1.5">
              <p className="text-[11.5px] leading-4 text-ink-muted">
                ¿No tienes acceso? Pide a administración que cree tu usuario.
              </p>
              <p className="font-mono text-[10.5px] text-ink-faint">
                Clave de demostración: Password123!
              </p>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
