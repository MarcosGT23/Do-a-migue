# Doña Migue POS - Módulo Cajero Móvil (Android Studio)

Aplicación nativa para Android desarrollada en **Kotlin** con **Jetpack Compose** y **Material Design 3**, adaptada específicamente para el rol de **Cajero** de Doña Migue a partir del sistema web.

---

## 📱 Características del Módulo de Cajero Móvil

1. **Gestión de Turnos y Caja**:
   - **Apertura de Caja**: Registro de fondo inicial en efectivo (Bs.).
   - **Indicador de Turno**: Estado de caja activa, cajero responsable y saldo acumulado en tiempo real.
   - **Cierre y Arqueo de Caja**: Formulario de arqueo declarando efectivo y pagos electrónicos, cálculo automático de diferencias (sobrante/faltante) y observaciones.

2. **Catálogo y Selección Rápida**:
   - Pestañas horizontales por categoría: *Kjaras Tradicionales, Platos Especiales, Guarniciones, Bebidas & Refrescos, Cervezas*.
   - Buscador en tiempo real por texto.
   - Tarjetas táctiles ergonómicas (mínimo 48dp) con precio en Bs., badge de stock e indicador de cantidad en comanda.

3. **Comanda / Carrito**:
   - Barra flotante inferior siempre visible con total en Bs. y botón directo a cobro.
   - Panel inferior despegable (*Modal BottomSheet*) para ajustar cantidades (+/-), eliminar ítems, asignar nombre de cliente, número de mesa o para llevar, y aplicar descuentos.

4. **Procesamiento de Cobros**:
   - Métodos de pago: **Efectivo**, **QR**, **Tarjeta** y **Transferencia**.
   - Calculadora de cambio inteligente con botones de corte rápido en Bolivianos (Exacto, Bs. 20, Bs. 50, Bs. 100, Bs. 200).
   - Validación automática de monto suficiente antes de confirmar.

5. **Ticket / Comprobante Térmico**:
   - Formato digital idéntico al ticket web: cabecera tradicional Doña Migue con icono de llama, número de comanda, turno de caja, mesa, desglose detallado de ítems, totales, método de pago y cambio.
   - Botón directo para imprimir o compartir la comanda.

---

## 📂 Estructura del Proyecto

```
android-pos-cajero/
├── app/
│   ├── build.gradle.kts
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/donamigue/pos/
│       │   ├── MainActivity.kt
│       │   ├── model/
│       │   │   └── Models.kt
│       │   ├── data/
│       │   │   └── PosRepository.kt
│       │   └── ui/
│       │       ├── PosScreen.kt
│       │       ├── theme/
│       │       │   ├── Color.kt
│       │       │   ├── Theme.kt
│       │       │   └── Type.kt
│       │       ├── viewmodel/
│       │       │   └── PosViewModel.kt
│       │       └── components/
│       │           ├── PosTopBar.kt
│       │           ├── CategoryTabs.kt
│       │           ├── ProductCard.kt
│       │           ├── CartComponents.kt
│       │           ├── CheckoutDialog.kt
│       │           ├── TicketReceiptDialog.kt
│       │           └── CajaTurnoDialogs.kt
│       └── res/
│           └── values/
│               ├── strings.xml
│               └── themes.xml
├── gradle/
│   └── libs.versions.toml
├── build.gradle.kts
├── settings.gradle.kts
└── README.md
```

---

## 🚀 Cómo abrir y ejecutar en Android Studio

1. Abre **Android Studio** (Hedgehog, Iguana, Jellyfish, Koala o Ladybug).
2. Selecciona **Open** (o `File -> Open...`).
3. Navega hasta la carpeta:
   `c:\Users\herna\OneDrive\Escritorio\paginas web\kjaras_migue\kjaras 2.0\Doña migue\android-pos-cajero`
4. Espera a que Gradle sincronice las dependencias automáticas (*Gradle Sync*).
5. Conecta tu teléfono Android con depuración USB activada o inicia un Emulador (Pixel 6/7/8).
6. Presiona el botón verde **Run** (`Shift + F10`) y la app se compilará y ejecutará inmediatamente.

### Configuración de Supabase

La app usa la misma URL y clave pública (`anon`/publishable) que el POS web. Configúralas
en `local.properties` (archivo local, no se debe subir al repositorio):

```properties
supabase.url=https://TU_PROYECTO.supabase.co
supabase.anonKey=TU_CLAVE_PUBLICA
```

También puedes definir `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` como variables
de entorno al compilar. Nunca uses una clave `service_role` o `secret` en Android.
