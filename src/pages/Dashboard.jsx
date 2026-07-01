import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";

// ── Helpers de fecha ─────────────────────────────────────
function fmtMoney(n) {
  return `RD$ ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function startOfNextDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
}
function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  return startOfDay(x);
}
function startOfNextWeek(d = new Date()) {
  const s = startOfWeek(d);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7, 0, 0, 0, 0);
}
function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function startOfNextMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
}

// ── Componente de métrica ────────────────────────────────
function MetricCard({ label, value, sub, delta, loading, accent }) {
  const isPositive = delta >= 0;
  return (
    <div className={`rounded-2xl border bg-white p-4 flex flex-col gap-1 ${accent ? "border-gray-900" : "border-gray-100"}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 leading-tight">
        {loading ? <span className="text-gray-300">···</span> : value}
      </p>
      {sub && !loading && (
        <p className="text-xs text-gray-400">{sub}</p>
      )}
      {delta !== null && delta !== undefined && !loading && (
        <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${isPositive ? "text-green-600" : "text-red-500"}`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isPositive ? "+" : ""}{Number(delta ?? 0).toFixed(1)}% vs período anterior
        </div>
      )}
    </div>
  );
}

// ── Tooltip personalizado para la gráfica ───────────────
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm text-xs">
        <p className="text-gray-500 mb-1">{label}</p>
        <p className="font-semibold text-gray-900">{fmtMoney(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [loadingPrev, setLoadingPrev] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);

  const [summary, setSummary] = useState({
    facturacion: 0, cobrado: 0, pendiente: 0,
    inversion: 0, ganancia: 0, facturas_count: 0,
  });
  const [prevSummary, setPrevSummary] = useState({
    facturacion: 0, ganancia: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState("mes");
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const range = useMemo(() => {
    const now = new Date();
    if (mode === "hoy") return { from: startOfDay(now), to: startOfNextDay(now) };
    if (mode === "semana") return { from: startOfWeek(now), to: startOfNextWeek(now) };
    if (mode === "mes") return { from: startOfMonth(now), to: startOfNextMonth(now) };
    const f = new Date(fromDate + "T00:00:00");
    const t = new Date(toDate + "T00:00:00");
    return { from: f, to: new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1) };
  }, [mode, fromDate, toDate]);

  // Rango anterior (mismo período pero antes)
  const prevRange = useMemo(() => {
    const diff = range.to.getTime() - range.from.getTime();
    return {
      from: new Date(range.from.getTime() - diff),
      to: range.from,
    };
  }, [range]);

  const headerLabel = useMemo(() => {
    if (mode === "hoy") return "Hoy";
    if (mode === "semana") return "Esta semana";
    if (mode === "mes") return new Date().toLocaleString("es-DO", { month: "long", year: "numeric" });
    return `${new Date(fromDate).toLocaleDateString("es-DO")} → ${new Date(toDate).toLocaleDateString("es-DO")}`;
  }, [mode, fromDate, toDate]);

  const loadData = async () => {
    setLoading(true);
    setLoadingPrev(true);
    setLoadingChart(true);
    setMsg("");

    // 1. Summary actual
    const { data, error } = await supabase.rpc("dashboard_summary", {
      p_from: range.from.toISOString(),
      p_to: range.to.toISOString(),
    });

    if (error) { setMsg(error.message); setLoading(false); return; }

    const row = Array.isArray(data) ? data[0] : data;
    setSummary({
      facturacion: row?.facturacion ?? 0,
      cobrado: row?.cobrado ?? 0,
      pendiente: row?.pendiente ?? 0,
      inversion: row?.inversion ?? 0,
      ganancia: row?.ganancia ?? 0,
      facturas_count: row?.facturas_count ?? 0,
    });
    setLoading(false);

    // 2. Summary período anterior (para deltas)
    const { data: prevData } = await supabase.rpc("dashboard_summary", {
      p_from: prevRange.from.toISOString(),
      p_to: prevRange.to.toISOString(),
    });

    const prevRow = Array.isArray(prevData) ? prevData[0] : prevData;
    setPrevSummary({
      facturacion: prevRow?.facturacion ?? 0,
      ganancia: prevRow?.ganancia ?? 0,
    });
    setLoadingPrev(false);

    // 3. Facturas por día para la gráfica
    const { data: userData } = await supabase.auth.getUser();
    const { data: invoices } = await supabase
      .from("invoices")
      .select("created_at, total")
      .eq("user_id", userData.user.id)
      .gte("created_at", range.from.toISOString())
      .lt("created_at", range.to.toISOString())
      .order("created_at", { ascending: true });

    // Agrupar por día
    const grouped = {};
    (invoices ?? []).forEach((inv) => {
      const day = new Date(inv.created_at).toLocaleDateString("es-DO", {
        day: "2-digit", month: "short"
      });
      grouped[day] = (grouped[day] ?? 0) + Number(inv.total);
    });

    setChartData(
      Object.entries(grouped).map(([fecha, total]) => ({ fecha, total }))
    );
    setLoadingChart(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from.getTime(), range.to.getTime()]);

  // Deltas
  const deltaFacturacion = prevSummary.facturacion > 0
    ? ((summary.facturacion - prevSummary.facturacion) / prevSummary.facturacion) * 100
    : null;

  const deltaGanancia = prevSummary.ganancia > 0
    ? ((summary.ganancia - prevSummary.ganancia) / prevSummary.ganancia) * 100
    : null;

  // Barra de progreso cobrado/pendiente
  const pctCobrado = summary.facturacion > 0
    ? Math.min((summary.cobrado / summary.facturacion) * 100, 100)
    : 0;

  // Margen de ganancia %
  const margen = summary.facturacion > 0
    ? (summary.ganancia / summary.facturacion) * 100
    : 0;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 capitalize">{headerLabel}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {range.from.toLocaleDateString("es-DO")} → {new Date(range.to.getTime() - 1).toLocaleDateString("es-DO")}
          </p>
        </div>
        <button
          onClick={loadData}
          className="w-9 h-9 grid place-items-center border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          aria-label="Actualizar"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Filtros de período ── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-3 mb-4">
        <div className="grid grid-cols-4 gap-2">
          {[
            { k: "hoy", t: "Hoy" },
            { k: "semana", t: "Semana" },
            { k: "mes", t: "Mes" },
            { k: "rango", t: "Rango" },
          ].map((x) => (
            <button
              key={x.k}
              onClick={() => setMode(x.k)}
              className={
                "py-2 rounded-xl text-sm transition font-medium " +
                (mode === x.k
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-50")
              }
            >
              {x.t}
            </button>
          ))}
        </div>

        {mode === "rango" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Desde</p>
              <input type="date" className="w-full border border-gray-100 rounded-xl p-2 text-sm"
                value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Hasta</p>
              <input type="date" className="w-full border border-gray-100 rounded-xl p-2 text-sm"
                value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {msg && (
        <div className="mb-4 p-3 border border-red-100 rounded-xl text-sm text-red-600 bg-red-50">
          {msg}
        </div>
      )}

      {/* ── Métricas principales ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard
          label="Facturación"
          value={fmtMoney(summary.facturacion)}
          sub={`${summary.facturas_count} factura${summary.facturas_count !== 1 ? "s" : ""}`}
          delta={!loadingPrev ? deltaFacturacion : undefined}
          loading={loading}
          accent
        />
        <MetricCard
          label="Ganancia"
          value={fmtMoney(summary.ganancia)}
          sub={`Margen: ${margen.toFixed(1)}%`}
          delta={!loadingPrev ? deltaGanancia : undefined}
          loading={loading}
        />
        <MetricCard
          label="Inversión"
          value={fmtMoney(summary.inversion)}
          loading={loading}
        />
        <MetricCard
          label="Facturas"
          value={summary.facturas_count}
          loading={loading}
        />
      </div>

      {/* ── Barra cobrado / pendiente ── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-medium text-gray-900">Cobros</p>
          <p className="text-xs text-gray-400">{pctCobrado.toFixed(0)}% cobrado</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 mb-3">
          <div
            className="bg-gray-900 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${pctCobrado}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-400">Cobrado</p>
            <p className="text-base font-semibold text-green-600">
              {loading ? "···" : fmtMoney(summary.cobrado)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Pendiente</p>
            <p className="text-base font-semibold text-red-500">
              {loading ? "···" : fmtMoney(summary.pendiente)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Gráfica de ventas por día ── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <p className="text-sm font-medium text-gray-900 mb-4">Ventas por día</p>
        {loadingChart ? (
          <div className="h-48 flex items-center justify-center text-gray-300 text-sm">
            Cargando gráfica...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-300 text-sm">
            No hay ventas en este período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb" }} />
              <Bar dataKey="total" fill="#111827" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}