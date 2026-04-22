import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Perfil() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("error"); // "error" | "success"

    const [form, setForm] = useState({
        nombre_tienda: "",
        telefono: "",
        logo_url: "",
    });

    // ── Cargar perfil ────────────────────────────────────────
    useEffect(() => {
        const fetchPerfil = async () => {
            const { data: userData } = await supabase.auth.getUser();
            const user = userData.user;

            const { data, error } = await supabase
                .from("perfiles")
                .select("*")
                .eq("user_id", user.id)
                .single();

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

    // ── Subir logo ───────────────────────────────────────────
    const subirLogo = async (file) => {
        const ext = file.name.split(".").pop();
        const fileName = `logo_${Date.now()}.${ext}`;

        const { error } = await supabase.storage
            .from("imagen")
            .upload(fileName, file, { upsert: true });

        if (error) {
            setMsgType("error");
            setMsg("Error al subir logo: " + error.message);
            return;
        }

        const { data } = supabase.storage
            .from("imagen")
            .getPublicUrl(fileName);

        setForm((prev) => ({ ...prev, logo_url: data.publicUrl }));
    };

    // ── Guardar perfil ───────────────────────────────────────
    const handleGuardar = async () => {
        setMsg("");
        if (!form.nombre_tienda.trim()) {
            setMsgType("error");
            return setMsg("El nombre de la tienda es obligatorio.");
        }

        setSaving(true);
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        const payload = {
            user_id: user.id,
            nombre_tienda: form.nombre_tienda.trim(),
            telefono: form.telefono.trim() || null,
            logo_url: form.logo_url.trim() || null,
        };

        const { error } = await supabase
            .from("perfiles")
            .upsert(payload, { onConflict: "user_id" });

        setSaving(false);

        if (error) {
            setMsgType("error");
            setMsg(error.message);
        } else {
            setMsgType("success");
            setMsg("Perfil guardado correctamente.");
        }
    };

    if (loading) return <p className="p-4">Cargando...</p>;

    return (
        <div className="min-h-screen p-4 pb-24">
            <h1 className="text-2xl font-bold mb-6">Perfil de la tienda</h1>

            {/* Logo */}
            <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center bg-gray-50 mb-3">
                    {form.logo_url ? (
                        <img
                            src={form.logo_url}
                            alt="Logo"
                            className="w-full h-full object-contain"
                            onError={(e) => (e.target.style.display = "none")}
                        />
                    ) : (
                        <span className="text-4xl">🏪</span>
                    )}
                </div>

                <label className="flex items-center gap-2 text-sm border rounded-xl px-4 py-2 cursor-pointer text-gray-600 hover:bg-gray-50 transition">
                    📁 Subir logo
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) subirLogo(file);
                        }}
                    />
                </label>

                {form.logo_url && (
                    <button
                        type="button"
                        onClick={() => setForm({ ...form, logo_url: "" })}
                        className="text-xs text-red-500 mt-2 underline"
                    >
                        Quitar logo
                    </button>
                )}
            </div>

            {/* Campos */}
            <div className="space-y-3">
                <div>
                    <label className="text-sm text-gray-500 mb-1 block">
                        Nombre de la tienda *
                    </label>
                    <input
                        className="w-full border rounded-xl p-3"
                        placeholder="Ej: Farmacia Don Juan"
                        value={form.nombre_tienda}
                        onChange={(e) => setForm({ ...form, nombre_tienda: e.target.value })}
                    />
                </div>

                <div>
                    <label className="text-sm text-gray-500 mb-1 block">
                        Teléfono / WhatsApp
                    </label>
                    <input
                        className="w-full border rounded-xl p-3"
                        placeholder="Ej: 18091234567"
                        inputMode="tel"
                        value={form.telefono}
                        onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Sin espacios ni +. Ej: 18091234567
                    </p>
                </div>
            </div>

            {/* Mensaje */}
            {msg && (
                <div className={`mt-4 text-sm px-3 py-2 rounded-xl ${msgType === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-600"
                    }`}>
                    {msg}
                </div>
            )}

            {/* Botón guardar */}
            <button
                onClick={handleGuardar}
                disabled={saving}
                className="w-full mt-6 bg-black text-white rounded-xl p-4 font-semibold disabled:opacity-50"
            >
                {saving ? "Guardando..." : "Guardar perfil"}
            </button>
        </div>
    );
}