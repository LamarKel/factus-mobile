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

export default function Abonos() {
  const [loading, setLoading] = useState(true);
  const [facturas, setFacturas] = useState([]);
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState(null);
  const [monto, setMonto] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPendientes = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("invoices")
      .select(
        `
        id, created_at, tipo_pago, status,
        total, total_pagado, pendiente,
        customer:customers(id, nombre, apellido, telefono)
      `
      )
      .in("tipo_pago", ["credito", "plazo"])
      .gt("pendiente", 0)
      .order("created_at", { ascending: false });

    if (!error) setFacturas(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPendientes();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return facturas;

    return facturas.filter((f) => {
      const cliente = f.customer
        ? `${f.customer.nombre ?? ""} ${f.customer.apellido ?? ""} ${f.customer.telefono ?? ""}`
        : "consumidor final";
      const t = `${cliente} ${f.tipo_pago} ${f.status} ${String(f.id).slice(0, 8)}`.toLowerCase();
      return t.includes(s);
    });
  }, [facturas, search]);

  const open = (f) => {
    setSelected(f);
    setMonto("");
    setMsg("");
  };

  const close = () => {
    setSelected(null);
    setMonto("");
    setMsg("");
  };

  const savePayment = async () => {
    setMsg("");

    const m = Number(monto);
    if (Number.isNaN(m) || m <= 0) {
      setMsg("Monto inválido.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("add_payment", {
      p_invoice_id: selected.id,
      p_monto: m,
    });
    setSaving(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    close();
    fetchPendientes();
  };

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Abonos</h1>
        <button onClick={fetchPendientes} className="text-sm underline">
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
            <p className="text-gray-500 text-sm">
              No hay facturas pendientes por cobrar.
            </p>
          )}

          {filtered.map((f) => {
            const clienteTxt = f.customer
              ? `${f.customer.nombre ?? ""} ${f.customer.apellido ?? ""}`.trim()
              : "Consumidor final";

            return (
              <button
                key={f.id}
                onClick={() => open(f)}
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
                    <p className="text-xs text-gray-600">
                      Pendiente: {fmtMoney(f.pendiente)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Agregar abono</h2>
              <button onClick={close} className="text-sm underline">
                Cerrar
              </button>
            </div>

            <div className="mt-3 border rounded-2xl p-4">
              <p className="text-sm text-gray-600">Factura</p>
              <p className="text-sm">
                ID: <span className="font-semibold">{String(selected.id).slice(0, 8)}...</span>
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="border rounded-xl p-3">
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="font-semibold">{fmtMoney(selected.total)}</p>
                </div>
                <div className="border rounded-xl p-3">
                  <p className="text-xs text-gray-600">Pendiente</p>
                  <p className="font-semibold">{fmtMoney(selected.pendiente)}</p>
                </div>
                <div className="border rounded-xl p-3">
                  <p className="text-xs text-gray-600">Pagado</p>
                  <p className="font-semibold">{fmtMoney(selected.total_pagado)}</p>
                </div>
                <div className="border rounded-xl p-3">
                  <p className="text-xs text-gray-600">Estado</p>
                  <p className="font-semibold">{selected.status}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 border rounded-2xl p-4">
              <p className="text-sm text-gray-600 mb-2">Monto del abono</p>
              <input
                className="w-full border rounded-xl p-3"
                placeholder="Ej: 500"
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[0.25, 0.5, 1].map((x) => (
                  <button
                    key={x}
                    type="button"
                    onClick={() => setMonto(String((Number(selected.pendiente) * x).toFixed(2)))}
                    className="border rounded-xl p-3 text-sm"
                  >
                    {x === 1 ? "Todo" : `${Math.round(x * 100)}%`}
                  </button>
                ))}
              </div>

              {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}

              <button
                disabled={saving}
                onClick={savePayment}
                className="mt-4 w-full bg-black text-white p-3 rounded-xl font-semibold disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar Abono"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
