import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import imageCompression from "browser-image-compression";
import { Upload, Link, Copy, Check, Store } from "lucide-react";

export default function Perfil() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("error");
    const [userId, setUserId] = useState("");
    const [copied, setCopied] = useState(false);

    const [form, setForm] = useState({
        nombre_tienda: "", telefono: "", logo_url: "",
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
                });
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
        }, { onConflict: "user_id" });

        setSaving(false);
        if (error) { setMsgType("error"); setMsg(error.message); }
        else { setMsgType("success"); setMsg("Perfil guardado correctamente."); }
    };

    const copiarLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/catalogo/${userId}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const catalogoUrl = `${window.location.origin}/catalogo/${userId}`;

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>
    );

    return (
        <div className="p-4 lg:p-6 max-w-xl mx-auto pb-24">

            {/* ── Header ── */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">Perfil de la tienda</h1>
                <p className="text-xs text-gray-400 mt-0.5">Información que aparece en el catálogo y los tickets</p>
            </div>

            {/* ── Logo ── */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4">
                <p className="text-xs text-gray-500 font-medium mb-4">Logo de la tienda</p>

                <div className="flex items-center gap-5">
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
                    <div className="flex-1">
                        <label className={`flex items-center gap-2 w-full border border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer text-sm text-gray-500 hover:bg-gray-50 transition ${uploading ? "opacity-50" : ""}`}>
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
                        <p className="text-[10px] text-gray-400 mt-1">Se comprime automáticamente a WebP</p>
                    </div>
                </div>
            </div>

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
            </div>

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

                    <div className="flex gap-2">
                        <input readOnly
                            className="flex-1 border border-gray-100 rounded-xl p-2.5 text-xs bg-gray-50 text-gray-500"
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
                </div>
            )}

            {/* ── Mensaje ── */}
            {msg && (
                <div className={`mb-4 text-xs px-3 py-2.5 rounded-xl ${msgType === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                    }`}>
                    {msg}
                </div>
            )}

            {/* ── Botón guardar ── */}
            <button onClick={handleGuardar} disabled={saving}
                className="w-full bg-gray-900 text-white rounded-xl p-4 text-sm font-semibold disabled:opacity-50 transition">
                {saving ? "Guardando..." : "Guardar perfil"}
            </button>
        </div>
    );
}