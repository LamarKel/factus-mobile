import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import imageCompression from "browser-image-compression";
import { Search, X, Package2, Boxes, Upload, Plus } from "lucide-react";

export default function Combos() {
    const [tab, setTab] = useState("crear"); // crear | mis

    const [productos, setProductos] = useState([]); // productos base (no combos)
    const [combos, setCombos] = useState([]); // productos que son combo
    const [comboItems, setComboItems] = useState([]); // recetas de todos los combos
    const [loading, setLoading] = useState(true);

    const [searchProd, setSearchProd] = useState("");
    const [receta, setReceta] = useState([]); // [{product_id, nombre, codigo, imagen_url, precio_compra, cantidad}]

    const [nombre, setNombre] = useState("");
    const [codigo, setCodigo] = useState("");
    const [categoria, setCategoria] = useState("");
    const [unidadMedida, setUnidadMedida] = useState("");
    const [precioVenta, setPrecioVenta] = useState("");
    const [cantidadArmar, setCantidadArmar] = useState("1");
    const [imagenUrl, setImagenUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    const [armarId, setArmarId] = useState(null);
    const [armarCantidad, setArmarCantidad] = useState("1");
    const [armando, setArmando] = useState(false);
    const [armarMsg, setArmarMsg] = useState("");

    const loadData = async () => {
        setLoading(true);
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user.id;

        const [prodRes, comboRes, itemsRes] = await Promise.all([
            supabase.from("products")
                .select("id,nombre,codigo,precio_compra,precio_venta,cantidad,control_inventario,imagen_url,categoria")
                .eq("user_id", userId).eq("es_combo", false).order("nombre", { ascending: true }),
            supabase.from("products")
                .select("id,nombre,codigo,precio_compra,precio_venta,cantidad,imagen_url,categoria")
                .eq("user_id", userId).eq("es_combo", true).order("created_at", { ascending: false }),
            supabase.from("combo_items").select("combo_product_id,component_product_id,cantidad").eq("user_id", userId),
        ]);

        setProductos(prodRes.data ?? []);
        setCombos(comboRes.data ?? []);
        setComboItems(itemsRes.data ?? []);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const filteredProductos = useMemo(() => {
        const s = searchProd.trim().toLowerCase();
        if (!s) return productos;
        return productos.filter((p) => `${p.nombre} ${p.codigo}`.toLowerCase().includes(s));
    }, [productos, searchProd]);

    const productosById = useMemo(() => {
        const map = {};
        productos.forEach((p) => { map[p.id] = p; });
        return map;
    }, [productos]);

    const recetaDe = (comboId) => comboItems.filter((i) => i.combo_product_id === comboId);

    const costeoSugerido = useMemo(() =>
        receta.reduce((acc, it) => acc + it.cantidad * Number(it.precio_compra || 0), 0),
        [receta]
    );

    const agregarAReceta = (p) => {
        setMsg("");
        setReceta((prev) => {
            if (prev.find((x) => x.product_id === p.id)) return prev;
            return [...prev, {
                product_id: p.id, nombre: p.nombre, codigo: p.codigo,
                imagen_url: p.imagen_url, precio_compra: Number(p.precio_compra ?? 0),
                cantidad: 1,
            }];
        });
    };

    const quitarDeReceta = (product_id) => {
        setReceta((prev) => prev.filter((x) => x.product_id !== product_id));
    };

    const updateRecetaCantidad = (product_id, cantidad) => {
        setReceta((prev) => prev.map((x) => x.product_id === product_id ? { ...x, cantidad } : x));
    };

    const subirImagen = async (file) => {
        setUploading(true);
        try {
            const opciones = { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true, fileType: "image/webp" };
            const compressed = await imageCompression(file, opciones);
            const fileName = `combo_${Date.now()}.webp`;
            const { error } = await supabase.storage.from("imagen").upload(fileName, compressed, { upsert: true, contentType: "image/webp" });
            if (error) throw error;
            const { data } = supabase.storage.from("imagen").getPublicUrl(fileName);
            setImagenUrl(data.publicUrl);
        } catch (err) {
            setMsg("No se pudo subir la imagen: " + err.message);
        }
        setUploading(false);
    };

    const resetForm = () => {
        setReceta([]); setNombre(""); setCodigo(""); setCategoria("");
        setUnidadMedida(""); setPrecioVenta(""); setCantidadArmar("1"); setImagenUrl("");
    };

    const crearCombo = async () => {
        setMsg("");
        if (!nombre.trim() || !codigo.trim()) return setMsg("Pon nombre y código del combo.");
        if (receta.length < 2) return setMsg("Agrega al menos 2 productos al combo.");
        if (!precioVenta || Number(precioVenta) <= 0) return setMsg("Pon un precio de venta válido.");
        const cant = Number(cantidadArmar || 0);
        if (Number.isNaN(cant) || cant < 0) return setMsg("Cantidad a armar inválida.");

        setSaving(true);
        const { error } = await supabase.rpc("create_combo", {
            p_nombre: nombre.trim(),
            p_codigo: codigo.trim(),
            p_precio_venta: Number(precioVenta),
            p_items: receta.map((it) => ({ product_id: it.product_id, cantidad: Number(it.cantidad) })),
            p_cantidad_armar: cant,
            p_imagen_url: imagenUrl || null,
            p_categoria: categoria.trim() || null,
            p_unidad_medida: unidadMedida.trim() || null,
        });
        setSaving(false);

        if (error) {
            setMsg(String(error.message).toLowerCase().includes("duplicate") ? "Ese código ya existe." : error.message);
            return;
        }
        setMsg("✅ Combo creado.");
        resetForm();
        loadData();
        setTab("mis");
    };

    const abrirArmar = (combo) => {
        setArmarId(combo.id);
        setArmarCantidad("1");
        setArmarMsg("");
    };

    const confirmarArmar = async (combo) => {
        setArmarMsg("");
        const cant = Number(armarCantidad);
        if (!cant || cant <= 0) return setArmarMsg("Cantidad inválida.");
        setArmando(true);
        const { error } = await supabase.rpc("armar_combo", {
            p_combo_product_id: combo.id,
            p_cantidad: cant,
        });
        setArmando(false);
        if (error) { setArmarMsg(error.message); return; }
        setArmarId(null);
        loadData();
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>
    );

    return (
        <div className="p-4 lg:p-6 max-w-5xl mx-auto pb-28">
            <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-900">Combos</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                    Arma paquetes con varios productos de tu inventario y véndelos como uno solo.
                </p>
            </div>

            <div className="flex gap-2 mb-4 border-b border-gray-100">
                {[{ k: "crear", t: "Crear combo" }, { k: "mis", t: `Mis combos (${combos.length})` }].map((x) => (
                    <button key={x.k} onClick={() => setTab(x.k)}
                        className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === x.k ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400"}`}>
                        {x.t}
                    </button>
                ))}
            </div>

            {tab === "crear" && (
                <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6">
                    {/* ── Panel izquierdo — buscar productos ── */}
                    <div className="space-y-3">
                        <div className="bg-white border border-gray-100 rounded-2xl p-4">
                            <p className="text-xs text-gray-500 font-medium mb-3">Selecciona los productos del combo</p>
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
                                {filteredProductos.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">No se encontraron productos</p>
                                ) : filteredProductos.slice(0, 40).map((p) => {
                                    const yaAgregado = receta.some((x) => x.product_id === p.id);
                                    return (
                                        <button
                                            key={p.id}
                                            disabled={yaAgregado}
                                            onClick={() => agregarAReceta(p)}
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
                                                        <div className="w-full h-full flex items-center justify-center text-base">📦</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{p.nombre}</p>
                                                    <p className="text-xs text-gray-400">
                                                        Stock: {p.cantidad ?? 0} · Costo: RD$ {Number(p.precio_compra ?? 0).toFixed(2)}
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

                    {/* ── Panel derecho — detalle combo ── */}
                    <div className="mt-3 lg:mt-0 space-y-3">
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 lg:sticky lg:top-20">
                            <p className="text-sm font-semibold text-gray-900 mb-3">
                                Receta {receta.length > 0 && <span className="text-gray-400 font-normal">({receta.length})</span>}
                            </p>

                            {receta.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-2">
                                        <Boxes size={18} className="text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-400">Elige al menos 2 productos</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-56 overflow-y-auto mb-3">
                                    {receta.map((it) => (
                                        <div key={it.product_id} className="border border-gray-100 rounded-xl p-2.5 flex items-center gap-2">
                                            <p className="flex-1 text-xs font-medium text-gray-900 truncate">{it.nombre}</p>
                                            <input
                                                className="w-14 border border-gray-100 rounded-lg p-1.5 text-xs text-center focus:outline-none focus:border-gray-300"
                                                inputMode="decimal" value={it.cantidad}
                                                onChange={(e) => updateRecetaCantidad(it.product_id, Number(e.target.value || 0))}
                                            />
                                            <button onClick={() => quitarDeReceta(it.product_id)}>
                                                <X size={14} className="text-gray-400" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {receta.length > 0 && (
                                <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-100 pt-2 mb-3">
                                    <span>Costeo sugerido</span>
                                    <span className="font-semibold text-gray-900">RD$ {costeoSugerido.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <input className="w-full border border-gray-100 rounded-xl p-2.5 text-sm focus:outline-none focus:border-gray-300"
                                    placeholder="Nombre del combo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                                <div className="grid grid-cols-2 gap-2">
                                    <input className="w-full border border-gray-100 rounded-xl p-2.5 text-sm focus:outline-none focus:border-gray-300"
                                        placeholder="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
                                    <input className="w-full border border-gray-100 rounded-xl p-2.5 text-sm focus:outline-none focus:border-gray-300"
                                        placeholder="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <input className="w-full border border-gray-100 rounded-xl p-2.5 text-sm focus:outline-none focus:border-gray-300"
                                        placeholder="Precio de venta" inputMode="decimal" value={precioVenta}
                                        onChange={(e) => setPrecioVenta(e.target.value)} />
                                    <input className="w-full border border-gray-100 rounded-xl p-2.5 text-sm focus:outline-none focus:border-gray-300"
                                        placeholder="Cantidad a armar" inputMode="decimal" value={cantidadArmar}
                                        onChange={(e) => setCantidadArmar(e.target.value)} />
                                </div>

                                <label className="flex items-center gap-2 border border-dashed border-gray-200 rounded-xl p-2.5 text-xs text-gray-500 cursor-pointer">
                                    <Upload size={14} />
                                    {uploading ? "Subiendo..." : imagenUrl ? "Foto lista ✓" : "Foto del combo (opcional)"}
                                    <input type="file" accept="image/*" className="hidden"
                                        onChange={(e) => e.target.files[0] && subirImagen(e.target.files[0])} />
                                </label>
                            </div>

                            {msg && (
                                <p className={`text-xs mt-3 ${msg.includes("✅") ? "text-green-600" : "text-red-500"}`}>{msg}</p>
                            )}

                            <button
                                disabled={saving || uploading}
                                onClick={crearCombo}
                                className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition mt-3"
                            >
                                {saving ? "Creando..." : "Crear combo"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {tab === "mis" && (
                <div className="space-y-3">
                    {combos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                                <Package2 size={20} className="text-gray-400" />
                            </div>
                            <p className="text-sm text-gray-400">Todavía no tienes combos creados</p>
                        </div>
                    ) : combos.map((c) => (
                        <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                    {c.imagen_url ? (
                                        <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-cover"
                                            onError={(e) => { e.target.style.display = "none"; }} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{c.nombre}</p>
                                    <p className="text-xs text-gray-400">
                                        Stock: {c.cantidad ?? 0} · Venta: RD$ {Number(c.precio_venta).toFixed(2)} · Costo: RD$ {Number(c.precio_compra).toFixed(2)}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {recetaDe(c.id).map((it) => productosById[it.component_product_id]?.nombre ?? "").filter(Boolean).join(" + ")}
                                    </p>
                                </div>
                                <button onClick={() => abrirArmar(c)}
                                    className="flex items-center gap-1 text-xs font-semibold text-gray-900 border border-gray-200 rounded-xl px-3 py-2 flex-shrink-0">
                                    <Plus size={14} /> Armar más
                                </button>
                            </div>

                            {armarId === c.id && (
                                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                                    <input
                                        className="flex-1 border border-gray-100 rounded-xl p-2.5 text-sm focus:outline-none focus:border-gray-300"
                                        placeholder="Cantidad a armar" inputMode="decimal"
                                        value={armarCantidad} onChange={(e) => setArmarCantidad(e.target.value)}
                                    />
                                    <button disabled={armando} onClick={() => confirmarArmar(c)}
                                        className="bg-gray-900 text-white text-xs font-semibold rounded-xl px-4 py-2.5 disabled:opacity-50">
                                        {armando ? "Armando..." : "Confirmar"}
                                    </button>
                                    <button onClick={() => setArmarId(null)} className="text-gray-400">
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                            {armarId === c.id && armarMsg && (
                                <p className="text-xs text-red-500 mt-2">{armarMsg}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
