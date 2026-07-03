import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { RefreshCw, Search, X, Wallet } from "lucide-react";

function fmtMoney(n) {
  return `RD$ ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusBadge({ status }) {
  const styles = {
    pagada: "bg-green-50 text-green-700 border-green-100",
    parcial: "bg-amber-50 text-amber-700 border-amber-100",
    pendiente: "bg-red-50 text-red-600 border-red-100",
  };
  const labels = { pagada: "Pagada", parcial: "Parcial", pendiente: "Pendiente" };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${styles[status] ?? styles.pendiente}`}>
      {labels[status] ?? status}
    </span>
  );
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
      .select(`
        id, created_at, tipo_pago, status,
        total, total_pagado, pendiente,
        customer:customers(id, nombre, apellido, telefono)
      `)
      .in("tipo_pago", ["credito", "plazo"])
      .gt("pendiente", 0)
      .order("created_at", { ascending: false });

    if (!error) setFacturas(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchPendientes(); }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return facturas;
    return facturas.filter((f) => {
      const cliente = f.customer
        ? `${f.customer.nombre ?? ""} ${f.customer.apellido ?? ""} ${f.customer.telefono ?? ""}`
        : "consumidor final";
      return `${cliente} ${f.tipo_pago} ${f.status} ${String(f.id).slice(0, 8)}`.toLowerCase().includes(s);
    });
  }, [facturas, search]);

  const open = (f) => { setSelected(f); setMonto(""); setMsg(""); };
  const close = () => { setSelected(null); setMonto(""); setMsg(""); };

  const savePayment = async () => {
    setMsg("");
    const m = Number(monto);
    if (Number.isNaN(m) || m <= 0) { setMsg("Monto inválido."); return; }
    setSaving(true);
    const { error } = await supabase.rpc("add_payment", {
      p_invoice_id: selected.id,
      p_monto: m,
    });
    setSaving(false);
    if (error) { setMsg(error.message); return; }
    close();
    fetchPendientes();
  };

  // Total pendiente general
  const totalPendiente = facturas.reduce((sum, f) => sum + Number(f.pendiente ?? 0), 0);

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto pb-24">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Abonos</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {facturas.length} factura{facturas.length !== 1 ? "s" : ""} pendientes
          </p>
        </div>
        <button
          onClick={fetchPendientes}
          className="w-9 h-9 grid place-items-center border border-gray-100 rounded-xl hover:bg-gray-50 transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Card resumen total pendiente ── */}
      {facturas.length > 0 && (
        <div className="bg-gray-900 text-white rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Total por cobrar</p>
            <p className="text-2xl font-bold mt-0.5">{fmtMoney(totalPendiente)}</p>
          </div>
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <Wallet size={20} className="text-white" />
          </div>
        </div>
      )}

      {/* ── Buscador ── */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-300"
          placeholder="Buscar por cliente o ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-3">
            <Wallet size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-gray-900 text-sm">Todo al día</p>
          <p className="text-xs text-gray-400 mt-1">No hay facturas pendientes por cobrar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => {
            const clienteTxt = f.customer
              ? `${f.customer.nombre ?? ""} ${f.customer.apellido ?? ""}`.trim()
              : "Consumidor final";

            const pctPagado = Number(f.total) > 0
              ? Math.min((Number(f.total_pagado) / Number(f.total)) * 100, 100)
              : 0;

            return (
              <button
                key={f.id}
                onClick={() => open(f)}
                className="w-full text-left bg-white border border-gray-100 rounded-2xl p-4 transition active:scale-[0.99] hover:border-gray-200"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 truncate">{clienteTxt}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <StatusBadge status={f.status} />
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${f.tipo_pago === "credito" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                        }`}>{f.tipo_pago}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{String(f.id).slice(0, 8)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(f.created_at).toLocaleDateString("es-DO")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">Pendiente</p>
                    <p className="font-bold text-red-500 text-sm">{fmtMoney(f.pendiente)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">de {fmtMoney(f.total)}</p>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-gray-900 h-1.5 rounded-full transition-all"
                    style={{ width: `${pctPagado}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 text-right">{pctPagado.toFixed(0)}% pagado</p>
              </button>
            );
          })}
        </div>
      )}

      {/* ── MODAL ── */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-end lg:items-center justify-center z-50">
          <div className="bg-white w-full lg:w-[420px] lg:rounded-3xl rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Agregar abono</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{String(selected.id).slice(0, 8)}...</p>
              </div>
              <button onClick={close} className="w-8 h-8 grid place-items-center rounded-xl border border-gray-100">
                <X size={14} />
              </button>
            </div>

            {/* Info de la factura */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">
                {selected.customer
                  ? `${selected.customer.nombre ?? ""} ${selected.customer.apellido ?? ""}`.trim()
                  : "Consumidor final"}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-400">Total</p>
                  <p className="text-xs font-bold text-gray-900 mt-0.5">{fmtMoney(selected.total)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-400">Pagado</p>
                  <p className="text-xs font-bold text-green-600 mt-0.5">{fmtMoney(selected.total_pagado)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-red-100 bg-red-50">
                  <p className="text-[10px] text-red-400">Pendiente</p>
                  <p className="text-xs font-bold text-red-600 mt-0.5">{fmtMoney(selected.pendiente)}</p>
                </div>
              </div>

              {/* Barra de progreso en modal */}
              <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-gray-900 h-1.5 rounded-full"
                  style={{
                    width: `${Math.min((Number(selected.total_pagado) / Number(selected.total)) * 100, 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Input monto */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">Monto del abono</p>
              <input
                className="w-full border border-gray-100 rounded-xl p-3 text-lg font-semibold text-center focus:outline-none focus:border-gray-300"
                placeholder="RD$ 0.00"
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />

              {/* Atajos de monto */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { label: "25%", val: 0.25 },
                  { label: "50%", val: 0.5 },
                  { label: "Todo", val: 1 },
                ].map((x) => (
                  <button
                    key={x.val}
                    onClick={() => setMonto(String((Number(selected.pendiente) * x.val).toFixed(2)))}
                    className="border border-gray-100 rounded-xl py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    {x.label}
                    <span className="block text-[10px] text-gray-400 mt-0.5">
                      {fmtMoney(Number(selected.pendiente) * x.val)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {msg && <p className="text-xs text-red-500 mb-3">{msg}</p>}

            <button
              disabled={saving || !monto}
              onClick={savePayment}
              className="w-full bg-gray-900 text-white py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition"
            >
              {saving ? "Guardando..." : `Abonar ${monto ? fmtMoney(Number(monto)) : ""}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}