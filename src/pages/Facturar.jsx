import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { supabase } from "../lib/supabase";

// ── Componente del ticket ────────────────────────────────
const Ticket = ({ factura, perfil }) => {
  if (!factura) return null;
  return (
    <div style={{
      fontFamily: "monospace",
      fontSize: "12px",
      width: "280px",
      padding: "12px",
      color: "#000",
      background: "#fff",
    }}>
      {/* Logo / Nombre */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        {perfil?.logo_url && (
          <img src={perfil.logo_url} alt="logo"
            style={{ width: "60px", height: "60px", objectFit: "contain", margin: "0 auto 4px" }} />
        )}
        <div style={{ fontWeight: "bold", fontSize: "14px" }}>
          {perfil?.nombre_tienda ?? "Mi Tienda"}
        </div>
        {perfil?.telefono && (
          <div>Tel: {perfil.telefono}</div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      {/* Info factura */}
      <div style={{ marginBottom: "6px" }}>
        <div>Fecha: {new Date(factura.fecha).toLocaleString("es-DO")}</div>
        <div>Pago: {factura.tipo_pago === "cash" ? "Cash" : factura.tipo_pago === "credito" ? "Crédito" : "Plazo"}</div>
        {factura.cliente && (
          <div>Cliente: {factura.cliente}</div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      {/* Productos */}
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
              <td style={{ paddingRight: "4px", maxWidth: "140px", wordBreak: "break-word" }}>
                {it.nombre}
              </td>
              <td style={{ textAlign: "center" }}>{it.qty}</td>
              <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                RD$ {(it.qty * Number(it.precio_venta)).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      {/* Total */}
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px" }}>
        <span>TOTAL</span>
        <span>RD$ {Number(factura.total).toFixed(2)}</span>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      <div style={{ textAlign: "center", fontSize: "11px", marginTop: "8px" }}>
        ¡Gracias por su compra!
      </div>
    </div>
  );
};

// ── Componente principal ─────────────────────────────────
export default function Facturar() {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState(null);

  const [customerId, setCustomerId] = useState("");
  const [tipoPago, setTipoPago] = useState("cash");
  const [searchProd, setSearchProd] = useState("");
  const [cart, setCart] = useState([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Estado del ticket para imprimir
  const [facturaImpresa, setFacturaImpresa] = useState(null);
  const [showTicket, setShowTicket] = useState(false);

  const ticketRef = useRef();

const handlePrint = useReactToPrint({
  contentRef: ticketRef,
  documentTitle: "Ticket",
  pageStyle: `
    @page {
      size: 80mm auto;
      margin: 0;
    }
    @media print {
      body { margin: 0; }
    }
  `,
});

  const loadData = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user.id;

    const [c, p, perf] = await Promise.all([
      supabase.from("customers")
        .select("id,nombre,apellido,telefono")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),

      supabase.from("products")
        .select("id,nombre,codigo,precio_venta,precio_compra,control_inventario,cantidad")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),

      supabase.from("perfiles")
        .select("nombre_tienda,telefono,logo_url")
        .eq("user_id", userId)
        .single(),
    ]);

    setClientes(c.data ?? []);
    setProductos(p.data ?? []);
    if (perf.data) setPerfil(perf.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteredProducts = useMemo(() => {
    const s = searchProd.trim().toLowerCase();
    if (!s) return productos;
    return productos.filter((p) =>
      `${p.nombre} ${p.codigo}`.toLowerCase().includes(s)
    );
  }, [productos, searchProd]);

  const total = useMemo(() =>
    cart.reduce((acc, it) => acc + it.qty * Number(it.precio_venta), 0),
    [cart]
  );

  const addToCart = (p) => {
    setMsg("");
    setCart((prev) => {
      const found = prev.find((x) => x.product_id === p.id);
      if (found) return prev.map((x) => x.product_id === p.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { product_id: p.id, nombre: p.nombre, codigo: p.codigo, precio_venta: p.precio_venta, qty: 1 }];
    });
  };

  const updateQty = (product_id, qty) => {
    setCart((prev) => prev.map((x) => x.product_id === product_id ? { ...x, qty } : x).filter((x) => x.qty > 0));
  };

  const createInvoice = async () => {
    setMsg("");
    if (cart.length === 0) return setMsg("Agrega al menos un producto.");
    setSaving(true);

    const items = cart.map((it) => ({ product_id: it.product_id, cantidad: it.qty }));

    const { data, error } = await supabase.rpc("create_invoice", {
      p_customer_id: customerId || null,
      p_tipo_pago: tipoPago,
      p_items: items,
    });

    

    setSaving(false);

    if (error) { setMsg(error.message); return; }

    // Busca nombre del cliente seleccionado
    const clienteNombre = customerId
      ? clientes.find((c) => c.id === customerId)?.nombre + " " + (clientes.find((c) => c.id === customerId)?.apellido ?? "")
      : "Consumidor Final";

    // Arma la factura para imprimir
    setFacturaImpresa({
      fecha: new Date().toISOString(),
      tipo_pago: tipoPago,
      cliente: clienteNombre,
      items: cart.map((it) => ({
        nombre: it.nombre,
        qty: it.qty,
        precio_venta: it.precio_venta,
      })),
      total,
    });

    setShowTicket(true);

    // Limpia el formulario
    setCart([]);
    setCustomerId("");
    setTipoPago("cash");
    setSearchProd("");
    loadData();
  };
 
  if (loading) return <div className="p-4">Cargando...</div>;

  return (
    <div className="min-h-screen p-4 pb-28">
      <h1 className="text-2xl font-bold mb-4">Nueva Factura</h1>

      <div className="space-y-3">
        {/* Cliente */}
        <div className="border rounded-2xl p-4 bg-white">
          <p className="text-sm text-gray-600 mb-2">Cliente</p>
          <select className="w-full border rounded-xl p-3 bg-white" value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Consumidor final</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.apellido || ""} {c.telefono ? `(${c.telefono})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de pago */}
        <div className="border rounded-2xl p-4 bg-white">
          <p className="text-sm text-gray-600 mb-2">Tipo de pago</p>
          <div className="grid grid-cols-3 gap-2">
            {[{ k: "cash", t: "Cash" }, { k: "credito", t: "Crédito" }, { k: "plazo", t: "Plazo" }].map((x) => (
              <button key={x.k} onClick={() => setTipoPago(x.k)}
                className={"p-3 rounded-xl border text-sm " + (tipoPago === x.k ? "bg-black text-white" : "bg-white")}>
                {x.t}
              </button>
            ))}
          </div>
        </div>

        {/* Productos */}
        <div className="border rounded-2xl p-4 bg-white">
          <p className="text-sm text-gray-600 mb-2">Agregar productos</p>
          <input className="w-full border rounded-xl p-3" placeholder="Buscar producto..."
            value={searchProd} onChange={(e) => setSearchProd(e.target.value)} />
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
            {filteredProducts.slice(0, 30).map((p) => (
              <button key={p.id} onClick={() => addToCart(p)} className="w-full text-left border rounded-xl p-3">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-600">Código: {p.codigo}</p>
                    {p.control_inventario && (
                      <p className="text-xs text-gray-600">Inventario: {p.cantidad ?? 0}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">RD$ {Number(p.precio_venta).toFixed(2)}</p>
                    <p className="text-xs text-gray-600">Toca para agregar</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detalle */}
        <div className="border rounded-2xl p-4 bg-white">
          <p className="text-sm text-gray-600 mb-2">Detalle</p>
          {cart.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no has agregado productos.</p>
          ) : (
            <div className="space-y-2">
              {cart.map((it) => (
                <div key={it.product_id} className="border rounded-xl p-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{it.nombre}</p>
                      <p className="text-xs text-gray-600">RD$ {Number(it.precio_venta).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="w-10 h-10 border rounded-xl"
                        onClick={() => updateQty(it.product_id, it.qty - 1)}>-</button>
                      <input className="w-14 text-center border rounded-xl p-2" inputMode="numeric"
                        value={it.qty} onChange={(e) => updateQty(it.product_id, Number(e.target.value || 0))} />
                      <button className="w-10 h-10 border rounded-xl"
                        onClick={() => updateQty(it.product_id, it.qty + 1)}>+</button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-right">
                    Subtotal: <span className="font-semibold">RD$ {(it.qty * Number(it.precio_venta)).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-xl font-bold">RD$ {total.toFixed(2)}</p>
          </div>

          {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}

          <button disabled={saving} onClick={createInvoice}
            className="mt-4 w-full bg-black text-white p-3 rounded-xl font-semibold disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar Factura"}
          </button>
        </div>
      </div>

      {/* ── MODAL TICKET ── */}
      {showTicket && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">🧾 Factura lista</h2>
              <button onClick={() => setShowTicket(false)} className="text-sm underline">Cerrar</button>
            </div>

            {/* Preview del ticket */}
            <div className="flex justify-center mb-4 border rounded-xl p-4 bg-gray-50 overflow-x-auto">
              <div ref={ticketRef}>
                <Ticket factura={facturaImpresa} perfil={perfil} />
              </div>
            </div>

            {/* Botones */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePrint}
                className="w-full bg-black text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2"
              >
                🖨️ Imprimir
              </button>
              <button
                onClick={() => {
                  // Guarda como PDF usando el mismo diálogo de impresión
                  handlePrint();
                }}
                className="w-full border rounded-xl p-3 font-semibold flex items-center justify-center gap-2"
              >
                📄 Guardar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}