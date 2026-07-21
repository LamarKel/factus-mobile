import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Package, X, ShoppingCart, Search } from "lucide-react";

const ordenEstado = (p) => {
    if (p.proximamente) return 1;
    if (p.control_inventario && (p.cantidad ?? 0) <= 0) return 2;
    return 0;
};
const ordenarPorEstado = (arr) => [...arr].sort((a, b) => ordenEstado(a) - ordenEstado(b));

const WaIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

export default function Catalogo() {
    const { userId } = useParams();
    const [productos, setProductos] = useState([]);
    const [perfil, setPerfil] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [carrito, setCarrito] = useState({});
    const [showCarrito, setShowCarrito] = useState(false);
    const [categoriaActiva, setCategoriaActiva] = useState("Todo");
    const [verMasCat, setVerMasCat] = useState(null);
    const [zoomImg, setZoomImg] = useState(null); // URL de imagen para zoom

    useEffect(() => {
        if (!userId) return;
        const fetchData = async () => {
            const { data: perfilData } = await supabase
                .from("perfiles")
                .select("nombre_tienda, telefono, logo_url")
                .eq("user_id", userId)
                .single();
            if (perfilData) setPerfil(perfilData);

            const { data: productosData, error } = await supabase
                .from("products")
                .select("nombre, codigo, unidad_medida, precio_venta, precio_oferta, oferta_activa, control_inventario, cantidad, imagen_url, categoria, ventas, proximamente")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            if (!error) setProductos(productosData ?? []);
            setLoading(false);
        };
        fetchData();
    }, [userId]);

    const categorias = useMemo(() => {
        const cats = [...new Set(productos.map((p) => p.categoria).filter(Boolean))];
        return ["Todo", ...cats];
    }, [productos]);

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return productos;
        return productos.filter((p) =>
            `${p.nombre} ${p.codigo} ${p.categoria ?? ""}`.toLowerCase().includes(s)
        );
    }, [productos, search]);

    const porCategoria = useMemo(() => {
        const grupos = {};
        filtered.forEach((p) => {
            const cat = p.categoria || "Sin marca";
            if (!grupos[cat]) grupos[cat] = [];
            grupos[cat].push(p);
        });
        Object.keys(grupos).forEach((cat) => { grupos[cat] = ordenarPorEstado(grupos[cat]); });
        return grupos;
    }, [filtered]);

    const agregarAlCarrito = (p) => {
        setCarrito((prev) => ({ ...prev, [p.codigo]: (prev[p.codigo] ?? 0) + 1 }));
    };

    const cambiarCantidad = (codigo, delta) => {
        setCarrito((prev) => {
            const nueva = (prev[codigo] ?? 0) + delta;
            if (nueva <= 0) {
                const copia = { ...prev };
                delete copia[codigo];
                return copia;
            }
            return { ...prev, [codigo]: nueva };
        });
    };

    const itemsEnCarrito = Object.values(carrito).reduce((a, b) => a + b, 0);
    const productosEnCarrito = productos.filter((p) => carrito[p.codigo] > 0);
    const total = productosEnCarrito.reduce((sum, p) => {
        const precio = p.oferta_activa && p.precio_oferta ? Number(p.precio_oferta) : Number(p.precio_venta);
        return sum + precio * carrito[p.codigo];
    }, 0);

    const enviarPorWhatsApp = () => {
        if (productosEnCarrito.length === 0) return;
        const whatsappNumber = perfil?.telefono;
        if (!whatsappNumber) { alert("Esta tienda no tiene número de WhatsApp configurado."); return; }
        const lineas = productosEnCarrito.map((p) => {
            const cant = carrito[p.codigo];
            const precio = p.oferta_activa && p.precio_oferta ? Number(p.precio_oferta) : Number(p.precio_venta);
            return `• ${p.nombre} x${cant} = RD$ ${(precio * cant).toFixed(2)}`;
        });
        const mensaje = `🛒 *Pedido - ${perfil?.nombre_tienda ?? "Tienda"}*\n\n` + lineas.join("\n") + `\n\n*Total: RD$ ${total.toFixed(2)}*`;
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensaje)}`, "_blank");
    };

    // ── Modal carrito (reutilizable) ──
    const ModalCarrito = () => (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50">
            <div className="bg-white w-full rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">🛒 Tu pedido</h2>
                    <button onClick={() => setShowCarrito(false)} className="w-8 h-8 grid place-items-center rounded-xl border border-gray-100">
                        <X size={14} />
                    </button>
                </div>
                {productosEnCarrito.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">El carrito está vacío.</p>
                ) : (
                    <>
                        <div className="space-y-3 mb-4">
                            {productosEnCarrito.map((p) => {
                                const precio = p.oferta_activa && p.precio_oferta ? Number(p.precio_oferta) : Number(p.precio_venta);
                                return (
                                    <div key={p.codigo} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
                                        <div className="w-14 h-14 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100">
                                            {p.imagen_url ? (
                                                <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-contain"
                                                    onError={(e) => { e.target.style.display = "none"; }} />
                                            ) : <Package size={20} className="text-gray-300 m-auto mt-3" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm truncate">{p.nombre}</p>
                                            <p className="text-xs text-gray-400">{p.categoria}</p>
                                            <p className="text-xs text-gray-500">RD$ {precio.toFixed(2)} c/u</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => cambiarCantidad(p.codigo, -1)} className="w-7 h-7 border rounded-full font-bold flex items-center justify-center text-gray-600">−</button>
                                            <span className="text-sm font-semibold w-4 text-center">{carrito[p.codigo]}</span>
                                            <button onClick={() => cambiarCantidad(p.codigo, +1)} className="w-7 h-7 border rounded-full font-bold flex items-center justify-center text-gray-600">+</button>
                                        </div>
                                        <p className="text-sm font-bold w-20 text-right">RD$ {(precio * carrito[p.codigo]).toFixed(2)}</p>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-100 pt-3 mb-4">
                            <span className="font-semibold">Total</span>
                            <span className="text-xl font-bold">RD$ {total.toFixed(2)}</span>
                        </div>
                        <button onClick={enviarPorWhatsApp}
                            className="w-full bg-green-500 text-white rounded-xl p-4 font-bold text-base flex items-center justify-center gap-2">
                            <WaIcon /> Enviar pedido por WhatsApp
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    // ── Card de producto (estilo Temu/Shein) ──
    const ProductCard = ({ p, fullWidth = false }) => {
        const cantEnCarrito = carrito[p.codigo] ?? 0;
        const proximamente = !!p.proximamente;
        const agotado = !proximamente && p.control_inventario && (p.cantidad ?? 0) <= 0;
        const tieneOferta = !proximamente && p.oferta_activa && p.precio_oferta;
        const pctDesc = tieneOferta
            ? Math.round(((Number(p.precio_venta) - Number(p.precio_oferta)) / Number(p.precio_venta)) * 100)
            : 0;

        return (
            <div className={`bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col ${fullWidth ? "w-full" : "flex-shrink-0 w-40 sm:w-44 lg:w-48"}`}>
                {/* Imagen — toca para zoom */}
                <div
                    className="relative bg-white cursor-zoom-in"
                    style={{ paddingBottom: "100%" }}
                    onClick={() => p.imagen_url && setZoomImg(p.imagen_url)}
                >
                    <div className="absolute inset-0 flex items-center justify-center p-2">
                        {p.imagen_url ? (
                            <img
                                src={p.imagen_url}
                                alt={p.nombre}
                                className="w-full h-full object-contain"
                                onError={(e) => { e.target.style.display = "none"; }}
                            />
                        ) : (
                            <Package size={36} className="text-gray-200" />
                        )}
                    </div>

                    {/* Badge oferta % */}
                    {tieneOferta && pctDesc > 0 && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                            -{pctDesc}%
                        </span>
                    )}

                    {/* Badge Top */}
                    {!agotado && !proximamente && !tieneOferta && (p.ventas ?? 0) > 0 && (
                        <span className="absolute top-2 left-2 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                            ⭐ Top
                        </span>
                    )}

                    {/* Badge próximamente — sin tapar la imagen */}
                    {proximamente && (
                        <span className="absolute bottom-2 left-2 right-2 text-center bg-blue-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                            Próximamente
                        </span>
                    )}

                    {/* Badge agotado — sin tapar la imagen */}
                    {agotado && (
                        <span className="absolute bottom-2 left-2 right-2 text-center bg-gray-800/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                            Agotado
                        </span>
                    )}
                </div>

                {/* Info */}
                <div className="p-2.5 flex flex-col gap-1 flex-1">
                    <p className="text-xs text-gray-900 leading-tight line-clamp-2 font-medium">{p.nombre}</p>

                    {/* Precio */}
                    <div className="mt-auto pt-1">
                        {tieneOferta ? (
                            <div>
                                <p className="text-sm font-bold text-red-600 leading-tight">
                                    RD$ {Number(p.precio_oferta).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-[10px] text-gray-400 line-through">
                                    RD$ {Number(p.precio_venta).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm font-bold text-gray-900">
                                RD$ {Number(p.precio_venta).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                            </p>
                        )}
                    </div>

                    {/* Botón */}
                    {proximamente || agotado ? null : cantEnCarrito === 0 ? (
                        <button
                            onClick={() => agregarAlCarrito(p)}
                            className="mt-1.5 w-full bg-gray-900 text-white rounded-lg py-1.5 text-xs font-semibold active:bg-gray-700 transition"
                        >
                            + Agregar
                        </button>
                    ) : (
                        <div className="mt-1.5 flex items-center justify-between border border-gray-200 rounded-lg overflow-hidden">
                            <button onClick={() => cambiarCantidad(p.codigo, -1)} className="px-2.5 py-1.5 text-sm font-bold text-gray-600">−</button>
                            <span className="font-semibold text-xs">{cantEnCarrito}</span>
                            <button onClick={() => cambiarCantidad(p.codigo, +1)} className="px-2.5 py-1.5 text-sm font-bold text-gray-600">+</button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ── Botones flotantes (reutilizable) ──
    const BotonesFlotantes = () => (
        <div className="fixed bottom-6 right-4 flex flex-col gap-3 z-40">
            <button onClick={enviarPorWhatsApp}
                className="w-12 h-12 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center">
                <WaIcon />
            </button>
            <button onClick={() => setShowCarrito(true)}
                className="relative w-12 h-12 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center">
                <ShoppingCart size={20} />
                {itemsEnCarrito > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {itemsEnCarrito}
                    </span>
                )}
            </button>
        </div>
    );

    // ── Vista "Ver más" ──
    if (verMasCat) {
        const prods = ordenarPorEstado(porCategoria[verMasCat] ?? []);
        return (
            <div className="min-h-screen bg-gray-50 pb-32">
                <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center gap-3">
                    <button onClick={() => setVerMasCat(null)} className="text-xl text-gray-600">←</button>
                    <h2 className="font-bold text-base">{verMasCat}</h2>
                    <span className="text-xs text-gray-400 ml-auto">{prods.length} productos</span>
                </div>

                {/* Grid adaptativo — 2 móvil, 3 tablet, 4 desktop, 5 desktop grande */}
                <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {prods.map((p) => <ProductCard key={p.codigo} p={p} fullWidth />)}
                </div>

                <BotonesFlotantes />
                {showCarrito && <ModalCarrito />}

                {/* Zoom */}
                {zoomImg && (
                    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                        onClick={() => setZoomImg(null)}>
                        <button className="absolute top-4 right-4 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                            <X size={18} className="text-white" />
                        </button>
                        <img src={zoomImg} alt="zoom" className="max-w-full max-h-full object-contain rounded-xl" />
                    </div>
                )}
            </div>
        );
    }

    // ── Vista principal ──
    return (
        <div className="min-h-screen bg-gray-50 pb-32">

            {/* Header */}
            <div className="bg-white px-4 pt-5 pb-3">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-100">
                            {perfil?.logo_url ? (
                                <img src={perfil.logo_url} alt="Logo" className="w-full h-full object-contain" />
                            ) : <span className="text-xl">🏪</span>}
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-gray-900 leading-tight">{perfil?.nombre_tienda ?? "Mi Tienda"}</h1>
                            <p className="text-[11px] text-gray-400">Catálogo</p>
                        </div>
                    </div>
                    {/* Mini carrito en header */}
                    {itemsEnCarrito > 0 && (
                        <button onClick={() => setShowCarrito(true)}
                            className="relative flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-xl text-xs font-semibold">
                            <ShoppingCart size={14} />
                            {itemsEnCarrito}
                            <span className="hidden sm:inline">items</span>
                        </button>
                    )}
                </div>

                {/* Buscador */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:bg-gray-50"
                        placeholder="Buscar producto..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Categorías sticky */}
            <div className="sticky top-0 z-40 bg-white border-b px-4 py-2">
                <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
                    {categorias.map((cat) => (
                        <button key={cat} onClick={() => setCategoriaActiva(cat)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${categoriaActiva === cat ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Contenido */}
            {loading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Cargando catálogo...</div>
            ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No se encontraron productos.</div>
            ) : categoriaActiva !== "Todo" ? (
                /* Vista categoría filtrada — grid adaptativo */
                <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {ordenarPorEstado(filtered.filter((p) => (p.categoria || "Sin marca") === categoriaActiva))
                        .map((p) => <ProductCard key={p.codigo} p={p} fullWidth />)}
                </div>
            ) : (
                /* Vista principal — scroll horizontal por categoría */
                <div className="py-4 space-y-6">
                    {Object.entries(porCategoria).map(([cat, prods]) => (
                        <div key={cat}>
                            <div className="flex items-center justify-between px-4 mb-2">
                                <h2 className="font-bold text-gray-900 text-sm">{cat}</h2>
                                {prods.length > 3 && (
                                    <button onClick={() => setVerMasCat(cat)}
                                        className="text-xs text-gray-500 font-medium border border-gray-200 px-2.5 py-1 rounded-full hover:bg-gray-50">
                                        Ver todos ({prods.length}) →
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 scrollbar-hide">
                                {prods.map((p) => <ProductCard key={p.codigo} p={p} />)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <BotonesFlotantes />
            {showCarrito && <ModalCarrito />}

            {/* Lightbox zoom */}
            {zoomImg && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setZoomImg(null)}
                >
                    <button className="absolute top-4 right-4 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                        <X size={18} className="text-white" />
                    </button>
                    <img src={zoomImg} alt="zoom" className="max-w-full max-h-[90vh] object-contain rounded-xl" />
                </div>
            )}
        </div>
    );
}