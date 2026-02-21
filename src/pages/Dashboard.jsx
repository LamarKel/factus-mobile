import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";


function fmtMoney(n) {
  const x = Number(n ?? 0);
  return `RD$ ${x.toFixed(2)}`;
}
function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function startOfNextDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
}
function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay(); // 0 domingo
  const diff = (day === 0 ? -6 : 1) - day; // lunes como inicio
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

export default function Dashboard() {

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    facturacion: 0,
    cobrado: 0,
    pendiente: 0,
    inversion: 0,
    ganancia: 0,
    facturas_count: 0,
  });
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState("mes"); // hoy | semana | mes | rango
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const range = useMemo(() => {
    const now = new Date();

    if (mode === "hoy") {
      return { from: startOfDay(now), to: startOfNextDay(now), label: "Hoy" };
    }
    if (mode === "semana") {
      return { from: startOfWeek(now), to: startOfNextWeek(now), label: "Esta semana" };
    }
    if (mode === "mes") {
      return { from: startOfMonth(now), to: startOfNextMonth(now), label: "Este mes" };
    }

    // rango personalizado (to exclusivo: +1 día)
    const f = new Date(fromDate + "T00:00:00");
    const t = new Date(toDate + "T00:00:00");
    const tPlus = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1, 0, 0, 0, 0);
    return { from: f, to: tPlus, label: "Rango" };
  }, [mode, fromDate, toDate]);

  const loadSummary = async () => {
    setLoading(true);
    setMsg("");

    const { data, error } = await supabase.rpc("dashboard_summary", {
      p_from: range.from.toISOString(),
      p_to: range.to.toISOString(),
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    // data viene como array con 1 fila
    const row = Array.isArray(data) ? data[0] : data;
    setSummary({
      facturacion: row?.facturacion ?? 0,
      cobrado: row?.cobrado ?? 0,
      pendiente: row?.pendiente ?? 0,
      inversion: row?.inversion ?? 0,
      ganancia: row?.ganancia ?? 0,
      facturas_count: row?.facturas_count ?? 0,
    });
  };

 useEffect(() => {
  loadSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [range.from.getTime(), range.to.getTime()]);

  const headerLabel =
  mode === "hoy"
    ? "Hoy"
    : mode === "semana"
    ? "Esta semana"
    : mode === "mes"
    ? new Date().toLocaleString("es-DO", { month: "long", year: "numeric" })
    : "Rango";

  return (
    <div className="min-h-screen ">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Dashboard</h2>
          <p className="text-sm text-gray-600 capitalize">{headerLabel}</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={loadSummary} className="text-sm underline">
            Actualizar
          </button>
         
        </div>
      </div>
      <div className="mt-3 border rounded-2xl bg-white p-3">
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
                "p-2 rounded-xl border text-sm transition " +
                (mode === x.k ? "bg-black text-white border-black" : "bg-white")
              }
            >
              {x.t}
            </button>
          ))}
        </div>

        {mode === "rango" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-600 mb-1">Desde</p>
              <input
                type="date"
                className="w-full border rounded-xl p-2"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Hasta</p>
              <input
                type="date"
                className="w-full border rounded-xl p-2"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <p className="mt-2 text-xs text-gray-600">
          {range.from.toLocaleDateString()} → {new Date(range.to.getTime() - 1).toLocaleDateString()}
        </p>
      </div>

      {msg && (
        <div className="mt-4 p-3 border rounded-xl text-sm text-red-600">
          {msg}
        </div>
      )}

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl border p-4 bg-white">
          <p className="text-sm text-gray-600">Facturación</p>
          <p className="text-2xl font-bold">{loading ? "..." : fmtMoney(summary.facturacion)}</p>
          <p className="text-xs text-gray-600 mt-1">
            Facturas: {loading ? "..." : summary.facturas_count}
          </p>
        </div>

        <div className="rounded-2xl border p-4 bg-white">
          <p className="text-sm text-gray-600">Cobrado</p>
          <p className="text-2xl font-bold">{loading ? "..." : fmtMoney(summary.cobrado)}</p>
        </div>

        <div className="rounded-2xl border p-4 bg-white">
          <p className="text-sm text-gray-600">Pendiente por cobrar</p>
          <p className="text-2xl font-bold">{loading ? "..." : fmtMoney(summary.pendiente)}</p>
        </div>

        <div className="rounded-2xl border p-4 bg-white">
          <p className="text-sm text-gray-600">Inversión (costo)</p>
          <p className="text-2xl font-bold">{loading ? "..." : fmtMoney(summary.inversion)}</p>
        </div>

        <div className="rounded-2xl border p-4 bg-white">
          <p className="text-sm text-gray-600">Ganancia</p>
          <p className="text-2xl font-bold">{loading ? "..." : fmtMoney(summary.ganancia)}</p>
        </div>
      </div>

      {/* Acciones rápidas */}

    </div>
  );
}
