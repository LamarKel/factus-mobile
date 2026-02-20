import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Facturar() {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [customerId, setCustomerId] = useState("");
  const [tipoPago, setTipoPago] = useState("cash"); // cash | credito | plazo

  const [searchProd, setSearchProd] = useState("");
  const [cart, setCart] = useState([]); // {product_id, nombre, codigo, precio_venta, qty}

  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);

    const c = await supabase
      .from("customers")
      .select("id,nombre,apellido,telefono")
      .order("created_at", { ascending: false });

    const p = await supabase
      .from("products")
      .select("id,nombre,codigo,precio_venta,precio_compra,control_inventario,cantidad")
      .order("created_at", { ascending: false });

    setClientes(c.data ?? []);
    setProductos(p.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const s = searchProd.trim().toLowerCase();
    if (!s) return productos;
    return productos.filter((p) =>
      `${p.nombre} ${p.codigo}`.toLowerCase().includes(s)
    );
  }, [productos, searchProd]);

  const total = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.qty * Number(it.precio_venta), 0);
  }, [cart]);

  const addToCart = (p) => {
    setMsg("");
    setCart((prev) => {
      const found = prev.find((x) => x.product_id === p.id);
      if (found) {
        return prev.map((x) =>
          x.product_id === p.id ? { ...x, qty: x.qty + 1 } : x
        );
      }
      return [
        ...prev,
        {
          product_id: p.id,
          nombre: p.nombre,
          codigo: p.codigo,
          precio_venta: p.precio_venta,
          qty: 1,
        },
      ];
    });
  };

  const updateQty = (product_id, qty) => {
    setCart((prev) =>
      prev
        .map((x) => (x.product_id === product_id ? { ...x, qty } : x))
        .filter((x) => x.qty > 0)
    );
  };

  const createInvoice = async () => {
    setMsg("");

    if (cart.length === 0) return setMsg("Agrega al menos un producto.");

    setSaving(true);

    // items que espera la función
    const items = cart.map((it) => ({
      product_id: it.product_id,
      cantidad: it.qty,
    }));

    const { data, error } = await supabase.rpc("create_invoice", {
      p_customer_id: customerId || null, // permite consumidor final
      p_tipo_pago: tipoPago,
      p_items: items,
    });

    setSaving(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    // OK
    setCart([]);
    setCustomerId("");
    setTipoPago("cash");
    setSearchProd("");
    setMsg(`Factura creada ✅ (ID: ${String(data).slice(0, 8)}...)`);
    loadData(); // para refrescar inventario si aplica
  };

  if (loading) return <div className="p-4">Cargando...</div>;

  return (
    <div className="min-h-screen p-4 pb-28">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nueva Factura</h1>
      </div>

      <div className="mt-4 space-y-3">
        <div className="border rounded-2xl p-4 bg-white">
          <p className="text-sm text-gray-600 mb-2">Cliente</p>
          <select
            className="w-full border rounded-xl p-3 bg-white"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Consumidor final</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.apellido || ""} {c.telefono ? `(${c.telefono})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="border rounded-2xl p-4 bg-white">
          <p className="text-sm text-gray-600 mb-2">Tipo de pago</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { k: "cash", t: "Cash" },
              { k: "credito", t: "Crédito" },
              { k: "plazo", t: "Plazo" },
            ].map((x) => (
              <button
                key={x.k}
                onClick={() => setTipoPago(x.k)}
                className={
                  "p-3 rounded-xl border text-sm " +
                  (tipoPago === x.k ? "bg-black text-white" : "bg-white")
                }
              >
                {x.t}
              </button>
            ))}
          </div>
        </div>

        <div className="border rounded-2xl p-4 bg-white">
          <p className="text-sm text-gray-600 mb-2">Agregar productos</p>

          <input
            className="w-full border rounded-xl p-3"
            placeholder="Buscar producto..."
            value={searchProd}
            onChange={(e) => setSearchProd(e.target.value)}
          />

          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
            {filteredProducts.slice(0, 30).map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="w-full text-left border rounded-xl p-3"
              >
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-600">Código: {p.codigo}</p>
                    {p.control_inventario && (
                      <p className="text-xs text-gray-600">
                        Inventario: {p.cantidad ?? 0}
                      </p>
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
                      <button
                        className="w-10 h-10 border rounded-xl"
                        onClick={() => updateQty(it.product_id, it.qty - 1)}
                      >
                        -
                      </button>
                      <input
                        className="w-14 text-center border rounded-xl p-2"
                        inputMode="numeric"
                        value={it.qty}
                        onChange={(e) =>
                          updateQty(it.product_id, Number(e.target.value || 0))
                        }
                      />
                      <button
                        className="w-10 h-10 border rounded-xl"
                        onClick={() => updateQty(it.product_id, it.qty + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-right">
                    Subtotal:{" "}
                    <span className="font-semibold">
                      RD$ {(it.qty * Number(it.precio_venta)).toFixed(2)}
                    </span>
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

          <button
            disabled={saving}
            onClick={createInvoice}
            className="mt-4 w-full bg-black text-white p-3 rounded-xl font-semibold disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar Factura"}
          </button>
        </div>
      </div>
    </div>
  );
}
