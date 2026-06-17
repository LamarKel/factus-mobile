import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Comprar() {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    const [proveedor, setProveedor] = useState("");
    const [searchProd, setSearchProd] = useState("");
    const [cart, setCart] = useState([]); // {product_id, nombre, codigo, precio_compra_anterior, precio_compra_nuevo, cantidad}

    const loadData = async () => {
        setLoading(true);
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user.id;

        const { data } = await supabase
            .from("products")
            .select("id,nombre,codigo,precio_compra,cantidad,unidad_medida")
            .eq("user_id", userId)
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
            const found = prev.find((x) => x.product_id === p.id);
            if (found) return prev;
            return [
                ...prev,
                {
                    product_id: p.id,
                    nombre: p.nombre,
                    codigo: p.codigo,
                    unidad_medida: p.unidad_medida,
                    precio_compra_anterior: Number(p.precio_compra ?? 0),
                    precio_compra_nuevo: String(p.precio_compra ?? ""),
                    cantidad: 1,
                },
            ];
        });
    };

    const updateItem = (product_id, field, value) => {
        setCart((prev) =>
            prev.map((x) => (x.product_id === product_id ? { ...x, [field]: value } : x))
        );
    };

    const removeFromCart = (product_id) => {
        setCart((prev) => prev.filter((x) => x.product_id !== product_id));
    };

    // Calcula la diferencia de precio para mostrar indicador
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
            if (!it.precio_compra_nuevo || Number(it.precio_compra_nuevo) < 0) {
                return setMsg(`Pon un precio de compra válido para ${it.nombre}.`);
            }
            if (!it.cantidad || it.cantidad <= 0) {
                return setMsg(`Pon una cantidad válida para ${it.nombre}.`);
            }
        }

        setSaving(true);

        const items = cart.map((it) => ({
            product_id: it.product_id,
            cantidad: it.cantidad,
            precio_compra_nuevo: Number(it.precio_compra_nuevo),
        }));

        const { error } = await supabase.rpc("create_purchase", {
            p_proveedor: proveedor.trim() || null,
            p_items: items,
        });

        setSaving(false);

        if (error) {
            setMsg(error.message);
            return;
        }

        setCart([]);
        setProveedor("");
        setMsg("Compra registrada ✅ Inventario y precios actualizados.");
        loadData();
    };

    if (loading) return <div className="p-4">Cargando...</div>;

    return (
        <div className="min-h-screen p-4 pb-28">
            <h1 className="text-2xl font-bold mb-4">Registrar Compra</h1>

            <div className="space-y-3">
                {/* Proveedor */}
                <div className="border rounded-2xl p-4 bg-white">
                    <p className="text-sm text-gray-600 mb-2">Proveedor (opcional)</p>
                    <input
                        className="w-full border rounded-xl p-3"
                        placeholder="Nombre del proveedor"
                        value={proveedor}
                        onChange={(e) => setProveedor(e.target.value)}
                    />
                </div>

                {/* Buscar productos */}
                <div className="border rounded-2xl p-4 bg-white">
                    <p className="text-sm text-gray-600 mb-2">Agregar productos comprados</p>
                    <input
                        className="w-full border rounded-xl p-3"
                        placeholder="Buscar producto..."
                        value={searchProd}
                        onChange={(e) => setSearchProd(e.target.value)}
                    />
                    <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
                        {filteredProducts.slice(0, 30).map((p) => {
                            const yaAgregado = cart.some((x) => x.product_id === p.id);
                            return (
                                <button
                                    key={p.id}
                                    disabled={yaAgregado}
                                    onClick={() => addToCart(p)}
                                    className={`w-full text-left border rounded-xl p-3 ${yaAgregado ? "opacity-40" : ""}`}
                                >
                                    <div className="flex justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold truncate">{p.nombre}</p>
                                            <p className="text-xs text-gray-600">
                                                Código: {p.codigo} · Stock: {p.cantidad ?? 0}
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            Compra actual: RD$ {Number(p.precio_compra ?? 0).toFixed(2)}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Detalle de la compra */}
                <div className="border rounded-2xl p-4 bg-white">
                    <p className="text-sm text-gray-600 mb-2">Detalle de la compra</p>

                    {cart.length === 0 ? (
                        <p className="text-sm text-gray-500">Aún no has agregado productos.</p>
                    ) : (
                        <div className="space-y-3">
                            {cart.map((it) => {
                                const dif = getDiferencia(it.precio_compra_anterior, it.precio_compra_nuevo);
                                return (
                                    <div key={it.product_id} className="border rounded-xl p-3">
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <p className="font-semibold truncate">{it.nombre}</p>
                                            <button
                                                onClick={() => removeFromCart(it.product_id)}
                                                className="text-xs text-red-500 underline"
                                            >
                                                Quitar
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Cantidad comprada</p>
                                                <input
                                                    className="w-full border rounded-xl p-2 text-sm"
                                                    inputMode="decimal"
                                                    value={it.cantidad}
                                                    onChange={(e) =>
                                                        updateItem(it.product_id, "cantidad", Number(e.target.value || 0))
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Precio compra nuevo</p>
                                                <input
                                                    className="w-full border rounded-xl p-2 text-sm"
                                                    inputMode="decimal"
                                                    value={it.precio_compra_nuevo}
                                                    onChange={(e) =>
                                                        updateItem(it.product_id, "precio_compra_nuevo", e.target.value)
                                                    }
                                                />
                                            </div>
                                        </div>

                                        {/* Indicador subió/bajó */}
                                        <div className="mt-2 flex items-center justify-between text-xs">
                                            <span className="text-gray-500">
                                                Antes: RD$ {it.precio_compra_anterior.toFixed(2)}
                                            </span>
                                            {dif && Number(dif.diff) !== 0 && (
                                                <span className={dif.diff > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                                                    {dif.diff > 0 ? "▲ Subió" : "▼ Bajó"} RD$ {Math.abs(dif.diff).toFixed(2)} ({dif.pct}%)
                                                </span>
                                            )}
                                            {dif && Number(dif.diff) === 0 && (
                                                <span className="text-gray-400">Sin cambio</span>
                                            )}
                                        </div>

                                        <div className="mt-2 text-sm text-right">
                                            Subtotal: <span className="font-semibold">
                                                RD$ {(it.cantidad * Number(it.precio_compra_nuevo || 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-4 flex justify-between items-center">
                        <p className="text-sm text-gray-600">Total compra</p>
                        <p className="text-xl font-bold">RD$ {totalCompra.toFixed(2)}</p>
                    </div>

                    {msg && (
                        <p className={`mt-3 text-sm ${msg.includes("✅") ? "text-green-600" : "text-red-600"}`}>
                            {msg}
                        </p>
                    )}

                    <button
                        disabled={saving}
                        onClick={handleGuardar}
                        className="mt-4 w-full bg-black text-white p-3 rounded-xl font-semibold disabled:opacity-60"
                    >
                        {saving ? "Guardando..." : "Registrar Compra"}
                    </button>
                </div>
            </div>
        </div>
    );
}