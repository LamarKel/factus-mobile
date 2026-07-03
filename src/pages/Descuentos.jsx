import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Plus, X, Percent, Tag } from "lucide-react";

const emptyForm = { nombre: "", tipo: "porcentaje", valor: "" };

export default function Descuentos() {
    const [descuentos, setDescuentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [msg, setMsg] = useState("");

    const fetchDescuentos = async () => {
        setLoading(true);
        const { data: userData } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from("discounts").select("*")
            .eq("user_id", userData.user.id)
            .order("created_at", { ascending: false });
        if (!error) setDescuentos(data ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchDescuentos(); }, []);

    const resetForm = () => { setForm(emptyForm); setEditing(null); setMsg(""); };
    const openNew = () => { resetForm(); setShowForm(true); };
    const openEdit = (d) => {
        setMsg(""); setEditing(d.id);
        setForm({ nombre: d.nombre, tipo: d.tipo, valor: String(d.valor) });
        setShowForm(true);
    };

    const toggleActivo = async (d) => {
        await supabase.from("discounts").update({ activo: !d.activo }).eq("id", d.id);
        fetchDescuentos();
    };

    const removeDescuento = async (id) => {
        if (!confirm("¿Eliminar este descuento?")) return;
        const { error } = await supabase.from("discounts").delete().eq("id", id);
        if (error) { alert(error.message); return; }
        fetchDescuentos();
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setMsg("");
        if (!form.nombre.trim()) return setMsg("El nombre es obligatorio.");
        const valor = Number(form.valor);
        if (Number.isNaN(valor) || valor <= 0) return setMsg("El valor debe ser mayor a 0.");
        if (form.tipo === "porcentaje" && valor > 100) return setMsg("El porcentaje no puede ser mayor a 100.");

        const { data: userData } = await supabase.auth.getUser();
        const payload = { user_id: userData.user.id, nombre: form.nombre.trim(), tipo: form.tipo, valor };

        const res = editing
            ? await supabase.from("discounts").update(payload).eq("id", editing)
            : await supabase.from("discounts").insert([payload]);

        if (res.error) { setMsg(res.error.message); return; }
        setShowForm(false); resetForm(); fetchDescuentos();
    };

    const activos = descuentos.filter((d) => d.activo);
    const inactivos = descuentos.filter((d) => !d.activo);

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>
    );

    return (
        <div className="p-4 lg:p-6 max-w-2xl mx-auto pb-24">

            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Descuentos</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {activos.length} activo{activos.length !== 1 ? "s" : ""} · {inactivos.length} inactivo{inactivos.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <button onClick={openNew}
                    className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium">
                    <Plus size={14} /> Nuevo
                </button>
            </div>

            {/* ── Empty state ── */}
            {descuentos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                        <Percent size={20} className="text-gray-400" />
                    </div>
                    <p className="font-medium text-gray-900 text-sm">Sin descuentos</p>
                    <p className="text-xs text-gray-400 mt-1">Crea tu primer descuento para usarlo al facturar</p>
                    <button onClick={openNew}
                        className="mt-4 flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium">
                        <Plus size={14} /> Crear descuento
                    </button>
                </div>
            )}

            {/* ── Descuentos activos ── */}
            {activos.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Activos</p>
                    <div className="space-y-2">
                        {activos.map((d) => (
                            <div key={d.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
                                {/* Ícono */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${d.tipo === "porcentaje" ? "bg-blue-50" : "bg-amber-50"
                                    }`}>
                                    {d.tipo === "porcentaje"
                                        ? <Percent size={18} className="text-blue-600" />
                                        : <Tag size={18} className="text-amber-600" />
                                    }
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-gray-900 truncate">{d.nombre}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {d.tipo === "porcentaje" ? `${d.valor}% de descuento` : `RD$ ${Number(d.valor).toFixed(2)} fijo`}
                                    </p>
                                </div>

                                {/* Acciones */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button onClick={() => toggleActivo(d)}
                                        className="text-[10px] px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 font-medium">
                                        Activo
                                    </button>
                                    <button onClick={() => openEdit(d)}
                                        className="text-xs px-3 py-1.5 border border-gray-100 rounded-lg text-gray-600 hover:bg-gray-50">
                                        Editar
                                    </button>
                                    <button onClick={() => removeDescuento(d.id)}
                                        className="text-xs px-3 py-1.5 border border-red-100 rounded-lg text-red-500 hover:bg-red-50">
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Descuentos inactivos ── */}
            {inactivos.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Inactivos</p>
                    <div className="space-y-2">
                        {inactivos.map((d) => (
                            <div key={d.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-4 opacity-70">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    {d.tipo === "porcentaje"
                                        ? <Percent size={18} className="text-gray-400" />
                                        : <Tag size={18} className="text-gray-400" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-gray-500 truncate">{d.nombre}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {d.tipo === "porcentaje" ? `${d.valor}%` : `RD$ ${Number(d.valor).toFixed(2)}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button onClick={() => toggleActivo(d)}
                                        className="text-[10px] px-2.5 py-1 rounded-full bg-gray-200 text-gray-500 font-medium">
                                        Inactivo
                                    </button>
                                    <button onClick={() => openEdit(d)}
                                        className="text-xs px-3 py-1.5 border border-gray-100 rounded-lg text-gray-500 hover:bg-gray-100">
                                        Editar
                                    </button>
                                    <button onClick={() => removeDescuento(d.id)}
                                        className="text-xs px-3 py-1.5 border border-red-100 rounded-lg text-red-400 hover:bg-red-50">
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── MODAL ── */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 flex items-end lg:items-center justify-center z-50">
                    <div className="bg-white w-full lg:w-[420px] lg:rounded-3xl rounded-t-3xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-gray-900">
                                {editing ? "Editar descuento" : "Nuevo descuento"}
                            </h2>
                            <button onClick={() => { setShowForm(false); resetForm(); }}
                                className="w-8 h-8 grid place-items-center rounded-xl border border-gray-100">
                                <X size={14} />
                            </button>
                        </div>

                        {msg && (
                            <div className="mb-3 text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl p-3">{msg}</div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                                <input
                                    className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                                    placeholder="Ej: Cliente VIP, Black Friday..."
                                    value={form.nombre}
                                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setForm({ ...form, tipo: "porcentaje" })}
                                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition ${form.tipo === "porcentaje" ? "bg-gray-900 text-white border-gray-900" : "border-gray-100 text-gray-600"
                                            }`}>
                                        <Percent size={14} /> Porcentaje
                                    </button>
                                    <button type="button" onClick={() => setForm({ ...form, tipo: "fijo" })}
                                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition ${form.tipo === "fijo" ? "bg-gray-900 text-white border-gray-900" : "border-gray-100 text-gray-600"
                                            }`}>
                                        <Tag size={14} /> Monto fijo
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">
                                    Valor {form.tipo === "porcentaje" ? "(%)" : "(RD$)"}
                                </label>
                                <input
                                    className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                                    placeholder={form.tipo === "porcentaje" ? "Ej: 10" : "Ej: 500"}
                                    inputMode="decimal" value={form.valor}
                                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                                    required
                                />
                                {form.valor && !Number.isNaN(Number(form.valor)) && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        {form.tipo === "porcentaje"
                                            ? `${form.valor}% de descuento sobre el total`
                                            : `RD$ ${Number(form.valor).toFixed(2)} fijo sobre el total`}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                                    className="flex-1 py-3 border border-gray-100 rounded-xl text-sm text-gray-600">
                                    Cancelar
                                </button>
                                <button type="submit"
                                    className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold">
                                    {editing ? "Actualizar" : "Crear descuento"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}