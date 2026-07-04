import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { supabase } from "../lib/supabase";
import ScannerModal from "../components/ScannerModal";
import { ShoppingCart, Search, X, Printer, FileText, Scan, Tag } from "lucide-react";

// ── Ticket ───────────────────────────────────────────────
const Ticket = ({ factura, perfil }) => {
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
      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />
      <div style={{ textAlign: "center", fontSize: "11px", marginTop: "8px" }}>¡Gracias por su compra!</div>
    </div>
  );
};

// ── Card de producto ─────────────────────────────────────
const ProductCard = ({ p, onAdd, inCart }) => {
  const agotado = p.control_inventario && (p.cantidad ?? 0) <= 0;
  return (
    <button
      onClick={() => !agotado && onAdd(p)}
      disabled={agotado}
      className={`relative text-left border rounded-2xl overflow-hidden bg-white transition-all active:scale-95 ${inCart ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-100 hover:border-gray-300"
        } ${agotado ? "opacity-50" : ""}`}
    >
      <div className="w-full aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden">
        {p.imagen_url ? (
          <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = "none"; }} />
        ) : (
          <span className="text-3xl">🌸</span>
        )}
      </div>
      {agotado && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
          <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded-full border">Agotado</span>
        </div>
      )}
      {inCart && !agotado && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-gray-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
          {inCart}
        </div>
      )}
      <div className="p-1.5">
        <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2">{p.nombre}</p>
        {p.categoria && <p className="text-[10px] text-gray-400 mt-0.5">{p.categoria}</p>}
        <p className="text-xs font-bold text-gray-900 mt-1">
          RD$ {Number(p.precio_venta).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
        </p>
        {p.control_inventario && <p className="text-[10px] text-gray-400">Stock: {p.cantidad ?? 0}</p>}
      </div>
    </button>
  );
};

// ── Componente principal ─────────────────────────────────
export default function Facturar() {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [descuentos, setDescuentos] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [tipoPago, setTipoPago] = useState("cash");
  const [discountId, setDiscountId] = useState("");
  const [searchProd, setSearchProd] = useState("");
  const [catActiva, setCatActiva] = useState("Todo");
  const [cart, setCart] = useState([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // 👇 Nuevos estados para descuento por artículo
  const [modoDescItem, setModoDescItem] = useState(false);
  const [descPorItem, setDescPorItem] = useState({}); // { product_id: pct }

  const [showCarrito, setShowCarrito] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [facturaImpresa, setFacturaImpresa] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  const ticketRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: "Ticket",
    pageStyle: `@page { size: 58mm auto; margin: 2mm; } @media print { body { margin: 0; } }`,
  });

  const loadData = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user.id;
    const [c, p, perf, desc] = await Promise.all([
      supabase.from("customers").select("id,nombre,apellido,telefono").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("products").select("id,nombre,codigo,precio_venta,precio_compra,control_inventario,cantidad,imagen_url,categoria").eq("user_id", userId).order("nombre", { ascending: true }),
      supabase.from("perfiles").select("nombre_tienda,telefono,logo_url").eq("user_id", userId).single(),
      supabase.from("discounts").select("id,nombre,tipo,valor").eq("user_id", userId).eq("activo", true).order("nombre"),
    ]);
    setClientes(c.data ?? []);
    setProductos(p.data ?? []);
    if (perf.data) setPerfil(perf.data);
    setDescuentos(desc.data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const categorias = useMemo(() => {
    const cats = [...new Set(productos.map((p) => p.categoria).filter(Boolean))];
    return ["Todo", ...cats];
  }, [productos]);

  const filteredProducts = useMemo(() => {
    const s = searchProd.trim().toLowerCase();
    return productos.filter((p) => {
      const matchSearch = !s || `${p.nombre} ${p.codigo} ${p.categoria ?? ""}`.toLowerCase().includes(s);
      const matchCat = catActiva === "Todo" || p.categoria === catActiva;
      return matchSearch && matchCat;
    });
  }, [productos, searchProd, catActiva]);

  // ── Totales considerando descuento por item ──
  const cartConDescuento = useMemo(() => cart.map((it) => {
    const pct = Number(descPorItem[it.product_id] ?? 0);
    const precioFinal = it.precio_venta * (1 - pct / 100);
    return { ...it, descuento_pct: pct, precio_venta_original: it.precio_venta, precio_venta: precioFinal };
  }), [cart, descPorItem]);

  const subtotalBruto = useMemo(() =>
    cart.reduce((acc, it) => acc + it.qty * Number(it.precio_venta), 0), [cart]);

  const descuentoItemsMonto = useMemo(() =>
    cartConDescuento.reduce((acc, it) => {
      const original = it.qty * Number(it.precio_venta_original);
      const final = it.qty * Number(it.precio_venta);
      return acc + (original - final);
    }, 0), [cartConDescuento]);

  const subtotalNeto = subtotalBruto - descuentoItemsMonto;

  const descuentoSeleccionado = descuentos.find((d) => d.id === discountId);
  const descuentoMonto = useMemo(() => {
    if (!descuentoSeleccionado) return 0;
    if (descuentoSeleccionado.tipo === "porcentaje") return Math.min(subtotalNeto * (descuentoSeleccionado.valor / 100), subtotalNeto);
    return Math.min(descuentoSeleccionado.valor, subtotalNeto);
  }, [descuentoSeleccionado, subtotalNeto]);

  const totalFinal = subtotalNeto - descuentoMonto;
  const itemsEnCarrito = cart.reduce((a, b) => a + b.qty, 0);

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

  const handleScan = (codigo) => {
    setShowScanner(false);
    const producto = productos.find((p) => p.codigo === codigo);
    if (!producto) { alert(`No se encontró producto con código: ${codigo}`); return; }
    addToCart(producto);
  };

  const createInvoice = async () => {
    setMsg("");
    if (cart.length === 0) return setMsg("Agrega al menos un producto.");
    setSaving(true);

    const { error } = await supabase.rpc("create_invoice", {
      p_customer_id: customerId || null,
      p_tipo_pago: tipoPago,
      p_items: cartConDescuento.map((it) => ({
        product_id: it.product_id,
        cantidad: it.qty,
        descuento_pct: it.descuento_pct ?? 0, // 👈 manda el descuento por item
      })),
      p_discount_id: discountId || null,
    });

    setSaving(false);
    if (error) { setMsg(error.message); return; }

    const clienteNombre = customerId
      ? `${clientes.find((c) => c.id === customerId)?.nombre ?? ""} ${clientes.find((c) => c.id === customerId)?.apellido ?? ""}`.trim()
      : "Consumidor Final";

    const clienteData = clientes.find((c) => c.id === customerId);

    setFacturaImpresa({
      fecha: new Date().toISOString(),
      tipo_pago: tipoPago,
      cliente: clienteNombre,
      clienteTelefono: clienteData?.telefono ?? null,
      descuentoItemsMonto,
      descuentoMonto,
      items: cartConDescuento.map((it) => ({
        nombre: it.nombre,
        qty: it.qty,
        precio_venta: it.precio_venta,
        precio_venta_original: it.precio_venta_original,
        descuento_pct: it.descuento_pct,
      })),
      total: totalFinal,
    });

    setCart([]);
    setCustomerId("");
    setTipoPago("cash");
    setSearchProd("");
    setDiscountId("");
    setDescPorItem({});
    setModoDescItem(false);
    setShowCarrito(false);
    setShowTicket(true);
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>;

  // ── Panel del carrito ──
  const CarritoPanel = () => (
    <div className="flex flex-col h-full">
      <div className="space-y-2 mb-3">
        <select className="w-full border border-gray-100 rounded-xl p-2.5 text-sm bg-white text-gray-700"
          value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Consumidor final</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre} {c.apellido || ""}</option>
          ))}
        </select>

        <div className="grid grid-cols-3 gap-1.5">
          {[{ k: "cash", t: "Cash" }, { k: "credito", t: "Crédito" }, { k: "plazo", t: "Plazo" }].map((x) => (
            <button key={x.k} onClick={() => setTipoPago(x.k)}
              className={`py-2 rounded-xl text-xs font-medium border transition ${tipoPago === x.k ? "bg-gray-900 text-white border-gray-900" : "border-gray-100 text-gray-600"}`}>
              {x.t}
            </button>
          ))}
        </div>

        {descuentos.length > 0 && (
          <select className="w-full border border-gray-100 rounded-xl p-2.5 text-sm bg-white text-gray-700"
            value={discountId} onChange={(e) => setDiscountId(e.target.value)}>
            <option value="">Sin descuento general</option>
            {descuentos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre} ({d.tipo === "porcentaje" ? `${d.valor}%` : `RD$ ${d.valor}`})
              </option>
            ))}
          </select>
        )}

        {/* 👇 Toggle descuento por artículo */}
        {cart.length > 0 && (
          <button
            onClick={() => setModoDescItem((v) => !v)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-medium transition ${modoDescItem ? "bg-amber-50 border-amber-200 text-amber-700" : "border-gray-100 text-gray-600"
              }`}
          >
            <div className="flex items-center gap-2">
              <Tag size={13} />
              Descuento por artículo
            </div>
            <div className={`w-8 h-4 rounded-full transition-colors ${modoDescItem ? "bg-amber-400" : "bg-gray-200"}`}>
              <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${modoDescItem ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {cart.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Agrega productos al carrito</p>
        ) : (
          cart.map((it) => {
            const pct = Number(descPorItem[it.product_id] ?? 0);
            const precioFinal = it.precio_venta * (1 - pct / 100);
            const descMontoItem = (it.precio_venta - precioFinal) * it.qty;
            return (
              <div key={it.product_id} className={`border rounded-xl p-2.5 ${pct > 0 ? "border-amber-200 bg-amber-50/50" : "border-gray-100"}`}>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{it.nombre}</p>
                    <div className="flex items-center gap-1.5">
                      {pct > 0 ? (
                        <>
                          <span className="text-[10px] text-gray-400 line-through">RD$ {Number(it.precio_venta).toFixed(2)}</span>
                          <span className="text-[10px] text-amber-700 font-medium">RD$ {precioFinal.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">RD$ {Number(it.precio_venta).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => updateQty(it.product_id, it.qty - 1)}
                      className="w-7 h-7 border border-gray-100 rounded-lg text-sm flex items-center justify-center text-gray-600">−</button>
                    <span className="text-xs font-semibold w-6 text-center">{it.qty}</span>
                    <button onClick={() => updateQty(it.product_id, it.qty + 1)}
                      className="w-7 h-7 border border-gray-100 rounded-lg text-sm flex items-center justify-center text-gray-600">+</button>
                  </div>
                  <p className="text-xs font-bold text-gray-900 w-16 text-right flex-shrink-0">
                    RD$ {(it.qty * precioFinal).toFixed(2)}
                  </p>
                </div>

                {/* 👇 Input de % solo si modoDescItem está activo */}
                {modoDescItem && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                    <Tag size={11} className="text-amber-500 flex-shrink-0" />
                    <span className="text-[10px] text-gray-500 flex-shrink-0">Desc. %</span>
                    <input
                      type="number" min="0" max="100" step="1"
                      inputMode="decimal"
                      value={descPorItem[it.product_id] ?? ""}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Math.min(Math.max(Number(e.target.value || 0), 0), 100);
                        setDescPorItem((prev) => ({ ...prev, [it.product_id]: val }));
                      }}
                      className="w-16 border border-amber-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:border-amber-400 bg-white"
                    />
                    {pct > 0 && (
                      <span className="text-[10px] text-amber-700 font-medium ml-auto">
                        -RD$ {descMontoItem.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Totales */}
      <div className="border-t border-gray-100 pt-3 mt-3 space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Subtotal</span>
          <span>RD$ {subtotalBruto.toFixed(2)}</span>
        </div>
        {descuentoItemsMonto > 0 && (
          <div className="flex justify-between text-xs text-amber-600">
            <span>Desc. por artículos</span>
            <span>- RD$ {descuentoItemsMonto.toFixed(2)}</span>
          </div>
        )}
        {descuentoMonto > 0 && (
          <div className="flex justify-between text-xs text-green-600">
            <span>Desc. general</span>
            <span>- RD$ {descuentoMonto.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-1 border-t border-gray-100">
          <span className="text-sm font-semibold text-gray-900">Total</span>
          <span className="text-lg font-bold text-gray-900">RD$ {totalFinal.toFixed(2)}</span>
        </div>
      </div>

      {msg && <p className="text-xs text-red-500 mt-2">{msg}</p>}

      <button disabled={saving || cart.length === 0} onClick={createInvoice}
        className="mt-3 w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition">
        {saving ? "Guardando..." : `Guardar factura · RD$ ${totalFinal.toFixed(2)}`}
      </button>
    </div>
  );

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col lg:flex-row overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-3 border-b border-gray-100 bg-white space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-8 pr-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-gray-300"
                placeholder="Buscar producto o código..." value={searchProd}
                onChange={(e) => setSearchProd(e.target.value)} />
            </div>
            <button onClick={() => setShowScanner(true)}
              className="w-10 h-10 border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-50">
              <Scan size={16} />
            </button>
          </div>
          {categorias.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categorias.map((cat) => (
                <button key={cat} onClick={() => setCatActiva(cat)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${catActiva === cat ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {filteredProducts.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">No se encontraron productos</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} p={p} onAdd={addToCart}
                  inCart={cart.find((x) => x.product_id === p.id)?.qty ?? 0} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:flex flex-col w-80 border-l border-gray-100 bg-white p-4 overflow-hidden">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Carrito {itemsEnCarrito > 0 && <span className="text-gray-400 font-normal">({itemsEnCarrito} items)</span>}
        </h2>
        <CarritoPanel />
      </div>

      {itemsEnCarrito > 0 && (
        <button onClick={() => setShowCarrito(true)}
          className="lg:hidden fixed bottom-20 right-4 z-30 bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center gap-2 shadow-lg">
          <ShoppingCart size={18} />
          <span className="text-sm font-semibold">{itemsEnCarrito} items</span>
          <span className="text-sm font-bold">· RD$ {totalFinal.toFixed(2)}</span>
        </button>
      )}

      {showCarrito && (
        <div className="lg:hidden fixed inset-0 bg-black/40 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Tu pedido</h2>
              <button onClick={() => setShowCarrito(false)}><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0"><CarritoPanel /></div>
          </div>
        </div>
      )}

      {showTicket && (
        <div className="fixed inset-0 bg-black/40 flex items-end lg:items-center justify-center z-50">
          <div className="bg-white w-full lg:w-auto lg:rounded-3xl rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Factura guardada</h2>
              <button onClick={() => setShowTicket(false)}><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="flex justify-center mb-4 border border-gray-100 rounded-xl p-4 bg-gray-50 overflow-x-auto">
              <div ref={ticketRef}><Ticket factura={facturaImpresa} perfil={perfil} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handlePrint}
                className="flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold">
                <Printer size={16} /> Imprimir
              </button>
              <button onClick={handlePrint}
                className="flex items-center justify-center gap-2 border border-gray-100 rounded-xl py-3 text-sm font-semibold text-gray-700">
                <FileText size={16} /> Guardar PDF
              </button>
            </div>
            {facturaImpresa?.clienteTelefono && (
              <button
                onClick={() => {
                  const lineas = facturaImpresa.items.map((it) =>
                    `• ${it.nombre}${it.descuento_pct > 0 ? ` (-${it.descuento_pct}%)` : ""} x${it.qty} = RD$ ${(it.qty * Number(it.precio_venta)).toFixed(2)}`
                  );
                  const mensaje =
                    `🧾 *Factura - ${perfil?.nombre_tienda ?? "Mi Tienda"}*\n\n` +
                    lineas.join("\n") +
                    `\n\n*Total: RD$ ${Number(facturaImpresa.total).toFixed(2)}*\n\n` +
                    `Gracias por su compra 🙏`;
                  window.open(`https://wa.me/${facturaImpresa.clienteTelefono}?text=${encodeURIComponent(mensaje)}`, "_blank");
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-green-500 text-white rounded-xl py-3 text-sm font-semibold"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Enviar factura por WhatsApp
              </button>
            )}
          </div>
        </div>
      )}

      {showScanner && <ScannerModal onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  );
}