import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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
            .from("discounts")
            .select("*")
            .eq("user_id", userData.user.id)
            .order("created_at", { ascending: false });

        if (!error) setDescuentos(data ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchDescuentos(); }, []);

    const resetForm = () => {
        setForm(emptyForm);
        setEditing(null);
        setMsg("");
    };

    const openNew = () => { resetForm(); setShowForm(true); };

    const openEdit = (d) => {
        setMsg("");
        setEditing(d.id);
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
        e.preventDefault();
        setMsg("");

        if (!form.nombre.trim()) return setMsg("El nombre es obligatorio.");
        const valor = Number(form.valor);
        if (Number.isNaN(valor) || valor <= 0) return setMsg("El valor debe ser mayor a 0.");
        if (form.tipo === "porcentaje" && valor > 100) return setMsg("El porcentaje no puede ser mayor a 100.");

        const { data: userData } = await supabase.auth.getUser();

        const payload = {
            user_id: userData.user.id,
            nombre: form.nombre.trim(),
            tipo: form.tipo,
            valor,
        };

        let res;
        if (editing) {
            res = await supabase.from("discounts").update(payload).eq("id", editing);
        } else {
            res = await supabase.from("discounts").insert([payload]);
        }

        if (res.error) { setMsg(res.error.message); return; }

        setShowForm(false);
        resetForm();
        fetchDescuentos();
    };

    if (loading) return <div className="p-4">Cargando...</div>;

    return (
        <div className="min-h-screen p-4 pb-24">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Descuentos</h1>
                <button onClick={openNew} className="bg-black text-white px-4 py-2 rounded-xl">
                    + Nuevo
                </button>
            </div>

            <div className="mt-4 space-y-3">
                {descuentos.length === 0 && (
                    <p className="text-gray-500 text-sm">No hay descuentos configurados.</p>
                )}

                {descuentos.map((d) => (
                    <div key={d.id} className="border rounded-2xl p-4 bg-white shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-semibold">{d.nombre}</p>
                                <p className="text-sm text-gray-600">
                                    {d.tipo === "porcentaje" ? `${d.valor}%` : `RD$ ${Number(d.valor).toFixed(2)}`}
                                </p>
                                <button
                                    onClick={() => toggleActivo(d)}
                                    className={`mt-1 text-xs px-2 py-1 rounded-full ${d.activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                                        }`}
                                >
                                    {d.activo ? "Activo" : "Inactivo"}
                                </button>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => openEdit(d)} className="text-sm px-3 py-2 rounded-xl border">
                                    Editar
                                </button>
                                <button onClick={() => removeDescuento(d.id)} className="text-sm px-3 py-2 rounded-xl border text-red-600">
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/40 flex items-end">
                    <div className="bg-white w-full rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-bold">{editing ? "Editar Descuento" : "Nuevo Descuento"}</h2>
                            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-sm underline">
                                Cerrar
                            </button>
                        </div>

                        {msg && <div className="mb-3 text-sm text-red-600">{msg}</div>}

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input
                                className="w-full border rounded-xl p-3"
                                placeholder="Nombre (ej: Cliente VIP, Black Friday...)"
                                value={form.nombre}
                                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                required
                            />

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, tipo: "porcentaje" })}
                                    className={`p-3 rounded-xl border text-sm ${form.tipo === "porcentaje" ? "bg-black text-white" : "bg-white"}`}
                                >
                                    Porcentaje (%)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, tipo: "fijo" })}
                                    className={`p-3 rounded-xl border text-sm ${form.tipo === "fijo" ? "bg-black text-white" : "bg-white"}`}
                                >
                                    Monto fijo (RD$)
                                </button>
                            </div>

                            <input
                                className="w-full border rounded-xl p-3"
                                placeholder={form.tipo === "porcentaje" ? "Ej: 10" : "Ej: 100"}
                                inputMode="decimal"
                                value={form.valor}
                                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                                required
                            />

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="w-full border rounded-xl p-3">
                                    Cancelar
                                </button>
                                <button type="submit" className="w-full bg-black text-white rounded-xl p-3 font-semibold">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}