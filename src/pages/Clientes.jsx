import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";


export default function Clientes() {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState("");
    const [editing, setEditing] = useState(null);


    const [form, setForm] = useState({
        nombre: "",
        apellido: "",
        telefono: "",
        cedula: "",
        direccion: "",
        referencia: "",
    });

    const fetchClientes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("customers")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error) setClientes(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchClientes();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (editing) {
            await supabase
                .from("customers")
                .update(form)
                .eq("id", editing);

            setEditing(null);
        } else {
            await supabase.from("customers").insert([
                {
                    user_id: user.id,
                    ...form,
                },
            ]);
        }

        setForm({
            nombre: "",
            apellido: "",
            telefono: "",
            cedula: "",
            direccion: "",
            referencia: "",
        });

        setShowForm(false);
        fetchClientes();
    };


    return (
        <div className="min-h-screen p-4 pb-24">
            <h1 className="text-2xl font-bold mb-4">Clientes</h1>
            <input
                type="text"
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full mb-4 border rounded-xl p-3"
            />


            {loading ? (
                <p>Cargando...</p>
            ) : (
                <div className="space-y-3">
                    {clientes.length === 0 && (
                        <p className="text-gray-500 text-sm">No hay clientes aún.</p>
                    )}

                    {clientes
                        .filter((c) =>
                            `${c.nombre} ${c.apellido}`
                                .toLowerCase()
                                .includes(search.toLowerCase())
                        )
                        .map((c) => (
                            <div
                                key={c.id}
                                className="border rounded-xl p-4 shadow-sm bg-white"
                            >
                                <p className="font-semibold">
                                    {c.nombre} {c.apellido}
                                </p>
                                <p className="text-sm text-gray-600">{c.telefono}</p>
                                <p className="text-sm text-gray-500">{c.direccion}</p>

                                Cuando renderices cada cliente, agrega botón:

                                <div className="flex justify-between items-center mt-2">
                                    <button
                                        onClick={() => {
                                            setEditing(c.id);
                                            setForm(c);
                                            setShowForm(true);
                                        }}
                                        className="text-blue-600 text-sm"
                                    >
                                        Editar
                                    </button>

                                    <button
                                        onClick={async () => {
                                            await supabase.from("customers").delete().eq("id", c.id);
                                            fetchClientes();
                                        }}
                                        className="text-red-600 text-sm"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* Botón flotante */}
            <button
                onClick={() => setShowForm(true)}
                className="fixed bottom-6 right-6 bg-black text-white w-14 h-14 rounded-full text-2xl shadow-lg"
            >
                +
            </button>

            {/* Modal simple */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 flex items-end">
                    <div className="bg-white w-full rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-bold mb-3">Nuevo Cliente</h2>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input
                                className="w-full border rounded-xl p-3"
                                placeholder="Nombre"
                                value={form.nombre}
                                onChange={(e) =>
                                    setForm({ ...form, nombre: e.target.value })
                                }
                                required
                            />

                            <input
                                className="w-full border rounded-xl p-3"
                                placeholder="Apellido"
                                value={form.apellido}
                                onChange={(e) =>
                                    setForm({ ...form, apellido: e.target.value })
                                }
                            />

                            <input
                                className="w-full border rounded-xl p-3"
                                placeholder="Teléfono"
                                value={form.telefono}
                                onChange={(e) =>
                                    setForm({ ...form, telefono: e.target.value })
                                }
                            />

                            <input
                                className="w-full border rounded-xl p-3"
                                placeholder="Cédula"
                                value={form.cedula}
                                onChange={(e) =>
                                    setForm({ ...form, cedula: e.target.value })
                                }
                            />

                            <input
                                className="w-full border rounded-xl p-3"
                                placeholder="Dirección"
                                value={form.direccion}
                                onChange={(e) =>
                                    setForm({ ...form, direccion: e.target.value })
                                }
                            />

                            <input
                                className="w-full border rounded-xl p-3"
                                placeholder="Referencia"
                                value={form.referencia}
                                onChange={(e) =>
                                    setForm({ ...form, referencia: e.target.value })
                                }
                            />

                            <div className="flex gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="w-full border rounded-xl p-3"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="w-full bg-black text-white rounded-xl p-3"
                                >
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
