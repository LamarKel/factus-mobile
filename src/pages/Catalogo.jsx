import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";



export default function Catalogo() {
    const { userId } = useParams();
    const [productos, setProductos] = useState([]);
    const [perfil, setPerfil] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [carrito, setCarrito] = useState({}); // { codigo: cantidad }
    const [showCarrito, setShowCarrito] = useState(false);

    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            // Trae perfil del dueño de esa cuenta
            const { data: perfilData } = await supabase
                .from("perfiles")
                .select("nombre_tienda, telefono, logo_url")
                .eq("user_id", userId)
                .single();

            if (perfilData) setPerfil(perfilData);

            // Trae solo los productos de ese usuario
            const { data: productosData, error } = await supabase
                .from("products")
                .select("nombre, codigo, unidad_medida, precio_venta, control_inventario, cantidad, imagen_url")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            if (!error) setProductos(productosData ?? []);
            setLoading(false);
        };

        fetchData();
    }, [userId]);

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return productos;
        return productos.filter((p) =>
            `${p.nombre} ${p.codigo}`.toLowerCase().includes(s)
        );
    }, [productos, search]);

    // ── Carrito helpers ──────────────────────────────────────
    const agregarAlCarrito = (p) => {
        setCarrito((prev) => ({
            ...prev,
            [p.codigo]: (prev[p.codigo] ?? 0) + 1,
        }));
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

    const total = productosEnCarrito.reduce(
        (sum, p) => sum + Number(p.precio_venta) * carrito[p.codigo],
        0
    );

    const enviarPorWhatsApp = () => {
        if (productosEnCarrito.length === 0) return;

        const whatsappNumber = perfil?.telefono;

        if (!whatsappNumber) {
            alert("Configura tu número de WhatsApp en la sección Perfil.");
            return;
        }

        const lineas = productosEnCarrito.map((p) => {
            const cant = carrito[p.codigo];
            const subtotal = (Number(p.precio_venta) * cant).toFixed(2);
            return `• ${p.nombre} x${cant} = RD$ ${subtotal}`;
        });

        const mensaje =
            `🛒 *Pedido*\n\n` +
            lineas.join("\n") +
            `\n\n*Total: RD$ ${total.toFixed(2)}*`;

        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, "_blank");
    };

    // ── Render ───────────────────────────────────────────────
    return (
        <div className="min-h-screen p-4 pb-32">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">

                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {perfil?.logo_url ? (
                            <img
                                src={perfil.logo_url}
                                alt="Logo"
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <span className="text-2xl">🏪</span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">
                            {perfil?.nombre_tienda ?? "Mi Tienda"}
                        </h1>
                        <p className="text-sm text-gray-500">Catálogo de productos</p>
                    </div>
                </div>

                {/* Botón carrito */}
                <button
                    onClick={() => setShowCarrito(true)}
                    className="relative bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold"
                >
                    🛒 Carrito
                    {itemsEnCarrito > 0 && (
                        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {itemsEnCarrito}
                        </span>
                    )}
                </button>
            </div>

            {/* Buscador */}
            <input
                className="w-full border rounded-xl p-3 mb-2"
                placeholder="Buscar por nombre o código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <p className="text-xs text-gray-400 mb-3">
                {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
            </p>

            {/* Productos */}
            {loading ? (
                <p className="text-gray-400 text-sm">Cargando productos...</p>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {filtered.length === 0 && (
                        <p className="col-span-2 text-gray-400 text-sm text-center py-10">
                            No se encontraron productos.
                        </p>
                    )}

                    {filtered.map((p) => {
                        const cantEnCarrito = carrito[p.codigo] ?? 0;
                        const agotado = p.control_inventario && (p.cantidad ?? 0) <= 0;

                        return (
                            <div key={p.codigo} className="border rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col">

                                {/* Imagen */}
                                {p.imagen_url ? (
                                    <img
                                        src={p.imagen_url}
                                        alt={p.nombre}
                                        className="w-full h-36 object-cover"
                                        onError={(e) => { e.target.style.display = "none"; }}
                                    />
                                ) : (
                                    <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-3xl">
                                        📦
                                    </div>
                                )}

                                <div className="p-3 flex flex-col gap-1 flex-1">
                                    <p className="font-semibold text-sm leading-tight">{p.nombre}</p>
                                    <p className="text-xs text-gray-400 font-mono">{p.codigo}</p>

                                    {p.unidad_medida && (
                                        <span className="text-xs border rounded-full px-2 py-0.5 self-start text-gray-500">
                                            {p.unidad_medida}
                                        </span>
                                    )}

                                    {p.control_inventario && (
                                        <span className={`text-xs rounded-full px-2 py-0.5 self-start ${agotado ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                                            }`}>
                                            {agotado ? "Agotado" : `Disponible (${p.cantidad})`}
                                        </span>
                                    )}

                                    <p className="text-lg font-bold mt-1">
                                        RD$ {Number(p.precio_venta).toFixed(2)}
                                    </p>

                                    {/* Botón agregar / contador */}
                                    {agotado ? (
                                        <button disabled className="mt-2 w-full border rounded-xl p-2 text-sm text-gray-400 bg-gray-50">
                                            Agotado
                                        </button>
                                    ) : cantEnCarrito === 0 ? (
                                        <button
                                            onClick={() => agregarAlCarrito(p)}
                                            className="mt-2 w-full bg-black text-white rounded-xl p-2 text-sm font-semibold"
                                        >
                                            + Agregar
                                        </button>
                                    ) : (
                                        <div className="mt-2 flex items-center justify-between border rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => cambiarCantidad(p.codigo, -1)}
                                                className="px-3 py-2 text-lg font-bold text-gray-600"
                                            >
                                                −
                                            </button>
                                            <span className="font-semibold text-sm">{cantEnCarrito}</span>
                                            <button
                                                onClick={() => cambiarCantidad(p.codigo, +1)}
                                                className="px-3 py-2 text-lg font-bold text-gray-600"
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── MODAL CARRITO ── */}
            {showCarrito && (
                <div className="fixed inset-0 bg-black/40 flex items-end z-50">
                    <div className="bg-white w-full rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto">

                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">🛒 Tu pedido</h2>
                            <button onClick={() => setShowCarrito(false)} className="text-sm underline">
                                Cerrar
                            </button>
                        </div>

                        {productosEnCarrito.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-6">
                                El carrito está vacío.
                            </p>
                        ) : (
                            <>
                                <div className="space-y-3 mb-4">
                                    {productosEnCarrito.map((p) => (
                                        <div key={p.codigo} className="flex items-center gap-3 border rounded-xl p-3">
                                            {p.imagen_url && (
                                                <img
                                                    src={p.imagen_url}
                                                    alt={p.nombre}
                                                    className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                                                    onError={(e) => { e.target.style.display = "none"; }}
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm truncate">{p.nombre}</p>
                                                <p className="text-xs text-gray-500">
                                                    RD$ {Number(p.precio_venta).toFixed(2)} c/u
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => cambiarCantidad(p.codigo, -1)}
                                                    className="w-7 h-7 border rounded-full text-base font-bold flex items-center justify-center"
                                                >
                                                    −
                                                </button>
                                                <span className="text-sm font-semibold w-4 text-center">
                                                    {carrito[p.codigo]}
                                                </span>
                                                <button
                                                    onClick={() => cambiarCantidad(p.codigo, +1)}
                                                    className="w-7 h-7 border rounded-full text-base font-bold flex items-center justify-center"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <p className="text-sm font-bold w-20 text-right">
                                                RD$ {(Number(p.precio_venta) * carrito[p.codigo]).toFixed(2)}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* Total */}
                                <div className="flex justify-between items-center border-t pt-3 mb-4">
                                    <span className="font-semibold">Total</span>
                                    <span className="text-xl font-bold">RD$ {total.toFixed(2)}</span>
                                </div>

                                {/* Botón WhatsApp */}
                                <button
                                    onClick={enviarPorWhatsApp}
                                    className="w-full bg-green-500 text-white rounded-xl p-4 font-bold text-base flex items-center justify-center gap-2"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    Enviar pedido por WhatsApp
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}