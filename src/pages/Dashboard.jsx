import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

function fmtMoney(n) {
  const x = Number(n ?? 0);
  return `RD$ ${x.toFixed(2)}`;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function startOfNextMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
}

export default function Dashboard() {
  const nav = useNavigate();

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

  const range = useMemo(() => {
    const from = startOfMonth();
    const to = startOfNextMonth();
    return { from, to };
  }, []);

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
  }, []);

  const monthLabel = new Date().toLocaleString("es-DO", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Dashboard</h2>
          <p className="text-sm text-gray-600 capitalize">{monthLabel}</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={loadSummary} className="text-sm underline">
            Actualizar
          </button>
          <button
            className="text-sm underline"
            onClick={() => supabase.auth.signOut()}
          >
            Salir
          </button>
        </div>
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
