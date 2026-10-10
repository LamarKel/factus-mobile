import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import imageCompression from "browser-image-compression";
import { QRCodeCanvas } from "qrcode.react";
import { Upload, Link, Copy, Check, Store, Printer, Download, Palette, Heart, ShoppingBag } from "lucide-react";
import {
    TEMAS_CATALOGO, TEMA_DEFAULT, COLORES_EDITABLES, construirTema, estiloTema,
    paletaDesdeColor, avisosContraste, coloresAParam, leerTemaGuardado,
} from "../lib/temasCatalogo";

// Colores base de un tema (sin el nombre)
const baseDeTema = (id) => Object.fromEntries(COLORES_EDITABLES.map(({ key }) => [key, TEMAS_CATALOGO[id][key]]));

export default function Perfil() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("error");
    const [userId, setUserId] = useState("");
    const [copied, setCopied] = useState(false);
    // Apariencia del catálogo (solo vista previa por ahora, aún no se guarda)
    const [tema, setTema] = useState(TEMA_DEFAULT); // id del tema o "personalizado"
    const [colores, setColores] = useState(() => baseDeTema(TEMA_DEFAULT));
    const [colorMarca, setColorMarca] = useState("#7c3aed");
    const [marcaOscuro, setMarcaOscuro] = useState(false);
    const [verAjustes, setVerAjustes] = useState(false);

    const elegirTema = (id) => {
        setTema(id);
        setColores(baseDeTema(id));
    };
    const generarDesdeMarca = (color, oscuro) => {
        setColorMarca(color);
        setMarcaOscuro(oscuro);
        setTema("personalizado");
        setColores(paletaDesdeColor(color, oscuro));
    };
    const cambiarColor = (key, valor) => {
        setTema("personalizado");
        setColores((prev) => ({ ...prev, [key]: valor }));
    };

    const [form, setForm] = useState({
        nombre_tienda: "", telefono: "", logo_url: "", direccion: "", copias_ticket: 1,
    });

    useEffect(() => {
        const fetchPerfil = async () => {
            const { data: userData } = await supabase.auth.getUser();
            const user = userData.user;
            setUserId(user.id);

            const { data } = await supabase
                .from("perfiles").select("*")
                .eq("user_id", user.id).single();

            if (data) {
                setForm({
                    nombre_tienda: data.nombre_tienda ?? "",
                    telefono: data.telefono ?? "",
                    logo_url: data.logo_url ?? "",
                    direccion: data.direccion ?? "",
                    copias_ticket: data.copias_ticket ?? 1,
                });
                const guardado = leerTemaGuardado(data.tema_catalogo);
                if (guardado) {
                    setTema(guardado.tema);
                    setColores(guardado.colores);
                    if (guardado.marca) setColorMarca(guardado.marca);
                    setMarcaOscuro(guardado.oscuro);
                }
            }
            setLoading(false);
        };
        fetchPerfil();
    }, []);

    const subirLogo = async (file) => {
        setUploading(true);
        try {
            const opciones = { maxSizeMB: 0.3, maxWidthOrHeight: 400, useWebWorker: true, fileType: "image/webp" };
            const compressed = await imageCompression(file, opciones);
            const fileName = `logo_${Date.now()}.webp`;

            const { error } = await supabase.storage
                .from("imagen").upload(fileName, compressed, { upsert: true, contentType: "image/webp" });

            if (error) { setMsgType("error"); setMsg("Error al subir logo: " + error.message); return; }

            const { data } = supabase.storage.from("imagen").getPublicUrl(fileName);
            setForm((prev) => ({ ...prev, logo_url: data.publicUrl }));
        } catch (err) {
            setMsgType("error"); setMsg("Error: " + err.message);
        } finally { setUploading(false); }
    };

    const handleGuardar = async () => {
        setMsg("");
        if (!form.nombre_tienda.trim()) {
            setMsgType("error"); return setMsg("El nombre de la tienda es obligatorio.");
        }
        setSaving(true);
        const { data: userData } = await supabase.auth.getUser();

        const { error } = await supabase.from("perfiles").upsert({
            user_id: userData.user.id,
            nombre_tienda: form.nombre_tienda.trim(),
            telefono: form.telefono.trim() || null,
            logo_url: form.logo_url.trim() || null,
            direccion: form.direccion.trim() || null,
            copias_ticket: form.copias_ticket,
            tema_catalogo: { tema, colores, marca: colorMarca, oscuro: marcaOscuro },
        }, { onConflict: "user_id" });

        setSaving(false);
        if (error) { setMsgType("error"); setMsg(error.message); }
        else { setMsgType("success"); setMsg("Perfil guardado correctamente."); }
    };

    const copiarLink = () => {
        navigator.clipboard.writeText(catalogoUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // En la app Android el origin es https://localhost; VITE_PUBLIC_URL apunta al dominio de Netlify
    const baseUrl = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/$/, "");
    const catalogoUrl = `${baseUrl}/catalogo/${userId}`;

    const descargarQR = () => {
        const canvas = document.getElementById("qr-catalogo");
        if (!canvas) return;
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `qr-catalogo-${(form.nombre_tienda || "tienda").trim().replace(/\s+/g, "-").toLowerCase()}.png`;
        a.click();
    };

    if (loading) return (
        <div className="w-full p-4 lg:p-6 lg:max-w-6xl lg:mx-auto pb-24 animate-pulse">
            <div className="mb-6 space-y-2">
                <div className="h-5 w-44 rounded bg-gray-200" />
                <div className="h-3 w-64 rounded bg-gray-100" />
            </div>
            <div className="lg:grid lg:grid-cols-2 lg:gap-x-6 lg:items-start">
                <div className="space-y-4">
                    <div className="h-28 rounded-2xl bg-white border border-gray-100" />
                    <div className="h-72 rounded-2xl bg-white border border-gray-100" />
                    <div className="h-96 rounded-2xl bg-white border border-gray-100" />
                </div>
                <div className="space-y-4 mt-4 lg:mt-0">
                    <div className="h-[36rem] rounded-2xl bg-white border border-gray-100" />
                    <div className="hidden lg:block h-40 rounded-2xl bg-white border border-gray-100" />
                </div>
            </div>
            <div className="h-12 mt-4 rounded-xl bg-gray-200" />
        </div>
    );

    return (
        <div className="w-full p-4 lg:p-6 lg:max-w-6xl lg:mx-auto pb-24 flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-6 lg:items-start">

            <div className="lg:col-span-2">
            {/* ── Header ── */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">Perfil de la tienda</h1>
                <p className="text-xs text-gray-400 mt-0.5">Información que aparece en el catálogo y los tickets</p>
            </div>
            </div>

            {/* Columna izquierda: logo, datos y link (en móvil las tarjetas se ordenan con order-*) */}
            <div className="contents lg:flex lg:flex-col">
                <div className="order-1">
                {/* ── Logo ── */}
                <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
                    <p className="text-xs text-gray-500 font-medium mb-4">Logo de la tienda</p>

                    <div className="flex items-center gap-3">
                        {/* Preview */}
                        <div className="w-20 h-20 rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                            {form.logo_url ? (
                                <img src={form.logo_url} alt="Logo"
                                    className="w-full h-full object-contain"
                                    onError={(e) => (e.target.style.display = "none")} />
                            ) : (
                                <Store size={28} className="text-gray-300" />
                            )}
                        </div>

                        {/* Acciones */}
                        <div className="flex-1 min-w-0">
                            <label className={`flex items-center gap-2 w-full min-w-0 border border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer text-sm text-gray-500 hover:bg-gray-50 transition ${uploading ? "opacity-50" : ""}`}>
                                <Upload size={14} />
                                {uploading ? "Subiendo..." : "Subir logo"}
                                <input type="file" accept="image/*" className="hidden" disabled={uploading}
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) subirLogo(f); }} />
                            </label>

                            {form.logo_url && (
                                <button type="button" onClick={() => setForm({ ...form, logo_url: "" })}
                                    className="text-xs text-red-500 mt-2 hover:underline">
                                    Quitar logo
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                </div>
                <div className="order-2">
                {/* ── Datos de la tienda ── */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4 space-y-4">
                    <p className="text-xs text-gray-500 font-medium">Información de la tienda</p>

                    <div>
                        <label className="text-xs text-gray-500 mb-1.5 block">Nombre de la tienda *</label>
                        <input
                            className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                            placeholder="Ej: Retro Mini Fragancias"
                            value={form.nombre_tienda}
                            onChange={(e) => setForm({ ...form, nombre_tienda: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 mb-1.5 block">Teléfono / WhatsApp</label>
                        <input
                            className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                            placeholder="18091234567"
                            inputMode="tel"
                            value={form.telefono}
                            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            Sin espacios ni + — se usa para el botón de WhatsApp del catálogo
                        </p>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 mb-1.5 block">Dirección</label>
                        <input
                            className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                            placeholder="Calle, sector, ciudad..."
                            value={form.direccion}
                            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            Aparece en la factura impresa, debajo del teléfono.
                        </p>
                    </div>
                </div>
                </div>
                <div className="order-3">
                {/* ── Link del catálogo ── */}
                {userId && (
                    <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Link size={14} className="text-gray-400" />
                            <p className="text-xs text-gray-500 font-medium">Link de tu catálogo público</p>
                        </div>

                        {/* Preview del catálogo */}
                        <div className="bg-gray-50 rounded-xl p-3 mb-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                                {form.logo_url ? (
                                    <img src={form.logo_url} alt="logo" className="w-full h-full object-contain" />
                                ) : (
                                    <Store size={14} className="text-gray-300" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-gray-900 truncate">
                                    {form.nombre_tienda || "Mi Tienda"}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate">{catalogoUrl}</p>
                            </div>
                        </div>

                        <div className="flex gap-2 min-w-0">
                            <input readOnly
                                className="flex-1 min-w-0 border border-gray-100 rounded-xl p-2.5 text-xs bg-gray-50 text-gray-500 overflow-hidden truncate"
                                value={catalogoUrl}
                            />
                            <button onClick={copiarLink}
                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition ${copied
                                    ? "bg-green-50 border-green-100 text-green-700"
                                    : "border-gray-100 text-gray-600 hover:bg-gray-50"
                                    }`}>
                                {copied ? <Check size={12} /> : <Copy size={12} />}
                                {copied ? "Copiado" : "Copiar"}
                            </button>
                        </div>

                        <button
                            onClick={() => window.open(catalogoUrl, "_blank")}
                            className="w-full mt-2 py-2.5 border border-gray-100 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition"
                        >
                            Ver catálogo →
                        </button>

                        {/* Código QR */}
                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col items-center">
                            <p className="text-xs text-gray-500 font-medium mb-3 self-start">Código QR del catálogo</p>
                            <div className="p-3 bg-white border border-gray-100 rounded-2xl">
                                <QRCodeCanvas id="qr-catalogo" value={catalogoUrl} size={180} marginSize={2} level="M" />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 text-center">
                                Tus clientes pueden escanearlo para abrir el catálogo
                            </p>
                            <button
                                onClick={descargarQR}
                                className="w-full mt-3 flex items-center justify-center gap-1.5 py-2.5 border border-gray-100 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition"
                            >
                                <Download size={12} /> Descargar QR
                            </button>
                        </div>
                    </div>
                )}
                </div>
            </div>

            {/* Columna derecha: apariencia e impresión */}
            <div className="contents lg:flex lg:flex-col">
                <div className="order-4">
                {/* ── Apariencia del catálogo ── */}
                {userId && (() => {
                    const t = construirTema(colores);
                    const avisos = avisosContraste(colores);
                    const params = tema === "personalizado" ? `c=${coloresAParam(colores)}` : `tema=${tema}`;
                    const nombre = form.nombre_tienda || "Mi Tienda";
                    return (
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Palette size={14} className="text-gray-400" />
                                <p className="text-xs text-gray-500 font-medium">Apariencia del catálogo</p>
                            </div>
                            <p className="text-[10px] text-gray-400 mb-4">Los cambios se aplican al catálogo cuando guardas el perfil.</p>

                            {/* Temas */}
                            <p className="text-xs text-gray-500 mb-2">Temas</p>
                            <div className="grid grid-cols-3 gap-2 mb-5">
                                {Object.entries(TEMAS_CATALOGO).map(([id, tm]) => (
                                    <button key={id} type="button" onClick={() => elegirTema(id)}
                                        className={`rounded-xl border p-2 text-left transition ${tema === id ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-100 hover:border-gray-300"}`}>
                                        <div className="flex h-6 rounded-md overflow-hidden border border-black/5">
                                            <span className="flex-1" style={{ background: tm.bg }} />
                                            <span className="flex-1" style={{ background: tm.soft }} />
                                            <span className="flex-1" style={{ background: tm.primary }} />
                                        </div>
                                        <p className="text-[11px] text-gray-700 mt-1.5 truncate">{tm.nombre}</p>
                                    </button>
                                ))}
                            </div>

                            {/* Desde el color de marca */}
                            <p className="text-xs text-gray-500 mb-2">Crear paleta desde mi color</p>
                            <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl mb-5">
                                <input type="color" value={colorMarca}
                                    onChange={(e) => generarDesdeMarca(e.target.value, marcaOscuro)}
                                    className="w-10 h-10 rounded-lg border border-gray-100 cursor-pointer bg-transparent flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 font-medium">Mi color de marca</p>
                                    <p className="text-[11px] text-gray-400">Fondo, tarjetas y textos se ajustan para combinar</p>
                                </div>
                                <div className="flex rounded-lg border border-gray-100 overflow-hidden text-[11px] flex-shrink-0">
                                    {[{ v: false, t: "Claro" }, { v: true, t: "Oscuro" }].map((o) => (
                                        <button key={o.t} type="button" onClick={() => generarDesdeMarca(colorMarca, o.v)}
                                            className={`px-2.5 py-1.5 ${marcaOscuro === o.v ? "bg-gray-900 text-white" : "text-gray-500"}`}>
                                            {o.t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Ajuste fino */}
                            <button type="button" onClick={() => setVerAjustes((v) => !v)}
                                className="w-full flex items-center justify-between text-xs text-gray-500 mb-2">
                                <span>Ajustar cada color</span>
                                <span className="text-gray-400">{verAjustes ? "Ocultar" : "Mostrar"}</span>
                            </button>
                            {verAjustes && (
                                <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 mb-4">
                                    {COLORES_EDITABLES.map(({ key, label }) => (
                                        <label key={key} className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                                            <input type="color" value={colores[key]}
                                                onChange={(e) => cambiarColor(key, e.target.value)}
                                                className="w-8 h-8 rounded-md border border-gray-100 cursor-pointer bg-transparent flex-shrink-0" />
                                            <span className="flex-1 text-sm text-gray-700">{label}</span>
                                            <span className="text-[11px] font-mono text-gray-400 uppercase">{colores[key]}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {avisos.length > 0 && (
                                <div className="mb-4 text-xs px-3 py-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 space-y-0.5">
                                    {avisos.map((a) => <p key={a}>⚠️ {a}</p>)}
                                </div>
                            )}

                            {/* Vista previa en miniatura */}
                            <p className="text-xs text-gray-500 mb-2 mt-1">Vista previa</p>
                            <div className="rounded-xl overflow-hidden border border-gray-100" style={estiloTema(t)}>
                                <div className="bg-cat-bg">
                                    <div className="bg-cat-surface border-b border-cat-border px-3 h-9 flex items-center justify-between">
                                        <span className="font-serif text-sm text-cat-text truncate">{nombre}</span>
                                        <span className="flex gap-2 text-cat-text2"><Heart size={12} /><ShoppingBag size={12} /></span>
                                    </div>
                                    <div className="p-3">
                                        <div className="bg-cat-soft rounded-lg p-3">
                                            <p className="text-[8px] uppercase tracking-widest text-cat-muted">Catálogo</p>
                                            <p className="font-serif text-base text-cat-text leading-tight">{nombre}</p>
                                            <p className="text-[9px] text-cat-text2 mt-0.5">Elige tus productos y pide por WhatsApp.</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 mt-3">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i}>
                                                    <div className="aspect-square rounded-md bg-cat-surface border border-cat-border" />
                                                    <p className="text-[9px] text-cat-text mt-1 leading-tight">Producto {i}</p>
                                                    <p className="text-[8px] text-cat-muted leading-tight">Categoría</p>
                                                    <p className="text-[9px] font-semibold text-cat-text">RD$ 500.00</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 bg-cat-primary text-cat-on-primary rounded-md py-1.5 text-center text-[10px] font-semibold">
                                            Añadir a la bolsa
                                        </div>
                                    </div>
                                    <div className="bg-cat-primary text-cat-on-primary px-3 py-2 font-serif text-xs">{nombre}</div>
                                </div>
                            </div>

                            <button type="button" onClick={() => window.open(`${catalogoUrl}?${params}`, "_blank")}
                                className="w-full mt-3 py-2.5 border border-gray-100 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition">
                                Ver catálogo con estos colores →
                            </button>
                        </div>
                    );
                })()}
                </div>
                <div className="order-6">
                {/* ── Impresión ── */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4 space-y-3">
                    <p className="text-xs text-gray-500 font-medium">Impresión</p>
                    <div>
                        <label className="text-xs text-gray-500 mb-1.5 block">Copias por factura</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[1, 2].map((n) => (
                                <button key={n} type="button"
                                    onClick={() => setForm({ ...form, copias_ticket: n })}
                                    className={`py-2 rounded-xl text-sm font-medium border transition ${form.copias_ticket === n ? "bg-gray-900 text-white border-gray-900" : "border-gray-100 text-gray-600"
                                        }`}>
                                    {n} {n === 1 ? "copia" : "copias"}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                            Solo aplica a la impresión por Bluetooth (ej: una copia para el cliente y otra para la tienda).
                        </p>
                    </div>

                    <button onClick={() => navigate("/impresora")}
                        className="w-full flex items-center justify-center gap-2 py-3 border border-gray-100 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                        <Printer size={14} />
                        Configurar impresora Bluetooth
                    </button>
                </div>
                </div>
            </div>

            <div className="order-5 lg:col-span-2">
            {/* ── Mensaje ── */}
            {msg && (
                <div className={`mb-4 text-xs px-3 py-2.5 rounded-xl ${msgType === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                    }`}>
                    {msg}
                </div>
            )}
            </div>

            <div className="order-7 lg:col-span-2 lg:flex lg:justify-end">
            {/* ── Botón guardar ── */}
            <button onClick={handleGuardar} disabled={saving}
                className="w-full lg:w-72 bg-gray-900 text-white rounded-xl p-4 text-sm font-semibold disabled:opacity-50 transition">
                {saving ? "Guardando..." : "Guardar perfil"}
            </button>
            </div>
        </div>
    );
}