import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { RefreshCw, Search, X, ChevronRight } from "lucide-react";

function fmtMoney(n) {
  return `RD$ ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusBadge({ status }) {
  const styles = {
    pagada: "bg-green-50 text-green-700 border-green-100",
    parcial: "bg-amber-50 text-amber-700 border-amber-100",
    pendiente: "bg-red-50 text-red-600 border-red-100",
    cancelada: "bg-gray-100 text-gray-500 border-gray-200",
  };
  const labels = {
    pagada: "Pagada",
    parcial: "Parcial",
    pendiente: "Pendiente",
    cancelada: "Cancelada",
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${styles[status] ?? styles.pendiente}`}>
      {labels[status] ?? status}
    </span>
  );
}

function TipoBadge({ tipo }) {
  const styles = {
    cash: "bg-gray-100 text-gray-600",
    credito: "bg-blue-50 text-blue-600",
    plazo: "bg-purple-50 text-purple-600",
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[tipo] ?? "bg-gray-100 text-gray-600"}`}>
      {tipo}
    </span>
  );
}

export default function Facturas() {
  const [loading, setLoading] = useState(true);
  const [facturas, setFacturas] = useState([]);
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todas");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);

  const fetchFacturas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        id, created_at, tipo_pago, status,
        total, total_pagado, pendiente, total_ganancia, total_costo,
        customer:customers(id, nombre, apellido, telefono)
      `)
      .order("created_at", { ascending: false });

    if (!error) setFacturas(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchFacturas(); }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return facturas.filter((f) => {
      const cliente = f.customer
        ? `${f.customer.nombre ?? ""} ${f.customer.apellido ?? ""} ${f.customer.telefono ?? ""}`
        : "consumidor final";
      const matchSearch = !s || `${cliente} ${f.tipo_pago} ${f.status} ${String(f.id).slice(0, 8)}`.toLowerCase().includes(s);
      const matchStatus = filtroStatus === "todas" || f.status === filtroStatus;
      return matchSearch && matchStatus;
    });
  }, [facturas, search, filtroStatus]);

  const openFactura = async (factura) => {
    setSelected(factura);
    setItems([]);
    setPayments([]);
    setDetailLoading(true);

    const [it, pay] = await Promise.all([
      supabase.from("invoice_items")
        .select("id, nombre_producto_snapshot, codigo_snapshot, cantidad, precio_venta_unit, subtotal")
        .eq("invoice_id", factura.id)
        .order("created_at", { ascending: true }),
      supabase.from("payments")
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

  const tieneAbonos = (payments?.length ?? 0) > 0;
  const bloqueaCancelar = selected?.tipo_pago !== "cash" && tieneAbonos;

  // Contadores para los filtros
  const counts = useMemo(() => ({
    todas: facturas.length,
    pagada: facturas.filter((f) => f.status === "pagada").length,
    pendiente: facturas.filter((f) => f.status === "pendiente").length,
    parcial: facturas.filter((f) => f.status === "parcial").length,
  }), [facturas]);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto pb-24">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Facturas</h1>
        <button
          onClick={fetchFacturas}
          className="w-9 h-9 grid place-items-center border border-gray-100 rounded-xl hover:bg-gray-50 transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Buscador ── */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-300"
          placeholder="Buscar por cliente, estado o ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Filtros de estado ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mb-4 -mx-4 px-4">
        {[
          { k: "todas", t: "Todas" },
          { k: "pagada", t: "Pagadas" },
          { k: "pendiente", t: "Pendientes" },
          { k: "parcial", t: "Parciales" },
        ].map((x) => (
          <button
            key={x.k}
            onClick={() => setFiltroStatus(x.k)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${filtroStatus === x.k ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
              }`}
          >
            {x.t}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filtroStatus === x.k ? "bg-white/20 text-white" : "bg-white text-gray-500"
              }`}>
              {counts[x.k]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Lista de facturas ── */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Cargando...</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-12">No hay facturas.</p>
      ) : (
        <>
          {/* Desktop — tabla */}
          <div className="hidden lg:block bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">ID</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Total</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Pendiente</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const clienteTxt = f.customer
                    ? `${f.customer.nombre ?? ""} ${f.customer.apellido ?? ""}`.trim()
                    : "Consumidor final";
                  return (
                    <tr
                      key={f.id}
                      onClick={() => openFactura(f)}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition"
                    >
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{String(f.id).slice(0, 8)}...</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{clienteTxt}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(f.created_at).toLocaleDateString("es-DO")}
                      </td>
                      <td className="px-4 py-3"><TipoBadge tipo={f.tipo_pago} /></td>
                      <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtMoney(f.total)}</td>
                      <td className="px-4 py-3 text-right text-xs text-red-500">
                        {Number(f.pendiente ?? 0) > 0 ? fmtMoney(f.pendiente) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight size={14} className="text-gray-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Móvil — cards */}
          <div className="lg:hidden space-y-2">
            {filtered.map((f) => {
              const clienteTxt = f.customer
                ? `${f.customer.nombre ?? ""} ${f.customer.apellido ?? ""}`.trim()
                : "Consumidor final";
              return (
                <button
                  key={f.id}
                  onClick={() => openFactura(f)}
                  className="w-full text-left bg-white border border-gray-100 rounded-2xl p-4 transition active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="font-semibold text-sm text-gray-900 truncate">{clienteTxt}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <StatusBadge status={f.status} />
                        <TipoBadge tipo={f.tipo_pago} />
                        <span className="text-[10px] text-gray-400 font-mono">{String(f.id).slice(0, 8)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(f.created_at).toLocaleString("es-DO")}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-bold text-gray-900 whitespace-nowrap">{fmtMoney(f.total)}</p>
                      {Number(f.pendiente ?? 0) > 0 && (
                        <p className="text-xs text-red-500 mt-0.5 whitespace-nowrap">Pend: {fmtMoney(f.pendiente)}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── MODAL DETALLE ── */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-end lg:items-center justify-center z-50">
          <div className="bg-white w-full lg:w-[560px] lg:rounded-3xl rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">

            {/* Header modal */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Detalle de factura</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{String(selected.id).slice(0, 8)}...</p>
              </div>
              <button onClick={closeDetail} className="w-8 h-8 grid place-items-center rounded-xl border border-gray-100">
                <X size={14} />
              </button>
            </div>

            {/* Info principal */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Cliente</p>
                  <p className="font-semibold text-gray-900">
                    {selected.customer
                      ? `${selected.customer.nombre ?? ""} ${selected.customer.apellido ?? ""}`.trim()
                      : "Consumidor final"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(selected.created_at).toLocaleString("es-DO")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={selected.status} />
                  <TipoBadge tipo={selected.tipo_pago} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Total", value: fmtMoney(selected.total), accent: true },
                  { label: "Pendiente", value: fmtMoney(selected.pendiente), danger: Number(selected.pendiente) > 0 },
                  { label: "Pagado", value: fmtMoney(selected.total_pagado) },
                  { label: "Ganancia", value: fmtMoney(selected.total_ganancia), success: true },
                ].map((m) => (
                  <div key={m.label} className="bg-white rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-400">{m.label}</p>
                    <p className={`font-semibold text-sm mt-0.5 ${m.accent ? "text-gray-900" :
                      m.danger && Number(selected.pendiente) > 0 ? "text-red-500" :
                        m.success ? "text-green-600" : "text-gray-700"
                      }`}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Productos */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Productos</p>
              {detailLoading ? (
                <p className="text-sm text-gray-400">Cargando...</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-gray-400">Sin productos.</p>
              ) : (
                <div className="space-y-2">
                  {items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between border border-gray-100 rounded-xl p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{it.nombre_producto_snapshot}</p>
                        <p className="text-xs text-gray-400">
                          {it.cantidad} × {fmtMoney(it.precio_venta_unit)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 flex-shrink-0 ml-3">{fmtMoney(it.subtotal)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Abonos */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Abonos</p>
              {detailLoading ? (
                <p className="text-sm text-gray-400">Cargando...</p>
              ) : payments.length === 0 ? (
                <p className="text-sm text-gray-400">Sin abonos registrados.</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border border-gray-100 rounded-xl p-3">
                      <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString("es-DO")}</p>
                      <p className="text-sm font-semibold text-green-600">{fmtMoney(p.monto)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="space-y-2 border-t border-gray-100 pt-4">
              {selected.tipo_pago !== "cash" && tieneAbonos && selected.status !== "cancelada" && (
                <button
                  className="w-full border border-amber-200 text-amber-700 bg-amber-50 py-3 rounded-xl text-sm font-semibold"
                  onClick={async () => {
                    const ok = confirm("¿Cancelar el último abono?");
                    if (!ok) return;
                    const { error } = await supabase.rpc("delete_last_payment", { p_invoice_id: selected.id });
                    if (error) return toast.error(error.message);
                    toast.success("Último abono cancelado ✅");
                    await openFactura(selected);
                    await fetchFacturas();
                  }}
                >
                  Cancelar último abono
                </button>
              )}

              <button
                disabled={selected.status === "cancelada" || bloqueaCancelar}
                className={`w-full py-3 rounded-xl text-sm font-semibold border transition ${selected.status === "cancelada" || bloqueaCancelar
                  ? "opacity-40 cursor-not-allowed border-gray-100 text-gray-400"
                  : "border-red-200 text-red-600 bg-red-50"
                  }`}
                onClick={async () => {
                  const ok = confirm("¿Cancelar esta factura? Se devolverá el inventario.");
                  if (!ok) return;
                  const { error } = await supabase.rpc("cancel_invoice", { p_invoice_id: selected.id });
                  if (error) return toast.error(error.message);
                  toast.success("Factura cancelada ✅");
                  closeDetail();
                  fetchFacturas();
                }}
              >
                {selected.status === "cancelada"
                  ? "Factura ya cancelada"
                  : bloqueaCancelar
                    ? "No se puede cancelar (tiene abonos)"
                    : "Cancelar factura"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}