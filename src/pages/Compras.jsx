import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Search, X, TrendingUp, TrendingDown, ShoppingBag } from "lucide-react";

export default function Comprar() {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const [proveedor, setProveedor] = useState("");
    const [searchProd, setSearchProd] = useState("");
    const [cart, setCart] = useState([]);

    const loadData = async () => {
        setLoading(true);
        const { data: userData } = await supabase.auth.getUser();
        const { data } = await supabase
            .from("products")
            .select("id,nombre,codigo,precio_compra,cantidad,unidad_medida,imagen_url,categoria")
            .eq("user_id", userData.user.id)
            .order("nombre", { ascending: true });
        setProductos(data ?? []);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const filteredProducts = useMemo(() => {
        const s = searchProd.trim().toLowerCase();
        if (!s) return productos;
        return productos.filter((p) => `${p.nombre} ${p.codigo}`.toLowerCase().includes(s));
    }, [productos, searchProd]);

    const totalCompra = useMemo(() =>
        cart.reduce((acc, it) => acc + it.cantidad * Number(it.precio_compra_nuevo || 0), 0),
        [cart]
    );

    const addToCart = (p) => {
        setMsg("");
        setCart((prev) => {
            if (prev.find((x) => x.product_id === p.id)) return prev;
            return [...prev, {
                product_id: p.id, nombre: p.nombre, codigo: p.codigo,
                unidad_medida: p.unidad_medida, imagen_url: p.imagen_url,
                precio_compra_anterior: Number(p.precio_compra ?? 0),
                precio_compra_nuevo: String(p.precio_compra ?? ""),
                cantidad: 1,
            }];
        });
    };

    const updateItem = (product_id, field, value) => {
        setCart((prev) => prev.map((x) => x.product_id === product_id ? { ...x, [field]: value } : x));
    };

    const removeFromCart = (product_id) => {
        setCart((prev) => prev.filter((x) => x.product_id !== product_id));
    };

    const getDiferencia = (anterior, nuevo) => {
        const n = Number(nuevo);
        if (Number.isNaN(n) || anterior === 0) return null;
        const diff = n - anterior;
        const pct = ((diff / anterior) * 100).toFixed(1);
        return { diff, pct };
    };

    const handleGuardar = async () => {
        setMsg("");
        if (cart.length === 0) return setMsg("Agrega al menos un producto.");
        for (const it of cart) {
            if (!it.precio_compra_nuevo || Number(it.precio_compra_nuevo) < 0)
                return setMsg(`Precio inválido para ${it.nombre}.`);
            if (!it.cantidad || it.cantidad <= 0)
                return setMsg(`Cantidad inválida para ${it.nombre}.`);
        }
        setSaving(true);
        const { error } = await supabase.rpc("create_purchase", {
            p_proveedor: proveedor.trim() || null,
            p_items: cart.map((it) => ({
                product_id: it.product_id,
                cantidad: it.cantidad,
                precio_compra_nuevo: Number(it.precio_compra_nuevo),
            })),
        });
        setSaving(false);
        if (error) { setMsg(error.message); return; }
        setCart([]);
        setProveedor("");
        setMsg("✅ Compra registrada. Inventario y precios actualizados.");
        loadData();
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>
    );

    return (
        <div className="p-4 lg:p-6 max-w-5xl mx-auto pb-28">

            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Registrar compra</h1>
                    <p className="text-xs text-gray-400 mt-0.5">Actualiza inventario y precios de costo</p>
                </div>
            </div>

            <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6">

                {/* ── Panel izquierdo — buscar productos ── */}
                <div className="space-y-3">

                    {/* Proveedor */}
                    <div className="bg-white border border-gray-100 rounded-2xl p-4">
                        <label className="text-xs text-gray-500 font-medium block mb-2">Proveedor (opcional)</label>
                        <input
                            className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                            placeholder="Nombre del proveedor"
                            value={proveedor}
                            onChange={(e) => setProveedor(e.target.value)}
                        />
                    </div>

                    {/* Buscador */}
                    <div className="bg-white border border-gray-100 rounded-2xl p-4">
                        <p className="text-xs text-gray-500 font-medium mb-3">Selecciona los productos comprados</p>
                        <div className="relative mb-3">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                className="w-full pl-9 pr-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-gray-300"
                                placeholder="Buscar producto..."
                                value={searchProd}
                                onChange={(e) => setSearchProd(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {filteredProducts.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">No se encontraron productos</p>
                            ) : filteredProducts.slice(0, 40).map((p) => {
                                const yaAgregado = cart.some((x) => x.product_id === p.id);
                                return (
                                    <button
                                        key={p.id}
                                        disabled={yaAgregado}
                                        onClick={() => addToCart(p)}
                                        className={`w-full text-left border rounded-xl p-3 transition ${yaAgregado
                                            ? "border-gray-900 bg-gray-50 opacity-60"
                                            : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                                {p.imagen_url ? (
                                                    <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover"
                                                        onError={(e) => { e.target.style.display = "none"; }} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-base">🌸</div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{p.nombre}</p>
                                                <p className="text-xs text-gray-400">
                                                    Stock: {p.cantidad ?? 0} · Compra: RD$ {Number(p.precio_compra ?? 0).toFixed(2)}
                                                </p>
                                            </div>
                                            {yaAgregado && (
                                                <span className="text-[10px] bg-gray-900 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                                                    Agregado
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Panel derecho — detalle compra ── */}
                <div className="mt-3 lg:mt-0">
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 lg:sticky lg:top-20">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-gray-900">
                                Detalle {cart.length > 0 && <span className="text-gray-400 font-normal">({cart.length})</span>}
                            </p>
                            {cart.length > 0 && (
                                <button onClick={() => setCart([])}
                                    className="text-xs text-red-500 hover:underline">
                                    Limpiar
                                </button>
                            )}
                        </div>

                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-2">
                                    <ShoppingBag size={18} className="text-gray-400" />
                                </div>
                                <p className="text-sm text-gray-400">Selecciona productos</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4">
                                {cart.map((it) => {
                                    const dif = getDiferencia(it.precio_compra_anterior, it.precio_compra_nuevo);
                                    return (
                                        <div key={it.product_id} className="border border-gray-100 rounded-xl p-3">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                        {it.imagen_url ? (
                                                            <img src={it.imagen_url} alt={it.nombre} className="w-full h-full object-cover"
                                                                onError={(e) => { e.target.style.display = "none"; }} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs">🌸</div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-semibold text-gray-900 truncate">{it.nombre}</p>
                                                </div>
                                                <button onClick={() => removeFromCart(it.product_id)}>
                                                    <X size={14} className="text-gray-400" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 mb-1">Cantidad</p>
                                                    <input
                                                        className="w-full border border-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:border-gray-300 text-center"
                                                        inputMode="decimal" value={it.cantidad}
                                                        onChange={(e) => updateItem(it.product_id, "cantidad", Number(e.target.value || 0))}
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 mb-1">Precio compra</p>
                                                    <input
                                                        className="w-full border border-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:border-gray-300 text-center"
                                                        inputMode="decimal" value={it.precio_compra_nuevo}
                                                        onChange={(e) => updateItem(it.product_id, "precio_compra_nuevo", e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            {/* Indicador precio */}
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="text-gray-400">Antes: RD$ {it.precio_compra_anterior.toFixed(2)}</span>
                                                {dif && Number(dif.diff) !== 0 && (
                                                    <span className={`flex items-center gap-0.5 font-semibold ${dif.diff > 0 ? "text-red-500" : "text-green-600"}`}>
                                                        {dif.diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                        {dif.diff > 0 ? "+" : ""}{dif.pct}%
                                                    </span>
                                                )}
                                                {dif && Number(dif.diff) === 0 && <span className="text-gray-300">Sin cambio</span>}
                                            </div>

                                            <div className="text-right text-xs text-gray-500 mt-1">
                                                Sub: <span className="font-semibold text-gray-900">
                                                    RD$ {(it.cantidad * Number(it.precio_compra_nuevo || 0)).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Total y botón */}
                        {cart.length > 0 && (
                            <>
                                <div className="flex justify-between items-center border-t border-gray-100 pt-3 mb-3">
                                    <span className="text-sm font-semibold text-gray-900">Total compra</span>
                                    <span className="text-lg font-bold text-gray-900">RD$ {totalCompra.toFixed(2)}</span>
                                </div>

                                {msg && (
                                    <p className={`text-xs mb-3 ${msg.includes("✅") ? "text-green-600" : "text-red-500"}`}>{msg}</p>
                                )}

                                <button
                                    disabled={saving}
                                    onClick={handleGuardar}
                                    className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition"
                                >
                                    {saving ? "Registrando..." : `Registrar compra · RD$ ${totalCompra.toFixed(2)}`}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}