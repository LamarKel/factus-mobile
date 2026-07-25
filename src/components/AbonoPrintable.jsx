// ── Comprobante de abono en HTML (para imprimir por navegador cuando no hay impresora Bluetooth) ──
export default function AbonoPrintable({ data, perfil }) {
    if (!data) return null;
    return (
        <div style={{ fontFamily: "monospace", fontSize: "12px", width: "280px", padding: "12px", color: "#000", background: "#fff" }}>
            <div style={{ textAlign: "center", marginBottom: "8px" }}>
                {perfil?.logo_url && (
                    <img src={perfil.logo_url} alt="logo"
                        style={{ width: "60px", height: "60px", objectFit: "contain", margin: "0 auto 4px" }} />
                )}
                <div style={{ fontWeight: "bold", fontSize: "14px" }}>{perfil?.nombre_tienda ?? "Mi Tienda"}</div>
                {perfil?.telefono && <div>Tel: {perfil.telefono}</div>}
                {perfil?.direccion && <div>{perfil.direccion}</div>}
                <div style={{ fontWeight: "bold", marginTop: "6px" }}>COMPROBANTE DE ABONO</div>
                <div>{new Date(data.fecha).toLocaleString("es-DO")}</div>
            </div>
            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />
            {data.cliente && <div>Cliente: {data.cliente}</div>}
            <div>Factura: {data.facturaId}</div>
            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                <span>Abono recibido</span><span>RD$ {Number(data.monto).toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Total factura</span><span>RD$ {Number(data.totalFactura).toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Total pagado</span><span>RD$ {Number(data.totalPagado).toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Saldo pendiente</span><span>RD$ {Number(data.saldoPendiente).toFixed(2)}</span>
            </div>
            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />
            <div style={{ textAlign: "center", fontSize: "11px", marginTop: "8px" }}>¡Gracias por su pago!</div>
        </div>
    );
}
