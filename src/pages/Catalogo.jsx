import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
    Package, X, Search, ShoppingBag, Heart, SlidersHorizontal, ChevronLeft, ChevronDown,
    Maximize2, Minus, Plus, LayoutGrid, ArrowRight, MapPin, Phone, Check,
} from "lucide-react";

const POR_PAGINA = 12;
const DIAS_NUEVO = 15;

const precioFinal = (p) => (p.oferta_activa && p.precio_oferta ? Number(p.precio_oferta) : Number(p.precio_venta));
const fmt = (n) => `RD$ ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const esAgotado = (p) => !p.proximamente && p.control_inventario && (p.cantidad ?? 0) <= 0;
const esDisponible = (p) => !p.proximamente && !esAgotado(p);
const ordenEstado = (p) => (p.proximamente ? 1 : esAgotado(p) ? 2 : 0);
const esNuevo = (p) => p.created_at && Date.now() - new Date(p.created_at).getTime() < DIAS_NUEVO * 86400000;

const leerFavoritos = (userId) => {
    try { return JSON.parse(localStorage.getItem(`favoritos_${userId}`) ?? "[]"); } catch { return []; }
};

const WaIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

function ProductImage({ p, className = "" }) {
    return p.imagen_url ? (
        <img src={p.imagen_url} alt={p.nombre} loading="lazy"
            className={`w-full h-full object-contain ${className}`}
            onError={(e) => { e.target.style.display = "none"; }} />
    ) : (
        <Package size={36} className="text-gray-200" />
    );
}

function Badge({ p, topVentas }) {
    if (p.proximamente) return <span className="bg-blue-500 text-white">Próximamente</span>;
    if (esAgotado(p)) return <span className="bg-gray-800 text-white">Agotado</span>;
    if (p.oferta_activa && p.precio_oferta) {
        const pct = Math.round(((Number(p.precio_venta) - Number(p.precio_oferta)) / Number(p.precio_venta)) * 100);
        if (pct > 0) return <span className="bg-red-500 text-white">-{pct}%</span>;
    }
    if (topVentas.has(p.codigo)) return <span className="bg-white text-gray-700">Más vendido</span>;
    if (esNuevo(p)) return <span className="bg-white text-gray-700">Nuevo</span>;
    return null;
}

function Precio({ p, grande = false }) {
    const oferta = !p.proximamente && p.oferta_activa && p.precio_oferta;
    return (
        <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`${grande ? "text-2xl" : "text-sm"} font-semibold ${oferta ? "text-red-600" : "text-gray-900"}`}>
                {fmt(precioFinal(p))}
            </span>
            {oferta && <span className={`${grande ? "text-sm" : "text-[11px]"} text-gray-400 line-through`}>{fmt(p.precio_venta)}</span>}
        </div>
    );
}

function ProductCard({ p, topVentas, favorito, onFavorito, onAbrir, onAgregar }) {
    return (
        <div className="group flex flex-col">
            <div className="relative aspect-square bg-white border border-gray-100 rounded-xl overflow-hidden cursor-pointer"
                onClick={() => onAbrir(p)}>
                <div className="absolute inset-0 flex items-center justify-center p-3">
                    <ProductImage p={p} className="transition duration-300 group-hover:scale-[1.03]" />
                </div>
                <div className="absolute top-2 left-2 [&>span]:text-[10px] [&>span]:font-medium [&>span]:px-2 [&>span]:py-0.5 [&>span]:rounded [&>span]:shadow-sm">
                    <Badge p={p} topVentas={topVentas} />
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onFavorito(p.codigo); }}
                    className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full shadow-sm grid place-items-center"
                    aria-label="Favorito"
                >
                    <Heart size={14} className={favorito ? "fill-red-500 text-red-500" : "text-gray-600"} />
                </button>
            </div>
            <div className="pt-2 flex items-start gap-2">
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onAbrir(p)}>
                    <p className="text-[13px] font-medium text-gray-900 leading-tight line-clamp-2">{p.nombre}</p>
                    {p.categoria && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{p.categoria}</p>}
                    <div className="mt-1"><Precio p={p} /></div>
                </div>
                {esDisponible(p) && (
                    <button onClick={() => onAgregar(p, 1)}
                        className="w-8 h-8 mt-0.5 flex-shrink-0 rounded-full border border-gray-200 grid place-items-center text-gray-700 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition"
                        aria-label="Añadir a la bolsa">
                        <Plus size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}

function Filtros({ categorias, categoriaActiva, setCategoriaActiva, conteoCat, precioMin, setPrecioMin, precioMax, setPrecioMax, soloDisponibles, setSoloDisponibles, limpiar }) {
    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-semibold text-gray-900 mb-2">Categoría</p>
                <div className="space-y-1">
                    {categorias.map((cat) => (
                        <button key={cat} onClick={() => setCategoriaActiva(cat)}
                            className="w-full flex items-center gap-2 py-1 text-sm text-left text-gray-600">
                            <span className={`w-4 h-4 rounded border grid place-items-center flex-shrink-0 ${categoriaActiva === cat ? "bg-gray-900 border-gray-900" : "border-gray-300"}`}>
                                {categoriaActiva === cat && <Check size={10} className="text-white" />}
                            </span>
                            <span className="flex-1 truncate">{cat}</span>
                            <span className="text-xs text-gray-400">{conteoCat[cat] ?? 0}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-xs font-semibold text-gray-900 mb-2">Precio (RD$)</p>
                <div className="flex items-center gap-2">
                    <input inputMode="numeric" placeholder="Mín" value={precioMin}
                        onChange={(e) => setPrecioMin(e.target.value.replace(/[^\d.]/g, ""))}
                        className="w-full min-w-0 border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:border-gray-400" />
                    <span className="text-gray-300">–</span>
                    <input inputMode="numeric" placeholder="Máx" value={precioMax}
                        onChange={(e) => setPrecioMax(e.target.value.replace(/[^\d.]/g, ""))}
                        className="w-full min-w-0 border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:border-gray-400" />
                </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={soloDisponibles} onChange={(e) => setSoloDisponibles(e.target.checked)}
                    className="w-4 h-4 accent-gray-900" />
                Solo disponibles
            </label>

            <button onClick={limpiar} className="text-xs text-gray-500 underline underline-offset-2">Restablecer filtros</button>
        </div>
    );
}

function CatalogoSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 animate-pulse">
            {/* Header */}
            <div className="h-14 bg-white border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-4 lg:px-8 h-full flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gray-200" />
                        <div className="h-4 w-28 rounded bg-gray-200" />
                    </div>
                    <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100" />
                        <div className="w-8 h-8 rounded-full bg-gray-100" />
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 lg:px-8">
                {/* Portada */}
                <div className="mt-4 lg:mt-6 rounded-2xl bg-gray-100 grid lg:grid-cols-2 overflow-hidden">
                    <div className="p-6 lg:p-10 space-y-3 order-2 lg:order-1">
                        <div className="h-2.5 w-32 rounded bg-gray-200" />
                        <div className="h-8 w-3/4 rounded bg-gray-200" />
                        <div className="h-3 w-full max-w-sm rounded bg-gray-200" />
                        <div className="h-3 w-2/3 max-w-xs rounded bg-gray-200" />
                    </div>
                    <div className="aspect-[16/10] lg:aspect-auto lg:min-h-[320px] bg-gray-200/60 order-1 lg:order-2" />
                </div>

                {/* Categorías */}
                <div className="mt-6 flex gap-4 overflow-hidden">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16">
                            <div className="w-14 h-14 rounded-full bg-white border border-gray-100" />
                            <div className="h-2.5 w-10 rounded bg-gray-200" />
                        </div>
                    ))}
                </div>

                {/* Buscador */}
                <div className="mt-4 h-10 lg:max-w-md rounded-xl bg-white border border-gray-100" />

                <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
                    {/* Filtros escritorio */}
                    <div className="hidden lg:block space-y-3">
                        <div className="h-4 w-24 rounded bg-gray-200" />
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-3 w-full rounded bg-gray-100" />
                        ))}
                    </div>

                    <div>
                        <div className="h-6 w-48 rounded bg-gray-200" />
                        <div className="h-3 w-32 rounded bg-gray-100 mt-2 mb-4" />
                        {/* Tarjetas */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-6 lg:gap-x-5">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i}>
                                    <div className="aspect-square rounded-xl bg-white border border-gray-100" />
                                    <div className="h-3 w-3/4 rounded bg-gray-200 mt-2.5" />
                                    <div className="h-2.5 w-1/2 rounded bg-gray-100 mt-1.5" />
                                    <div className="h-3.5 w-1/3 rounded bg-gray-200 mt-2" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Catalogo() {
    const { userId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const codigoDetalle = searchParams.get("p");

    const [productos, setProductos] = useState([]);
    const [perfil, setPerfil] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [carrito, setCarrito] = useState({});
    const [showCarrito, setShowCarrito] = useState(false);
    const [showFiltros, setShowFiltros] = useState(false);
    const [categoriaActiva, setCategoriaActiva] = useState("Todo");
    const [orden, setOrden] = useState("destacados");
    const [precioMin, setPrecioMin] = useState("");
    const [precioMax, setPrecioMax] = useState("");
    const [soloDisponibles, setSoloDisponibles] = useState(false);
    const [soloFavoritos, setSoloFavoritos] = useState(false);
    const [visibles, setVisibles] = useState(POR_PAGINA);
    const [favoritos, setFavoritos] = useState(() => leerFavoritos(userId));
    const [zoomImg, setZoomImg] = useState(null);
    const [qtySel, setQtySel] = useState({ codigo: null, n: 1 });
    const qtyDetalle = qtySel.codigo === codigoDetalle ? qtySel.n : 1;
    const setQtyDetalle = (fn) => setQtySel({ codigo: codigoDetalle, n: fn(qtyDetalle) });

    useEffect(() => {
        if (!userId) return;
        const fetchData = async () => {
            const { data: perfilData } = await supabase
                .from("perfiles")
                .select("nombre_tienda, telefono, logo_url, direccion")
                .eq("user_id", userId)
                .single();
            if (perfilData) setPerfil(perfilData);

            const { data: productosData, error } = await supabase
                .from("products")
                .select("nombre, codigo, unidad_medida, precio_venta, precio_oferta, oferta_activa, control_inventario, cantidad, imagen_url, categoria, ventas, proximamente, created_at")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            if (!error) setProductos(productosData ?? []);
            setLoading(false);
        };
        fetchData();
    }, [userId]);

    // Al abrir/cerrar el detalle, volver arriba
    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [codigoDetalle]);

    const toggleFavorito = (codigo) => {
        setFavoritos((prev) => {
            const next = prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo];
            try { localStorage.setItem(`favoritos_${userId}`, JSON.stringify(next)); } catch { /* sin almacenamiento */ }
            return next;
        });
    };

    const categorias = useMemo(() => {
        const cats = [...new Set(productos.map((p) => p.categoria).filter(Boolean))];
        return ["Todo", ...cats];
    }, [productos]);

    // Imagen representativa por categoría (el más vendido con foto)
    const imagenCategoria = useMemo(() => {
        const map = {};
        [...productos].sort((a, b) => (b.ventas ?? 0) - (a.ventas ?? 0)).forEach((p) => {
            if (p.categoria && p.imagen_url && !map[p.categoria]) map[p.categoria] = p.imagen_url;
        });
        return map;
    }, [productos]);

    const conteoCat = useMemo(() => {
        const c = { Todo: productos.length };
        productos.forEach((p) => { if (p.categoria) c[p.categoria] = (c[p.categoria] ?? 0) + 1; });
        return c;
    }, [productos]);

    const topVentas = useMemo(() => new Set(
        productos.filter((p) => (p.ventas ?? 0) > 0)
            .sort((a, b) => (b.ventas ?? 0) - (a.ventas ?? 0))
            .slice(0, 4).map((p) => p.codigo)
    ), [productos]);

    const destacado = useMemo(() => (
        [...productos].filter((p) => p.imagen_url && esDisponible(p))
            .sort((a, b) => (b.ventas ?? 0) - (a.ventas ?? 0))[0]
    ), [productos]);

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        const min = precioMin === "" ? null : Number(precioMin);
        const max = precioMax === "" ? null : Number(precioMax);
        const lista = productos.filter((p) => {
            if (categoriaActiva !== "Todo" && p.categoria !== categoriaActiva) return false;
            if (s && !`${p.nombre} ${p.codigo} ${p.categoria ?? ""}`.toLowerCase().includes(s)) return false;
            if (soloDisponibles && !esDisponible(p)) return false;
            if (soloFavoritos && !favoritos.includes(p.codigo)) return false;
            const precio = precioFinal(p);
            if (min !== null && precio < min) return false;
            if (max !== null && precio > max) return false;
            return true;
        });
        const cmp = {
            destacados: (a, b) => ordenEstado(a) - ordenEstado(b) || (b.ventas ?? 0) - (a.ventas ?? 0),
            novedades: (a, b) => new Date(b.created_at) - new Date(a.created_at),
            precio_asc: (a, b) => precioFinal(a) - precioFinal(b),
            precio_desc: (a, b) => precioFinal(b) - precioFinal(a),
        }[orden];
        return lista.sort(cmp);
    }, [productos, search, categoriaActiva, soloDisponibles, soloFavoritos, favoritos, precioMin, precioMax, orden]);

    const hayFiltros = categoriaActiva !== "Todo" || precioMin !== "" || precioMax !== "" || soloDisponibles || soloFavoritos || search.trim() !== "";

    const limpiarFiltros = () => {
        setCategoriaActiva("Todo");
        setPrecioMin("");
        setPrecioMax("");
        setSoloDisponibles(false);
        setSoloFavoritos(false);
        setSearch("");
    };

    // ── Carrito ──
    const agregarAlCarrito = (p, cant = 1) => {
        setCarrito((prev) => ({ ...prev, [p.codigo]: (prev[p.codigo] ?? 0) + cant }));
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
    const total = productosEnCarrito.reduce((sum, p) => sum + precioFinal(p) * carrito[p.codigo], 0);

    const enviarPorWhatsApp = () => {
        if (productosEnCarrito.length === 0) return;
        const whatsappNumber = perfil?.telefono;
        if (!whatsappNumber) { alert("Esta tienda no tiene número de WhatsApp configurado."); return; }
        const lineas = productosEnCarrito.map((p) => {
            const cant = carrito[p.codigo];
            return `• ${p.nombre} x${cant} = RD$ ${(precioFinal(p) * cant).toFixed(2)}`;
        });
        const mensaje = `🛒 *Pedido - ${perfil?.nombre_tienda ?? "Tienda"}*\n\n` + lineas.join("\n") + `\n\n*Total: RD$ ${total.toFixed(2)}*`;
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensaje)}`, "_blank");
    };

    const preguntarPorWhatsApp = (p) => {
        if (!perfil?.telefono) { alert("Esta tienda no tiene número de WhatsApp configurado."); return; }
        const mensaje = `Hola, me interesa: *${p.nombre}* (${fmt(precioFinal(p))})`;
        window.open(`https://wa.me/${perfil.telefono}?text=${encodeURIComponent(mensaje)}`, "_blank");
    };

    const abrirProducto = (p) => setSearchParams({ p: p.codigo });
    const cerrarProducto = () => setSearchParams({});

    const nombreTienda = perfil?.nombre_tienda ?? "Mi Tienda";
    const cardProps = { topVentas, onFavorito: toggleFavorito, onAbrir: abrirProducto, onAgregar: agregarAlCarrito };
    const filtrosProps = {
        categorias, categoriaActiva, setCategoriaActiva, conteoCat,
        precioMin, setPrecioMin, precioMax, setPrecioMax,
        soloDisponibles, setSoloDisponibles, limpiar: limpiarFiltros,
    };

    const detalle = codigoDetalle ? productos.find((p) => p.codigo === codigoDetalle) : null;

    // ── Header ──
    const header = (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
            <div className="max-w-6xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between gap-3">
                <button onClick={() => { cerrarProducto(); limpiarFiltros(); }} className="flex items-center gap-2.5 min-w-0">
                    {perfil?.logo_url && (
                        <img src={perfil.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
                    )}
                    <span className="font-serif text-lg text-gray-900 truncate">{nombreTienda}</span>
                </button>
                <div className="flex items-center gap-1">
                    <button onClick={() => { cerrarProducto(); setSoloFavoritos((v) => !v); }}
                        className="relative w-9 h-9 grid place-items-center rounded-full hover:bg-gray-100" aria-label="Favoritos">
                        <Heart size={18} className={soloFavoritos ? "fill-red-500 text-red-500" : "text-gray-700"} />
                    </button>
                    <button onClick={() => setShowCarrito(true)}
                        className="relative w-9 h-9 grid place-items-center rounded-full hover:bg-gray-100" aria-label="Bolsa">
                        <ShoppingBag size={18} className="text-gray-700" />
                        {itemsEnCarrito > 0 && (
                            <span className="absolute top-0.5 right-0.5 bg-gray-900 text-white text-[9px] rounded-full min-w-[16px] h-4 px-1 grid place-items-center font-semibold">
                                {itemsEnCarrito}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );

    // ── Footer ──
    const footer = (
        <footer className="bg-gray-900 text-gray-300 mt-16">
            <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10 grid gap-6 lg:grid-cols-2">
                <div>
                    <p className="font-serif text-xl text-white">{nombreTienda}</p>
                    <p className="text-xs text-gray-400 mt-2 max-w-xs">
                        Haz tu pedido desde el catálogo y te lo confirmamos por WhatsApp.
                    </p>
                </div>
                <div className="space-y-2 text-sm lg:justify-self-end">
                    {perfil?.telefono && (
                        <a href={`https://wa.me/${perfil.telefono}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 hover:text-white"><Phone size={14} /> {perfil.telefono}</a>
                    )}
                    {perfil?.direccion && (
                        <p className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 flex-shrink-0" /> {perfil.direccion}</p>
                    )}
                </div>
            </div>
            <div className="border-t border-white/10">
                <p className="max-w-6xl mx-auto px-4 lg:px-8 py-4 text-[11px] text-gray-500">
                    © {new Date().getFullYear()} {nombreTienda}
                </p>
            </div>
        </footer>
    );

    // ── Bolsa ──
    const bolsa = showCarrito && (
        <div className="fixed inset-0 bg-black/40 flex items-end lg:items-stretch lg:justify-end z-50" onClick={() => setShowCarrito(false)}>
            <div className="bg-white w-full lg:w-[420px] rounded-t-3xl lg:rounded-none p-5 max-h-[85vh] lg:max-h-none overflow-y-auto flex flex-col"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif text-xl text-gray-900">Tu bolsa</h2>
                    <button onClick={() => setShowCarrito(false)} className="w-8 h-8 grid place-items-center rounded-full border border-gray-100">
                        <X size={14} />
                    </button>
                </div>
                {productosEnCarrito.length === 0 ? (
                    <div className="text-center py-10">
                        <ShoppingBag size={28} className="text-gray-200 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Tu bolsa está vacía.</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3 mb-4 flex-1">
                            {productosEnCarrito.map((p) => (
                                <div key={p.codigo} className="flex items-center gap-3">
                                    <div className="w-16 h-16 rounded-xl bg-white border border-gray-100 flex-shrink-0 overflow-hidden grid place-items-center p-1">
                                        <ProductImage p={p} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{p.nombre}</p>
                                        <p className="text-xs text-gray-400">{fmt(precioFinal(p))} c/u</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <button onClick={() => cambiarCantidad(p.codigo, -1)} className="w-6 h-6 border border-gray-200 rounded-full grid place-items-center text-gray-600"><Minus size={11} /></button>
                                            <span className="text-sm font-semibold w-4 text-center">{carrito[p.codigo]}</span>
                                            <button onClick={() => cambiarCantidad(p.codigo, +1)} className="w-6 h-6 border border-gray-200 rounded-full grid place-items-center text-gray-600"><Plus size={11} /></button>
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-right whitespace-nowrap">{fmt(precioFinal(p) * carrito[p.codigo])}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-100 pt-3 mb-4">
                            <span className="text-sm text-gray-500">Total</span>
                            <span className="text-xl font-semibold">{fmt(total)}</span>
                        </div>
                        <button onClick={enviarPorWhatsApp}
                            className="w-full bg-gray-900 text-white rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2">
                            <WaIcon /> Enviar pedido por WhatsApp
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    const zoom = zoomImg && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setZoomImg(null)}>
            <button className="absolute top-4 right-4 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <X size={18} className="text-white" />
            </button>
            <img src={zoomImg} alt="zoom" className="max-w-full max-h-[90vh] object-contain rounded-xl" />
        </div>
    );

    if (loading) return <CatalogoSkeleton />;

    // ── Vista detalle ──
    if (detalle) {
        const disponible = esDisponible(detalle);
        const relacionados = productos
            .filter((p) => p.codigo !== detalle.codigo && detalle.categoria && p.categoria === detalle.categoria)
            .sort((a, b) => ordenEstado(a) - ordenEstado(b) || (b.ventas ?? 0) - (a.ventas ?? 0))
            .slice(0, 4);
        const estado = detalle.proximamente ? "Próximamente" : esAgotado(detalle) ? "Agotado" : "Disponible";
        const filasDetalle = [
            ["Código", detalle.codigo],
            ["Categoría", detalle.categoria],
            ["Unidad", detalle.unidad_medida],
            ["Disponibilidad", estado],
        ].filter(([, v]) => v);

        return (
            <div className="min-h-screen bg-gray-50">
                {header}
                <main className="max-w-6xl mx-auto px-4 lg:px-8 pt-4">
                    <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                        <button onClick={cerrarProducto} className="flex items-center gap-1 hover:text-gray-700">
                            <ChevronLeft size={14} /> Catálogo
                        </button>
                        {detalle.categoria && (<><span>/</span><span className="text-gray-600 truncate">{detalle.categoria}</span></>)}
                    </nav>

                    <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
                        <div className="relative aspect-square bg-white border border-gray-100 rounded-2xl overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center p-6">
                                <ProductImage p={detalle} />
                            </div>
                            <div className="absolute top-3 left-3 [&>span]:text-[11px] [&>span]:font-medium [&>span]:px-2 [&>span]:py-0.5 [&>span]:rounded [&>span]:shadow-sm">
                                <Badge p={detalle} topVentas={topVentas} />
                            </div>
                            {detalle.imagen_url && (
                                <button onClick={() => setZoomImg(detalle.imagen_url)}
                                    className="absolute bottom-3 right-3 w-9 h-9 bg-white rounded-full shadow-sm grid place-items-center" aria-label="Ampliar">
                                    <Maximize2 size={15} className="text-gray-700" />
                                </button>
                            )}
                        </div>

                        <div className="lg:pt-4">
                            {detalle.categoria && <p className="text-[11px] uppercase tracking-widest text-gray-400">{detalle.categoria}</p>}
                            <div className="flex items-start justify-between gap-3 mt-1">
                                <h1 className="font-serif text-3xl lg:text-4xl text-gray-900 leading-tight">{detalle.nombre}</h1>
                                <button onClick={() => toggleFavorito(detalle.codigo)}
                                    className="w-10 h-10 flex-shrink-0 grid place-items-center rounded-full border border-gray-200" aria-label="Favorito">
                                    <Heart size={17} className={favoritos.includes(detalle.codigo) ? "fill-red-500 text-red-500" : "text-gray-700"} />
                                </button>
                            </div>
                            <div className="mt-3"><Precio p={detalle} grande /></div>

                            <p className={`mt-4 text-xs flex items-center gap-1.5 ${disponible ? "text-green-700" : "text-gray-500"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${disponible ? "bg-green-600" : "bg-gray-400"}`} />
                                {estado}
                                {disponible && detalle.control_inventario && (detalle.cantidad ?? 0) <= 5 && ` · Quedan ${detalle.cantidad}`}
                            </p>

                            {disponible && (
                                <div className="mt-5 flex gap-2">
                                    <div className="flex items-center border border-gray-200 rounded-xl bg-white">
                                        <button onClick={() => setQtyDetalle((q) => Math.max(1, q - 1))} className="w-10 h-11 grid place-items-center text-gray-600"><Minus size={14} /></button>
                                        <span className="w-6 text-center text-sm font-semibold">{qtyDetalle}</span>
                                        <button onClick={() => setQtyDetalle((q) => q + 1)} className="w-10 h-11 grid place-items-center text-gray-600"><Plus size={14} /></button>
                                    </div>
                                    <button onClick={() => { agregarAlCarrito(detalle, qtyDetalle); setShowCarrito(true); }}
                                        className="flex-1 bg-gray-900 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:bg-gray-700">
                                        Añadir a la bolsa <ShoppingBag size={15} />
                                    </button>
                                </div>
                            )}

                            <button onClick={() => preguntarPorWhatsApp(detalle)}
                                className="mt-2 w-full border border-gray-200 bg-white rounded-xl py-3 text-sm text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50">
                                <WaIcon size={16} /> Preguntar por WhatsApp
                            </button>

                            <div className="mt-8">
                                <h2 className="font-serif text-xl text-gray-900 mb-2">Detalles</h2>
                                <dl className="divide-y divide-gray-100 border-y border-gray-100">
                                    {filasDetalle.map(([k, v]) => (
                                        <div key={k} className="flex py-2.5 text-sm">
                                            <dt className="w-32 text-gray-400">{k}</dt>
                                            <dd className="text-gray-700">{v}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        </div>
                    </div>

                    {relacionados.length > 0 && (
                        <section className="mt-14">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-serif text-2xl text-gray-900">También te puede gustar</h2>
                                <button onClick={() => { setCategoriaActiva(detalle.categoria); cerrarProducto(); }}
                                    className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-900">
                                    Ver todo <ArrowRight size={13} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-6">
                                {relacionados.map((p) => (
                                    <ProductCard key={p.codigo} p={p} favorito={favoritos.includes(p.codigo)} {...cardProps} />
                                ))}
                            </div>
                        </section>
                    )}
                </main>
                {footer}
                {bolsa}
                {zoom}
            </div>
        );
    }

    // ── Vista catálogo ──
    const mostrados = filtered.slice(0, visibles);

    return (
        <div className="min-h-screen bg-gray-50">
            {header}

            <main className="max-w-6xl mx-auto px-4 lg:px-8">
                {/* Portada */}
                {!hayFiltros && (
                    <section className="mt-4 lg:mt-6 bg-gray-100 rounded-2xl overflow-hidden grid lg:grid-cols-2">
                        <div className="p-6 lg:p-10 flex flex-col justify-center order-2 lg:order-1">
                            <p className="text-[10px] uppercase tracking-widest text-gray-400">Catálogo · {productos.length} productos</p>
                            <h1 className="font-serif text-3xl lg:text-5xl text-gray-900 leading-tight mt-2">{nombreTienda}</h1>
                            <p className="text-sm text-gray-500 mt-3 max-w-sm">
                                Elige tus productos, añádelos a la bolsa y envíanos tu pedido por WhatsApp.
                            </p>
                            <button onClick={() => document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" })}
                                className="mt-5 self-start text-sm text-gray-900 flex items-center gap-1.5 border-b border-gray-900 pb-0.5">
                                Ver productos <ArrowRight size={14} />
                            </button>
                        </div>
                        {destacado && (
                            <button onClick={() => abrirProducto(destacado)}
                                className="relative order-1 lg:order-2 aspect-[16/10] lg:aspect-auto lg:min-h-[320px] bg-white">
                                <div className="absolute inset-0 flex items-center justify-center p-6">
                                    <ProductImage p={destacado} />
                                </div>
                                <span className="absolute bottom-3 left-3 bg-white text-[10px] font-medium text-gray-700 px-2 py-1 rounded shadow-sm uppercase tracking-wide">
                                    Lo más pedido
                                </span>
                            </button>
                        )}
                    </section>
                )}

                {/* Categorías */}
                {categorias.length > 1 && (
                    <div className="mt-6 flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {categorias.map((cat) => {
                            const activa = categoriaActiva === cat;
                            return (
                                <button key={cat} onClick={() => setCategoriaActiva(cat)} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16">
                                    <span className={`w-14 h-14 rounded-full overflow-hidden grid place-items-center border-2 transition ${activa ? "border-gray-900" : "border-transparent"} ${cat === "Todo" ? (activa ? "bg-gray-900 text-white" : "bg-white text-gray-600") : "bg-white"}`}>
                                        {cat === "Todo" ? <LayoutGrid size={18} /> : imagenCategoria[cat] ? (
                                            <img src={imagenCategoria[cat]} alt={cat} className="w-full h-full object-contain p-1.5" />
                                        ) : <span className="text-sm font-semibold text-gray-500">{cat.slice(0, 1).toUpperCase()}</span>}
                                    </span>
                                    <span className={`text-[11px] leading-tight text-center line-clamp-2 ${activa ? "text-gray-900 font-medium" : "text-gray-500"}`}>{cat}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Buscador */}
                <div className="mt-4 relative lg:max-w-md">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-9 py-2.5 text-sm outline-none focus:border-gray-400"
                        placeholder="Busca un producto o categoría"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setVisibles(POR_PAGINA); }}
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={14} /></button>
                    )}
                </div>

                <div id="productos" className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[200px_1fr] lg:gap-10 scroll-mt-20">
                    {/* Filtros escritorio */}
                    <aside className="hidden lg:block">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-semibold text-gray-900">Filtrar por</p>
                            <SlidersHorizontal size={14} className="text-gray-400" />
                        </div>
                        <Filtros {...filtrosProps} />
                    </aside>

                    <div className="min-w-0">
                        <div className="flex items-end justify-between gap-3 mb-4">
                            <div className="min-w-0">
                                <h2 className="font-serif text-2xl text-gray-900 truncate">
                                    {soloFavoritos ? "Tus favoritos" : categoriaActiva === "Todo" ? "Todos los productos" : categoriaActiva}
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">{filtered.length} productos · Precios en RD$</p>
                            </div>
                            <div className="relative flex-shrink-0">
                                <select value={orden} onChange={(e) => setOrden(e.target.value)}
                                    className="appearance-none bg-transparent text-xs text-gray-700 pr-5 py-1 outline-none cursor-pointer">
                                    <option value="destacados">Destacados</option>
                                    <option value="novedades">Novedades</option>
                                    <option value="precio_asc">Precio: menor a mayor</option>
                                    <option value="precio_desc">Precio: mayor a menor</option>
                                </select>
                                <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Filtros móvil */}
                        <div className="lg:hidden flex gap-2 mb-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <button onClick={() => setShowFiltros(true)}
                                className="flex-shrink-0 flex items-center gap-1.5 border border-gray-200 bg-white rounded-full px-3 py-1.5 text-xs text-gray-700">
                                Filtros <SlidersHorizontal size={12} />
                            </button>
                            <button onClick={() => setSoloDisponibles((v) => !v)}
                                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs border ${soloDisponibles ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200"}`}>
                                Solo disponibles
                            </button>
                            {hayFiltros && (
                                <button onClick={limpiarFiltros} className="flex-shrink-0 px-2 text-xs text-gray-500 underline underline-offset-2">Limpiar</button>
                            )}
                        </div>

                        {filtered.length === 0 ? (
                            <div className="py-16 text-center">
                                <p className="text-gray-400 text-sm">{soloFavoritos ? "Aún no tienes favoritos." : "No se encontraron productos."}</p>
                                {hayFiltros && <button onClick={limpiarFiltros} className="mt-2 text-xs text-gray-700 underline">Restablecer filtros</button>}
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-6 lg:gap-x-5">
                                    {mostrados.map((p) => (
                                        <ProductCard key={p.codigo} p={p} favorito={favoritos.includes(p.codigo)} {...cardProps} />
                                    ))}
                                </div>
                                <div className="mt-10 text-center">
                                    <p className="text-xs text-gray-400">Has visto {mostrados.length} de {filtered.length} productos</p>
                                    <div className="w-40 h-0.5 bg-gray-200 mx-auto mt-2 rounded-full overflow-hidden">
                                        <div className="h-full bg-gray-900" style={{ width: `${(mostrados.length / filtered.length) * 100}%` }} />
                                    </div>
                                    {mostrados.length < filtered.length && (
                                        <button onClick={() => setVisibles((v) => v + POR_PAGINA)}
                                            className="mt-4 border border-gray-300 rounded-full px-5 py-2 text-xs text-gray-700 hover:bg-white">
                                            Ver más
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>

            {footer}

            {/* Bolsa flotante móvil */}
            {itemsEnCarrito > 0 && !showCarrito && (
                <button onClick={() => setShowCarrito(true)}
                    className="lg:hidden fixed bottom-5 left-4 right-4 z-40 bg-gray-900 text-white rounded-xl py-3.5 px-4 shadow-lg flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-2"><ShoppingBag size={16} /> Ver bolsa ({itemsEnCarrito})</span>
                    <span>{fmt(total)}</span>
                </button>
            )}

            {/* Filtros móvil (hoja) */}
            {showFiltros && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:hidden" onClick={() => setShowFiltros(false)}>
                    <div className="bg-white w-full rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-serif text-xl text-gray-900">Filtrar por</h2>
                            <button onClick={() => setShowFiltros(false)} className="w-8 h-8 grid place-items-center rounded-full border border-gray-100"><X size={14} /></button>
                        </div>
                        <Filtros {...filtrosProps} />
                        <button onClick={() => setShowFiltros(false)}
                            className="mt-6 w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold">
                            Ver {filtered.length} productos
                        </button>
                    </div>
                </div>
            )}

            {bolsa}
            {zoom}
        </div>
    );
}
