// ── Ticket en HTML (para imprimir por navegador cuando no hay impresora Bluetooth) ──
export default function TicketPrintable({ factura, perfil }) {
    if (!factura) return null;
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
            </div>
            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />
            <div style={{ marginBottom: "6px" }}>
                <div>Fecha: {new Date(factura.fecha).toLocaleString("es-DO")}</div>
                <div>Pago: {factura.tipo_pago === "cash" ? "Cash" : factura.tipo_pago === "credito" ? "Crédito" : "Plazo"}</div>
                {factura.cliente && <div>Cliente: {factura.cliente}</div>}
            </div>
            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: "left" }}>Producto</th>
                        <th style={{ textAlign: "center" }}>Cant</th>
                        <th style={{ textAlign: "right" }}>Sub</th>
                    </tr>
                </thead>
                <tbody>
                    {factura.items.map((it, i) => (
                        <tr key={i}>
                            <td style={{ paddingRight: "4px", maxWidth: "120px", wordBreak: "break-word" }}>
                                {it.nombre}
                                {it.descuento_pct > 0 && (
                                    <div style={{ fontSize: "10px", color: "#16a34a" }}>Desc: {it.descuento_pct}%</div>
                                )}
                            </td>
                            <td style={{ textAlign: "center" }}>{it.qty}</td>
                            <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                {it.descuento_pct > 0 && (
                                    <div style={{ fontSize: "10px", textDecoration: "line-through", color: "#9ca3af" }}>
                                        RD$ {(it.qty * Number(it.precio_venta_original)).toFixed(2)}
                                    </div>
                                )}
                                RD$ {(it.qty * Number(it.precio_venta)).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />
            {factura.descuentoItemsMonto > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#16a34a" }}>
                    <span>Desc. por artículos</span>
                    <span>- RD$ {Number(factura.descuentoItemsMonto).toFixed(2)}</span>
                </div>
            )}
            {factura.descuentoMonto > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#16a34a" }}>
                    <span>Desc. general</span>
                    <span>- RD$ {Number(factura.descuentoMonto).toFixed(2)}</span>
                </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px", marginTop: "4px" }}>
                <span>TOTAL</span>
                <span>RD$ {Number(factura.total).toFixed(2)}</span>
            </div>
            {factura.tipo_pago === "cash" && factura.montoCobrado != null && (
                <>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginTop: "4px" }}>
                        <span>Recibido</span>
                        <span>RD$ {Number(factura.montoCobrado).toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                        <span>Cambio</span>
                        <span>RD$ {Number(factura.vuelto ?? 0).toFixed(2)}</span>
                    </div>
                </>
            )}
            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />
            <div style={{ textAlign: "center", fontSize: "11px", marginTop: "8px" }}>¡Gracias por su compra!</div>
        </div>
    );
}
