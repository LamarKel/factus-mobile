import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
import { cargarImagen } from "./bluetoothPrinter";

// ── Ticket en ESC/POS (para impresora Bluetooth) ──
export const buildEscPosTicket = async (factura, perfil) => {
    // feedBeforeCut: la PT-210 no tiene cuchilla automática, así que este espacio
    // en blanco (+ la línea "CORTAR AQUI" más abajo) es lo que permite separar
    // las copias a tijera cuando se imprime más de una.
    const encoder = new ReceiptPrinterEncoder({ language: "esc-pos", columns: 32, feedBeforeCut: 4 });
    encoder.initialize().align("center");

    if (perfil?.logo_url) {
        try {
            const img = await cargarImagen(perfil.logo_url);
            const lado = Math.round(Math.min(192, Math.max(img.naturalWidth, img.naturalHeight)) / 8) * 8;
            encoder.image(img, lado, lado, "atkinson");
        } catch {
            // Si el logo no carga (sin internet, url caída, etc.) se imprime sin logo.
        }
    }

    if (perfil?.nombre_tienda) encoder.bold(true).line(perfil.nombre_tienda).bold(false);
    if (perfil?.telefono) encoder.line(`Tel: ${perfil.telefono}`);
    if (perfil?.direccion) encoder.line(perfil.direccion);
    encoder.line("--------------------------------");
    encoder.align("left");
    encoder.line(`Fecha: ${new Date(factura.fecha).toLocaleString("es-DO")}`);
    encoder.line(`Pago: ${factura.tipo_pago === "cash" ? "Cash" : factura.tipo_pago === "credito" ? "Crédito" : "Plazo"}`);
    if (factura.cliente) encoder.line(`Cliente: ${factura.cliente}`);
    encoder.line("--------------------------------");

    // Tabla de productos, igual que las columnas Producto/Cant/Sub de la vista previa.
    const filasItems = factura.items.flatMap((it) => {
        const sub = (it.qty * Number(it.precio_venta)).toFixed(2);
        const fila = [it.nombre, `x${it.qty}`, sub];
        return it.descuento_pct > 0 ? [fila, ["  Desc: " + it.descuento_pct + "%", "", ""]] : [fila];
    });
    encoder.table(
        [
            { width: 17, marginRight: 1, align: "left" },
            { width: 4, align: "right" },
            { width: 10, align: "right" },
        ],
        [["Producto", "Cant", "Sub"], ...filasItems]
    );

    encoder.line("--------------------------------");

    const filasTotal = [];
    if (factura.descuentoItemsMonto > 0) {
        filasTotal.push(["Desc. articulos:", `-${Number(factura.descuentoItemsMonto).toFixed(2)}`]);
    }
    if (factura.descuentoMonto > 0) {
        filasTotal.push(["Desc. general:", `-${Number(factura.descuentoMonto).toFixed(2)}`]);
    }
    filasTotal.push(["TOTAL:", (e) => e.bold(true).text(`RD$ ${Number(factura.total).toFixed(2)}`).bold(false)]);
    if (factura.tipo_pago === "cash" && factura.montoCobrado != null) {
        filasTotal.push(["Recibido:", `RD$ ${Number(factura.montoCobrado).toFixed(2)}`]);
        filasTotal.push(["Cambio:", `RD$ ${Number(factura.vuelto ?? 0).toFixed(2)}`]);
    }
    encoder.table(
        [
            { width: 20, align: "left" },
            { width: 12, align: "right" },
        ],
        filasTotal
    );

    encoder.line("--------------------------------");
    encoder.align("center").line("¡Gracias por su compra!");
    encoder.newline();
    encoder.line("- - - - - CORTAR AQUI - - - - -");
    encoder.cut();

    return encoder.encode();
};

// ── Comprobante de abono en ESC/POS (para impresora Bluetooth) ──
export const buildEscPosAbono = async (data, perfil) => {
    const encoder = new ReceiptPrinterEncoder({ language: "esc-pos", columns: 32, feedBeforeCut: 4 });
    encoder.initialize().align("center");

    if (perfil?.logo_url) {
        try {
            const img = await cargarImagen(perfil.logo_url);
            const lado = Math.round(Math.min(192, Math.max(img.naturalWidth, img.naturalHeight)) / 8) * 8;
            encoder.image(img, lado, lado, "atkinson");
        } catch {
            // Sin logo si no carga.
        }
    }

    if (perfil?.nombre_tienda) encoder.bold(true).line(perfil.nombre_tienda).bold(false);
    if (perfil?.telefono) encoder.line(`Tel: ${perfil.telefono}`);
    if (perfil?.direccion) encoder.line(perfil.direccion);
    encoder.bold(true).line("COMPROBANTE DE ABONO").bold(false);
    encoder.line(new Date(data.fecha).toLocaleString("es-DO"));
    encoder.line("--------------------------------");
    encoder.align("left");
    if (data.cliente) encoder.line(`Cliente: ${data.cliente}`);
    encoder.line(`Factura: ${data.facturaId}`);
    encoder.line("--------------------------------");
    encoder.table(
        [
            { width: 20, align: "left" },
            { width: 12, align: "right" },
        ],
        [
            ["Abono recibido:", (e) => e.bold(true).text(`RD$ ${Number(data.monto).toFixed(2)}`).bold(false)],
            ["Total factura:", `RD$ ${Number(data.totalFactura).toFixed(2)}`],
            ["Total pagado:", `RD$ ${Number(data.totalPagado).toFixed(2)}`],
            ["Saldo pendiente:", `RD$ ${Number(data.saldoPendiente).toFixed(2)}`],
        ]
    );
    encoder.line("--------------------------------");
    encoder.align("center").line("¡Gracias por su pago!");
    encoder.newline();
    encoder.line("- - - - - CORTAR AQUI - - - - -");
    encoder.cut();

    return encoder.encode();
};
