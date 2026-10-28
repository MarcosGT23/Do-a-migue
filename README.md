# 🍖 Doña Migue - POS Multisucursal

Sistema de Punto de Venta (POS) y Administración Multisucursal para **Doña Migue - Sabor Tradicional a las Brasas**.

---

## 🚀 Tecnologías
- **Framework:** Astro 5 / 7 + React 19
- **Estilos:** TailwindCSS v4 + Vanilla CSS + Lucide Icons
- **Base de Datos & Auth:** Supabase (PostgreSQL + RLS + Server-Side Auth Cookies)
- **Despliegue:** Vercel (Adaptador `@astrojs/vercel`)
- **Impresión Térmica:** Formato ESC/POS 80mm / 58mm optimizado para cero desperdicio de papel y corte superior a 0mm.

---

## ⚙️ Despliegue en Vercel

1. **Importar el repositorio:**
   Conecta este repositorio en tu cuenta de Vercel (`https://github.com/MarcosGT23/Do-a-migue.git`).

2. **Variables de Entorno en Vercel:**
   Agrega las siguientes variables en la sección **Settings -> Environment Variables** de tu proyecto en Vercel:

   | Variable | Descripción |
   |---|---|
   | `PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
   | `PUBLIC_SUPABASE_ANON_KEY` | Llave anónima pública de Supabase |
   | `SUPABASE_SECRET_KEY` o `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta de Supabase; solo se usa en el servidor y nunca debe llevar el prefijo `PUBLIC_` |

3. **Deploy:**
   Vercel ejecutará automáticamente el build y desplegará la aplicación en segundos.

## 🗄️ Base de datos

Para corregir la RPC de cobro ambigua, ejecuta
[`migracion-registrar-pago-sin-ambiguedad.sql`](./pos-multisucursal/supabase/migracion-registrar-pago-sin-ambiguedad.sql)
en **Supabase Dashboard → SQL Editor**. La migración conserva la firma que reciben
el POS web y Android y recarga el esquema de PostgREST.

Usa la clave pública vigente del proyecto en `PUBLIC_SUPABASE_ANON_KEY` y la clave
secreta vigente del servidor en `SUPABASE_SERVICE_ROLE_KEY`. No configures una
`PUBLIC_SUPABASE_SERVICE_ROLE_KEY`; si esa clave ya se publicó en un bundle o en el
repositorio, revócala y genera una nueva desde Supabase.

---

## 🛠️ Ejecución Local

```bash
cd pos-multisucursal
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:4321`.
