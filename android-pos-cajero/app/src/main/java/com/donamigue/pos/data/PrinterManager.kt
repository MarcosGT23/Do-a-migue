package com.donamigue.pos.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.Log
import com.donamigue.pos.model.TicketData
import com.epson.epos2.Epos2Exception
import com.epson.epos2.discovery.DeviceInfo
import com.epson.epos2.discovery.Discovery
import com.epson.epos2.discovery.DiscoveryListener
import com.epson.epos2.discovery.FilterOption
import com.epson.epos2.printer.Printer
import com.epson.epos2.printer.PrinterStatusInfo
import com.epson.epos2.printer.ReceiveListener
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Gestiona la impresora térmica Epson mediante el SDK ePOS2.
 * El "target" de conexión (por ejemplo USB:...) se guarda en SharedPreferences
 * para que pueda configurarse desde la app.
 */
object PrinterManager {

    private const val TAG = "PrinterManager"
    private const val PREFS = "printer_prefs"
    private const val KEY_TARGET = "printer_target"
    private const val KEY_TARGET_NAME = "printer_target_name"
    private const val KEY_MODEL = "printer_model"
    private const val KEY_LANG = "printer_lang"

    private var printer: Printer? = null

    data class SavedPrinter(
        val target: String,
        val name: String,
        val model: Int,
        val lang: Int
    )

    fun cargarConfig(context: Context): SavedPrinter? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val target = prefs.getString(KEY_TARGET, null) ?: return null
        return SavedPrinter(
            target = target,
            name = prefs.getString(KEY_TARGET_NAME, "") ?: "",
            model = prefs.getInt(KEY_MODEL, Printer.TM_T20),
            lang = prefs.getInt(KEY_LANG, Printer.LANG_MULTI)
        )
    }

    fun guardarConfig(context: Context, target: String, name: String, model: Int, lang: Int) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_TARGET, target)
            .putString(KEY_TARGET_NAME, name)
            .putInt(KEY_MODEL, model)
            .putInt(KEY_LANG, lang)
            .apply()
    }

    fun borrarConfig(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
    }

    /** Busca impresoras disponibles (USB, red y Bluetooth) durante [timeoutMs]. */
    suspend fun descubrir(context: Context, timeoutMs: Long = 6000): List<DeviceInfo> =
        withContext(Dispatchers.IO) {
            val encontrados = mutableListOf<DeviceInfo>()
            val filter = FilterOption().apply {
                deviceType = Discovery.TYPE_PRINTER
                portType = Discovery.PORTTYPE_ALL
            }
            val listener = object : DiscoveryListener {
                override fun onDiscovery(deviceInfo: DeviceInfo) {
                    if (encontrados.none { it.target == deviceInfo.target }) {
                        encontrados.add(deviceInfo)
                    }
                }
            }
            try {
                Discovery.start(context, filter, listener)
                Thread.sleep(timeoutMs)
            } catch (e: Epos2Exception) {
                Log.e(TAG, "Error descubriendo: ${e.errorStatus}", e)
            } finally {
                try {
                    Discovery.stop()
                } catch (_: Epos2Exception) {
                }
            }
            encontrados
        }

    private fun newPrinter(model: Int, lang: Int, context: Context): Printer =
        Printer(model, lang, context)

    /**
     * Imprime un [TicketData] en la impresora configurada.
     * @return Result.success si se envió, Result.failure con mensaje legible si no.
     */
    suspend fun imprimirTicket(context: Context, ticket: TicketData): Result<Unit> =
        withContext(Dispatchers.IO) {
            val config = cargarConfig(context)
                ?: return@withContext Result.failure(Exception("No hay impresora configurada"))

            var p: Printer? = null
            try {
                p = newPrinter(config.model, config.lang, context)
                p.setReceiveEventListener(object : ReceiveListener {
                    override fun onPtrReceive(
                        printer: Printer?,
                        code: Int,
                        status: PrinterStatusInfo?,
                        printJobId: String?
                    ) {
                        if (printer != null) disconnect(printer)
                    }
                })

                p.addTextAlign(Printer.ALIGN_CENTER)
                p.addTextSize(2, 2)
                p.addText("DONA MIGUE\n")
                p.addTextSize(1, 1)
                p.addText(ticket.sucursalNombre.uppercase() + "\n")
                p.addFeedLine(1)

                p.addTextAlign(Printer.ALIGN_LEFT)
                p.addText("--------------------------------\n")
                p.addText("Comanda #${ticket.pedidoId}\n")
                p.addText("Turno   #${ticket.aperturaCajaId ?: "-"}\n")
                p.addText("Cliente: ${ticket.clienteNombre}\n")
                p.addText(
                    "Ubic.: " +
                        if (ticket.numeroMesa != null) "MESA #${ticket.numeroMesa}" else "LLEVAR/MOSTRADOR"
                        + "\n"
                )
                p.addText("Fecha : ${Fmt.fecha(ticket.fecha)}\n")
                p.addText("Cajero: ${ticket.cajeroNombre}\n")
                p.addText("--------------------------------\n")

                ticket.items.forEach { item ->
                    val linea = "${item.cantidad}x ${item.nombre}"
                    val monto = "Bs ${Fmt.money(item.subtotal)}"
                    p.addText(Fmt.fila(linea, monto))
                    if (!item.notas.isNullOrBlank()) {
                        p.addText("   * ${item.notas}\n")
                    }
                }

                p.addText("--------------------------------\n")
                p.addText(Fmt.fila("Subtotal:", "Bs ${Fmt.money(ticket.subtotal)}"))
                if (ticket.descuento > 0) {
                    p.addText(Fmt.fila("Descuento:", "-Bs ${Fmt.money(ticket.descuento)}"))
                }
                p.addTextAlign(Printer.ALIGN_RIGHT)
                p.addTextSize(2, 2)
                p.addText("TOTAL Bs ${Fmt.money(ticket.total)}\n")
                p.addTextSize(1, 1)
                p.addTextAlign(Printer.ALIGN_LEFT)
                p.addText("--------------------------------\n")
                p.addText("Pago  : ${ticket.metodoPago.label}\n")
                ticket.efectivoRecibido?.let {
                    p.addText(Fmt.fila("Recibido:", "Bs ${Fmt.money(it)}"))
                }
                ticket.cambio?.let {
                    if (it > 0) p.addText(Fmt.fila("Cambio:", "Bs ${Fmt.money(it)}"))
                }

                p.addFeedLine(1)
                p.addTextAlign(Printer.ALIGN_CENTER)
                p.addText("Gracias por su preferencia!\n")
                p.addText("Dona Migue - sabor tradicional\n")
                p.addFeedLine(2)
                p.addCut(Printer.CUT_FEED)

                p.connect(config.target, Printer.PARAM_DEFAULT)
                p.sendData(Printer.PARAM_DEFAULT)
                Result.success(Unit)
            } catch (e: Epos2Exception) {
                Log.e(TAG, "Error imprimiendo: ${e.errorStatus}", e)
                p?.let { disconnect(it) }
                Result.failure(Exception(describirError(e)))
            } catch (e: Exception) {
                Log.e(TAG, "Error imprimiendo", e)
                p?.let { disconnect(it) }
                Result.failure(e)
            }
        }

    /** Imprime una pequeña página de prueba. */
    suspend fun imprimirPrueba(context: Context): Result<Unit> =
        withContext(Dispatchers.IO) {
            val config = cargarConfig(context)
                ?: return@withContext Result.failure(Exception("No hay impresora configurada"))
            var p: Printer? = null
            try {
                p = newPrinter(config.model, config.lang, context)
                p.setReceiveEventListener(object : ReceiveListener {
                    override fun onPtrReceive(
                        printer: Printer?,
                        code: Int,
                        status: PrinterStatusInfo?,
                        printJobId: String?
                    ) {
                        if (printer != null) disconnect(printer)
                    }
                })
                p.addTextAlign(Printer.ALIGN_CENTER)
                p.addTextSize(2, 2)
                p.addText("PRUEBA OK\n")
                p.addTextSize(1, 1)
                p.addFeedLine(1)
                p.addText("Dona Migue POS\n")
                p.addText(config.name + "\n")
                p.addFeedLine(2)
                p.addCut(Printer.CUT_FEED)
                p.connect(config.target, Printer.PARAM_DEFAULT)
                p.sendData(Printer.PARAM_DEFAULT)
                Result.success(Unit)
            } catch (e: Epos2Exception) {
                p?.let { disconnect(it) }
                Result.failure(Exception(describirError(e)))
            } catch (e: Exception) {
                p?.let { disconnect(it) }
                Result.failure(e)
            }
        }

    private fun disconnect(printer: Printer) {
        try {
            printer.clearCommandBuffer()
            printer.disconnect()
            printer.setReceiveEventListener(null)
        } catch (e: Exception) {
            Log.w(TAG, "Error al desconectar", e)
        }
    }

    private fun describirError(e: Epos2Exception): String = when (e.errorStatus) {
        Epos2Exception.ERR_CONNECT -> "No se pudo conectar con la impresora"
        Epos2Exception.ERR_TIMEOUT -> "Tiempo de espera agotado al conectar"
        Epos2Exception.ERR_MEMORY -> "Memoria insuficiente en la impresora"
        Epos2Exception.ERR_ILLEGAL -> "Operación no permitida"
        Epos2Exception.ERR_PROCESSING -> "La impresora está ocupada"
        Epos2Exception.ERR_NOT_FOUND -> "Impresora no encontrada"
        Epos2Exception.ERR_IN_USE -> "La impresora está en uso"
        Epos2Exception.ERR_PARAM -> "Parámetro inválido"
        Epos2Exception.ERR_DISCONNECT -> "Impresora desconectada"
        Epos2Exception.ERR_UNSUPPORTED -> "Operación no soportada por la impresora"
        Epos2Exception.ERR_FAILURE -> "Error desconocido"
        else -> "Error de impresora (${e.errorStatus})"
    }

    private object Fmt {
        fun money(v: Double): String = String.format("%.2f", v)

        fun fecha(d: java.util.Date): String =
            java.text.SimpleDateFormat("dd/MM/yyyy HH:mm", java.util.Locale.getDefault()).format(d)

        /** Arma una fila de 32 columnas (fuente A, 58mm) alineando el monto a la derecha. */
        fun fila(izquierda: String, derecha: String): String {
            val ancho = 32
            val izq = if (izquierda.length > ancho - derecha.length - 1) {
                izquierda.take(ancho - derecha.length - 1)
            } else izquierda
            val espacios = (ancho - izq.length - derecha.length).coerceAtLeast(1)
            return izq + " ".repeat(espacios) + derecha + "\n"
        }
    }
}
