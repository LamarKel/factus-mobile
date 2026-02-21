import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);

  const emptyForm = {
    nombre: "",
    apellido: "",
    telefono: "",
    cedula: "",
    direccion: "",
    referencia: "",
  };

  const [form, setForm] = useState(emptyForm);

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
    } else {
      setClientes(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c.id);
    setForm({
      nombre: c.nombre ?? "",
      apellido: c.apellido ?? "",
      telefono: c.telefono ?? "",
      cedula: c.cedula ?? "",
      direccion: c.direccion ?? "",
      referencia: c.referencia ?? "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return toast.error(userErr.message);
    const user = userData.user;

    if (!form.nombre.trim()) return toast.error("El nombre es obligatorio.");

    if (editing) {
      const { error } = await supabase
        .from("customers")
        .update({
          nombre: form.nombre,
          apellido: form.apellido,
          telefono: form.telefono,
          cedula: form.cedula,
          direccion: form.direccion,
          referencia: form.referencia,
        })
        .eq("id", editing);

      if (error) return toast.error(error.message);

      toast.success("Cliente actualizado ✅");
    } else {
      const { error } = await supabase.from("customers").insert([
        {
          user_id: user.id,
          nombre: form.nombre,
          apellido: form.apellido,
          telefono: form.telefono,
          cedula: form.cedula,
          direccion: form.direccion,
          referencia: form.referencia,
        },
      ]);

      if (error) return toast.error(error.message);

      toast.success("Cliente creado ✅");
    }

    closeForm();
    fetchClientes();
  };

  const deleteCliente = async (id) => {
    const ok = confirm("¿Seguro que deseas eliminar este cliente?");
    if (!ok) return;

    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return toast.error(error.message);

    toast.success("Cliente eliminado ✅");
    fetchClientes();
  };

  const filtered = clientes.filter((c) =>
    `${c.nombre ?? ""} ${c.apellido ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
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
          {filtered.length === 0 && (
            <p className="text-gray-500 text-sm">No hay clientes aún.</p>
          )}

          {filtered.map((c) => (
            <div key={c.id} className="border rounded-xl p-4 shadow-sm bg-white">
              <p className="font-semibold">
                {c.nombre} {c.apellido}
              </p>
              {c.telefono && <p className="text-sm text-gray-600">{c.telefono}</p>}
              {c.direccion && <p className="text-sm text-gray-500">{c.direccion}</p>}

              <div className="flex justify-between items-center mt-2">
                <button
                  onClick={() => openEdit(c)}
                  className="text-blue-600 text-sm"
                >
                  Editar
                </button>

                <button
                  onClick={() => deleteCliente(c.id)}
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
        onClick={openNew}
        className="fixed bottom-6 right-6 bg-black text-white w-14 h-14 rounded-full text-2xl shadow-lg"
        aria-label="Nuevo cliente"
      >
        +
      </button>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">
                {editing ? "Editar Cliente" : "Nuevo Cliente"}
              </h2>
              <button onClick={closeForm} className="text-sm underline">
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                className="w-full border rounded-xl p-3"
                placeholder="Nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />

              <input
                className="w-full border rounded-xl p-3"
                placeholder="Apellido"
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              />

              <input
                className="w-full border rounded-xl p-3"
                placeholder="Teléfono"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />

              <input
                className="w-full border rounded-xl p-3"
                placeholder="Cédula"
                value={form.cedula}
                onChange={(e) => setForm({ ...form, cedula: e.target.value })}
              />

              <input
                className="w-full border rounded-xl p-3"
                placeholder="Dirección"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              />

              <input
                className="w-full border rounded-xl p-3"
                placeholder="Referencia"
                value={form.referencia}
                onChange={(e) => setForm({ ...form, referencia: e.target.value })}
              />

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={closeForm}
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