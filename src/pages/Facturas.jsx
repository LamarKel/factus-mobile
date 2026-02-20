import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

function fmtMoney(n) {
  const x = Number(n ?? 0);
  return `RD$ ${x.toFixed(2)}`;
}

function badgeStatus(status) {
  if (status === "pagada") return "bg-green-100 text-green-700 border-green-200";
  if (status === "parcial") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-red-100 text-red-700 border-red-200";
}

export default function Facturas() {
  const [loading, setLoading] = useState(true);
  const [facturas, setFacturas] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null); // factura seleccionada
  const [detailLoading, setDetailLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);

  const fetchFacturas = async () => {
    setLoading(true);

    // Traemos facturas con cliente (si tiene)
    const { data, error } = await supabase
      .from("invoices")
      .select(
        `
        id, created_at, tipo_pago, status,
        total, total_pagado, pendiente, total_ganancia, total_costo,
        customer:customers(id, nombre, apellido, telefono)
      `
      )
      .order("created_at", { ascending: false });

    if (!error) setFacturas(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFacturas();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return facturas;

    return facturas.filter((f) => {
      const cliente = f.customer
        ? `${f.customer.nombre ?? ""} ${f.customer.apellido ?? ""} ${f.customer.telefono ?? ""}`
        : "consumidor final";
      const t = `${cliente} ${f.tipo_pago} ${f.status} ${String(f.id).slice(0, 8)}`
        .toLowerCase();
      return t.includes(s);
    });
  }, [facturas, search]);

  const openFactura = async (factura) => {
    setSelected(factura);
    setItems([]);
    setPayments([]);
    setDetailLoading(true);

    const [it, pay] = await Promise.all([
      supabase
        .from("invoice_items")
        .select("id, nombre_producto_snapshot, codigo_snapshot, cantidad, precio_venta_unit, subtotal")
        .eq("invoice_id", factura.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("payments")
        .select("id, monto, created_at")
        .eq("invoice_id", factura.id)
        .order("created_at", { ascending: false }),
    ]);

    setItems(it.data ?? []);
    setPayments(pay.data ?? []);
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setSelected(null);
    setItems([]);
    setPayments([]);
  };

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Facturas</h1>
        <button onClick={fetchFacturas} className="text-sm underline">
          Actualizar
        </button>
      </div>

      <input
        className="w-full mt-4 border rounded-xl p-3"
        placeholder="Buscar por cliente / estado / ID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="mt-4">Cargando...</p>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.length === 0 && (
            <p className="text-gray-500 text-sm">No hay facturas aún.</p>
          )}

          {filtered.map((f) => {
            const clienteTxt = f.customer
              ? `${f.customer.nombre ?? ""} ${f.customer.apellido ?? ""}`.trim()
              : "Consumidor final";

            return (
              <button
                key={f.id}
                onClick={() => openFactura(f)}
                className="w-full text-left border rounded-2xl p-4 bg-white shadow-sm"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{clienteTxt}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(f.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">
                      Tipo: <span className="font-semibold">{f.tipo_pago}</span>
                      {" · "}ID: {String(f.id).slice(0, 8)}...
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={
                        "inline-block text-xs px-2 py-1 rounded-full border " +
                        badgeStatus(f.status)
                      }
                    >
                      {f.status}
                    </span>
                    <p className="mt-2 font-bold">{fmtMoney(f.total)}</p>
                    {Number(f.pendiente ?? 0) > 0 && (
                      <p className="text-xs text-gray-600">
                        Pendiente: {fmtMoney(f.pendiente)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* DETALLE (modal) */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Detalle de factura</h2>
              <button onClick={closeDetail} className="text-sm underline">
                Cerrar
              </button>
            </div>

            <div className="mt-3 border rounded-2xl p-4">
              <p className="text-sm text-gray-600">Cliente</p>
              <p className="font-semibold">
                {selected.customer
                  ? `${selected.customer.nombre ?? ""} ${selected.customer.apellido ?? ""}`.trim()
                  : "Consumidor final"}
              </p>

              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="border rounded-xl p-3">
                  <p className="text-xs text-gray-600">Tipo pago</p>
                  <p className="font-semibold">{selected.tipo_pago}</p>
                </div>
                <div className="border rounded-xl p-3">
                  <p className="text-xs text-gray-600">Estado</p>
                  <p className="font-semibold">{selected.status}</p>
                </div>
                <div className="border rounded-xl p-3">
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="font-semibold">{fmtMoney(selected.total)}</p>
                </div>
                <div className="border rounded-xl p-3">
                  <p className="text-xs text-gray-600">Pendiente</p>
                  <p className="font-semibold">{fmtMoney(selected.pendiente)}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 border rounded-2xl p-4">
              <p className="font-semibold mb-2">Productos</p>

              {detailLoading ? (
                <p className="text-sm">Cargando detalle...</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-gray-500">Sin items.</p>
              ) : (
                <div className="space-y-2">
                  {items.map((it) => (
                    <div key={it.id} className="border rounded-xl p-3">
                      <div className="flex justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {it.nombre_producto_snapshot}
                          </p>
                          <p className="text-xs text-gray-600">
                            {it.codigo_snapshot ? `Código: ${it.codigo_snapshot}` : ""}
                          </p>
                          <p className="text-xs text-gray-600">
                            Cant: {it.cantidad} · Unit: {fmtMoney(it.precio_venta_unit)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{fmtMoney(it.subtotal)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 border rounded-2xl p-4">
              <p className="font-semibold mb-2">Pagos / Abonos</p>

              {detailLoading ? (
                <p className="text-sm">Cargando pagos...</p>
              ) : payments.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Aún no hay pagos registrados.
                </p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="border rounded-xl p-3 flex justify-between">
                      <div>
                        <p className="text-sm font-semibold">{fmtMoney(p.monto)}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(p.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 border rounded-2xl p-4">
              <p className="text-sm text-gray-600">Contabilidad básica</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="border rounded-xl p-3">
                  <p className="text-xs text-gray-600">Inversión (costo)</p>
                  <p className="font-semibold">{fmtMoney(selected.total_costo)}</p>
                </div>
                <div className="border rounded-xl p-3">
                  <p className="text-xs text-gray-600">Ganancia</p>
                  <p className="font-semibold">{fmtMoney(selected.total_ganancia)}</p>
                </div>
                <div className="border rounded-xl p-3">
                  <p className="text-xs text-gray-600">Pagado</p>
                  <p className="font-semibold">{fmtMoney(selected.total_pagado)}</p>
                </div>
                <div className="border rounded-xl p-3">
                  <p className="text-xs text-gray-600">Pendiente</p>
                  <p className="font-semibold">{fmtMoney(selected.pendiente)}</p>
                </div>
              </div>
            </div>

            {/* nota: luego pondremos aquí el botón "Agregar abono" */}
          </div>
        </div>
      )}
    </div>
  );
}
