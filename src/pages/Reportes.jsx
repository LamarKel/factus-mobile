import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { RefreshCw, Package, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";

function fmtMoney(n) {
    return `RD$ ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function startOfDay(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function startOfNextDay(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); }
function startOfWeek(d = new Date()) {
    const x = new Date(d); const day = x.getDay();
    x.setDate(x.getDate() + ((day === 0 ? -6 : 1) - day)); return startOfDay(x);
}
function startOfNextWeek(d = new Date()) {
    const s = startOfWeek(d); return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7);
}
function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfNextMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth() + 1, 1); }

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

const STOCK_ALERTA = 5;

export default function Reportes() {
    const [loading, setLoading] = useState(true);
    const [productos, setProductos] = useState([]);
    const [summary, setSummary] = useState({ facturacion: 0, ganancia: 0, inversion: 0, facturas_count: 0 });
    const [chartData, setChartData] = useState([]);
    const [loadingChart, setLoadingChart] = useState(true);
    const [mode, setMode] = useState("mes");
    const [tab, setTab] = useState("inventario"); // inventario | ventas | ganancia

    const range = useMemo(() => {
        const now = new Date();
        if (mode === "hoy") return { from: startOfDay(now), to: startOfNextDay(now) };
        if (mode === "semana") return { from: startOfWeek(now), to: startOfNextWeek(now) };
        return { from: startOfMonth(now), to: startOfNextMonth(now) };
    }, [mode]);

    const loadData = async () => {
        setLoading(true);
        setLoadingChart(true);

        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user.id;

        // Productos para inventario y ventas
        const { data: prods } = await supabase
            .from("products")
            .select("id, nombre, codigo, categoria, cantidad, precio_compra, precio_venta, ventas, control_inventario, unidad_medida")
            .eq("user_id", userId)
            .order("nombre", { ascending: true });

        setProductos(prods ?? []);
        setLoading(false);

        // Summary de ganancia
        const { data: sum } = await supabase.rpc("dashboard_summary", {
            p_from: range.from.toISOString(),
            p_to: range.to.toISOString(),
        });
        const row = Array.isArray(sum) ? sum[0] : sum;
        setSummary({
            facturacion: row?.facturacion ?? 0,
            ganancia: row?.ganancia ?? 0,
            inversion: row?.inversion ?? 0,
            facturas_count: row?.facturas_count ?? 0,
        });

        // Gráfica por día
        const { data: invoices } = await supabase
            .from("invoices")
            .select("created_at, total_ganancia")
            .eq("user_id", userId)
            .gte("created_at", range.from.toISOString())
            .lt("created_at", range.to.toISOString())
            .order("created_at", { ascending: true });

        const grouped = {};
        (invoices ?? []).forEach((inv) => {
            const day = new Date(inv.created_at).toLocaleDateString("es-DO", { day: "2-digit", month: "short" });
            grouped[day] = (grouped[day] ?? 0) + Number(inv.total_ganancia ?? 0);
        });
        setChartData(Object.entries(grouped).map(([fecha, ganancia]) => ({ fecha, ganancia })));
        setLoadingChart(false);
    };

    useEffect(() => { loadData(); }, [range.from.getTime(), range.to.getTime()]);

    // ── Métricas de inventario ──
    const productosConStock = useMemo(() => productos.filter((p) => p.control_inventario), [productos]);

    const valorCosto = useMemo(() =>
        productosConStock.reduce((sum, p) => sum + Number(p.precio_compra ?? 0) * Number(p.cantidad ?? 0), 0),
        [productosConStock]
    );

    const valorVenta = useMemo(() =>
        productosConStock.reduce((sum, p) => sum + Number(p.precio_venta ?? 0) * Number(p.cantidad ?? 0), 0),
        [productosConStock]
    );

    const gananciaPotencial = valorVenta - valorCosto;

    const productosAlerta = useMemo(() =>
        productosConStock.filter((p) => (p.cantidad ?? 0) <= STOCK_ALERTA).sort((a, b) => (a.cantidad ?? 0) - (b.cantidad ?? 0)),
        [productosConStock]
    );

    // ── Top vendidos ──
    const topVendidos = useMemo(() =>
        [...productos].filter((p) => (p.ventas ?? 0) > 0).sort((a, b) => (b.ventas ?? 0) - (a.ventas ?? 0)).slice(0, 10),
        [productos]
    );

    const maxVentas = topVendidos[0]?.ventas ?? 1;
    const margen = summary.facturacion > 0 ? (summary.ganancia / summary.facturacion) * 100 : 0;

    return (
        <div className="p-4 lg:p-6 max-w-5xl mx-auto pb-24">

            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
                    <p className="text-xs text-gray-400 mt-0.5">Análisis de inventario y rentabilidad</p>
                </div>
                <button onClick={loadData}
                    className="w-9 h-9 grid place-items-center border border-gray-100 rounded-xl hover:bg-gray-50 transition">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* ── Tabs ── */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
                {[
                    { k: "inventario", t: "Inventario", Icon: Package },
                    { k: "ventas", t: "Más vendidos", Icon: TrendingUp },
                    { k: "ganancia", t: "Ganancia", Icon: DollarSign },
                ].map(({ k, t, Icon }) => (
                    <button key={k} onClick={() => setTab(k)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition ${tab === k ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                            }`}>
                        <Icon size={13} />
                        {t}
                    </button>
                ))}
            </div>

            {/* ══ TAB: INVENTARIO ══ */}
            {tab === "inventario" && (
                <div className="space-y-4">

                    {/* Métricas resumen */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="bg-white border border-gray-100 rounded-2xl p-4">
                            <p className="text-xs text-gray-400">Inversión en stock</p>
                            <p className="text-lg font-bold text-gray-900 mt-1">{fmtMoney(valorCosto)}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Precio de compra × cantidad</p>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4">
                            <p className="text-xs text-gray-400">Valor de venta</p>
                            <p className="text-lg font-bold text-gray-900 mt-1">{fmtMoney(valorVenta)}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Precio de venta × cantidad</p>
                        </div>
                        <div className="col-span-2 lg:col-span-1 bg-gray-900 text-white rounded-2xl p-4">
                            <p className="text-xs text-gray-400">Ganancia potencial</p>
                            <p className="text-lg font-bold mt-1">{fmtMoney(gananciaPotencial)}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Si se vende todo el inventario</p>
                        </div>
                    </div>

                    {/* Alertas de stock bajo */}
                    {productosAlerta.length > 0 && (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle size={14} className="text-amber-600" />
                                <p className="text-xs font-semibold text-amber-700">
                                    {productosAlerta.length} producto{productosAlerta.length !== 1 ? "s" : ""} con stock bajo (≤{STOCK_ALERTA})
                                </p>
                            </div>
                            <div className="space-y-2">
                                {productosAlerta.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-amber-100">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-gray-900 truncate">{p.nombre}</p>
                                            <p className="text-[10px] text-gray-400">{p.categoria || p.codigo}</p>
                                        </div>
                                        <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ml-3 ${(p.cantidad ?? 0) === 0 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
                                            }`}>
                                            {(p.cantidad ?? 0) === 0 ? "Agotado" : `${p.cantidad} uds`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tabla completa de inventario */}
                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-900">Detalle del inventario</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{productosConStock.length} productos con control de stock</p>
                        </div>

                        {/* Desktop */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-50">
                                        <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Producto</th>
                                        <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Marca</th>
                                        <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Stock</th>
                                        <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">P. Compra</th>
                                        <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">P. Venta</th>
                                        <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Val. Costo</th>
                                        <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Val. Venta</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productosConStock.map((p) => {
                                        const vc = Number(p.precio_compra ?? 0) * Number(p.cantidad ?? 0);
                                        const vv = Number(p.precio_venta ?? 0) * Number(p.cantidad ?? 0);
                                        const alerta = (p.cantidad ?? 0) <= STOCK_ALERTA;
                                        return (
                                            <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                                <td className="px-4 py-3 font-medium text-gray-900 text-xs">{p.nombre}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500">{p.categoria || "—"}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${(p.cantidad ?? 0) === 0 ? "bg-red-50 text-red-600" :
                                                        alerta ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
                                                        }`}>
                                                        {p.cantidad ?? 0}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs text-gray-500">{fmtMoney(p.precio_compra)}</td>
                                                <td className="px-4 py-3 text-right text-xs text-gray-500">{fmtMoney(p.precio_venta)}</td>
                                                <td className="px-4 py-3 text-right text-xs font-medium text-gray-900">{fmtMoney(vc)}</td>
                                                <td className="px-4 py-3 text-right text-xs font-medium text-green-600">{fmtMoney(vv)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="border-t-2 border-gray-100">
                                    <tr>
                                        <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-gray-900">Total</td>
                                        <td className="px-4 py-3 text-right text-xs font-bold text-gray-900">{fmtMoney(valorCosto)}</td>
                                        <td className="px-4 py-3 text-right text-xs font-bold text-green-600">{fmtMoney(valorVenta)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Móvil */}
                        <div className="lg:hidden divide-y divide-gray-50">
                            {productosConStock.map((p) => {
                                const vc = Number(p.precio_compra ?? 0) * Number(p.cantidad ?? 0);
                                const vv = Number(p.precio_venta ?? 0) * Number(p.cantidad ?? 0);
                                const alerta = (p.cantidad ?? 0) <= STOCK_ALERTA;
                                return (
                                    <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-900 truncate">{p.nombre}</p>
                                            <p className="text-[10px] text-gray-400">{p.categoria || p.codigo}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${(p.cantidad ?? 0) === 0 ? "bg-red-50 text-red-600" :
                                                    alerta ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
                                                    }`}>{p.cantidad ?? 0} uds</span>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-[10px] text-gray-400">Costo: {fmtMoney(vc)}</p>
                                            <p className="text-[10px] text-green-600 font-medium">Venta: {fmtMoney(vv)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ══ TAB: MÁS VENDIDOS ══ */}
            {tab === "ventas" && (
                <div className="space-y-4">
                    {topVendidos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                                <TrendingUp size={20} className="text-gray-400" />
                            </div>
                            <p className="font-medium text-gray-900 text-sm">Sin datos de ventas</p>
                            <p className="text-xs text-gray-400 mt-1">Las ventas se registran automáticamente al facturar</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-xs font-semibold text-gray-900">Top {topVendidos.length} productos más vendidos</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Basado en unidades facturadas</p>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {topVendidos.map((p, i) => {
                                    const pct = Math.round(((p.ventas ?? 0) / maxVentas) * 100);
                                    return (
                                        <div key={p.id} className="px-4 py-3">
                                            <div className="flex items-center gap-3 mb-1.5">
                                                <span className="text-xs font-bold text-gray-300 w-5 flex-shrink-0">#{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-900 truncate">{p.nombre}</p>
                                                    <p className="text-[10px] text-gray-400">{p.categoria || p.codigo}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-xs font-bold text-gray-900">{p.ventas ?? 0}</p>
                                                    <p className="text-[10px] text-gray-400">unidades</p>
                                                </div>
                                            </div>
                                            <div className="ml-8 w-full bg-gray-100 rounded-full h-1.5">
                                                <div className="bg-gray-900 h-1.5 rounded-full transition-all"
                                                    style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══ TAB: GANANCIA ══ */}
            {tab === "ganancia" && (
                <div className="space-y-4">

                    {/* Filtros período */}
                    <div className="flex gap-2">
                        {[{ k: "hoy", t: "Hoy" }, { k: "semana", t: "Semana" }, { k: "mes", t: "Mes" }].map((x) => (
                            <button key={x.k} onClick={() => setMode(x.k)}
                                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${mode === x.k ? "bg-gray-900 text-white border-gray-900" : "border-gray-100 text-gray-600"
                                    }`}>
                                {x.t}
                            </button>
                        ))}
                    </div>

                    {/* Métricas */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="bg-white border border-gray-100 rounded-2xl p-4">
                            <p className="text-xs text-gray-400">Facturación</p>
                            <p className="text-lg font-bold text-gray-900 mt-1">{fmtMoney(summary.facturacion)}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{summary.facturas_count} facturas</p>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4">
                            <p className="text-xs text-gray-400">Inversión</p>
                            <p className="text-lg font-bold text-gray-900 mt-1">{fmtMoney(summary.inversion)}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Costo de lo vendido</p>
                        </div>
                        <div className="col-span-2 lg:col-span-1 bg-gray-900 text-white rounded-2xl p-4">
                            <p className="text-xs text-gray-400">Ganancia</p>
                            <p className="text-lg font-bold mt-1">{fmtMoney(summary.ganancia)}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Margen: {margen.toFixed(1)}%</p>
                        </div>
                    </div>

                    {/* Gráfica */}
                    <div className="bg-white border border-gray-100 rounded-2xl p-4">
                        <p className="text-xs font-semibold text-gray-900 mb-4">Ganancia por día</p>
                        {loadingChart ? (
                            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Cargando...</div>
                        ) : chartData.length === 0 ? (
                            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Sin datos en este período</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={chartData} barSize={28}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb" }} />
                                    <Bar dataKey="ganancia" fill="#111827" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}