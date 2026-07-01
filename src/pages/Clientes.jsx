import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";
import { Search, Plus, X, Phone, MapPin, CreditCard, User } from "lucide-react";

const emptyForm = {
  nombre: "", apellido: "", telefono: "",
  cedula: "", direccion: "", referencia: "",
};

function getInitials(nombre, apellido) {
  return `${(nombre?.[0] ?? "").toUpperCase()}${(apellido?.[0] ?? "").toUpperCase()}` || "?";
}

const COLORS = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700", "bg-amber-100 text-amber-700", "bg-pink-100 text-pink-700"];

function avatarColor(name) {
  const i = (name?.charCodeAt(0) ?? 0) % COLORS.length;
  return COLORS[i];
}

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setClientes(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchClientes(); }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return clientes;
    return clientes.filter((c) =>
      `${c.nombre ?? ""} ${c.apellido ?? ""} ${c.telefono ?? ""} ${c.cedula ?? ""}`.toLowerCase().includes(s)
    );
  }, [clientes, search]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (c) => {
    setEditing(c.id);
    setForm({
      nombre: c.nombre ?? "", apellido: c.apellido ?? "",
      telefono: c.telefono ?? "", cedula: c.cedula ?? "",
      direccion: c.direccion ?? "", referencia: c.referencia ?? "",
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return toast.error("El nombre es obligatorio.");

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return toast.error(userErr.message);

    if (editing) {
      const { error } = await supabase.from("customers").update({
        nombre: form.nombre, apellido: form.apellido,
        telefono: form.telefono, cedula: form.cedula,
        direccion: form.direccion, referencia: form.referencia,
      }).eq("id", editing);
      if (error) return toast.error(error.message);
      toast.success("Cliente actualizado ✅");
    } else {
      const { error } = await supabase.from("customers").insert([{
        user_id: userData.user.id,
        nombre: form.nombre, apellido: form.apellido,
        telefono: form.telefono, cedula: form.cedula,
        direccion: form.direccion, referencia: form.referencia,
      }]);
      if (error) return toast.error(error.message);
      toast.success("Cliente creado ✅");
    }
    closeForm();
    fetchClientes();
  };

  const deleteCliente = async (id) => {
    if (!confirm("¿Eliminar este cliente?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cliente eliminado ✅");
    fetchClientes();
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto pb-24">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <p className="text-xs text-gray-400 mt-0.5">{clientes.length} registrados</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          <Plus size={14} /> Nuevo
        </button>
      </div>

      {/* ── Buscador ── */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-300"
          placeholder="Buscar por nombre, teléfono o cédula..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <User size={20} className="text-gray-400" />
          </div>
          <p className="font-medium text-gray-900 text-sm">Sin clientes</p>
          <p className="text-xs text-gray-400 mt-1">Agrega tu primer cliente</p>
        </div>
      ) : (
        <>
          {/* Desktop — tabla */}
          <div className="hidden lg:block bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Teléfono</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Cédula</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Dirección</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(c.nombre)}`}>
                          {getInitials(c.nombre, c.apellido)}
                        </div>
                        <span className="font-medium text-gray-900">{c.nombre} {c.apellido}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.telefono || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.cedula || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[160px]">{c.direccion || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(c)}
                          className="text-xs px-3 py-1.5 border border-gray-100 rounded-lg hover:bg-gray-50 text-gray-600">
                          Editar
                        </button>
                        <button onClick={() => deleteCliente(c.id)}
                          className="text-xs px-3 py-1.5 border border-red-100 rounded-lg text-red-500 hover:bg-red-50">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil — cards */}
          <div className="lg:hidden space-y-2">
            {filtered.map((c) => (
              <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(c.nombre)}`}>
                    {getInitials(c.nombre, c.apellido)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {c.nombre} {c.apellido}
                    </p>
                    {c.referencia && (
                      <p className="text-xs text-gray-400 truncate">{c.referencia}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  {c.telefono && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone size={11} className="text-gray-400 flex-shrink-0" />
                      {c.telefono}
                    </div>
                  )}
                  {c.cedula && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <CreditCard size={11} className="text-gray-400 flex-shrink-0" />
                      {c.cedula}
                    </div>
                  )}
                  {c.direccion && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{c.direccion}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 border-t border-gray-50 pt-3">
                  <button onClick={() => openEdit(c)}
                    className="flex-1 py-2 border border-gray-100 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50">
                    Editar
                  </button>
                  <button onClick={() => deleteCliente(c.id)}
                    className="flex-1 py-2 border border-red-100 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── MODAL FORMULARIO ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end lg:items-center justify-center z-50">
          <div className="bg-white w-full lg:w-[480px] lg:rounded-3xl rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">
                {editing ? "Editar cliente" : "Nuevo cliente"}
              </h2>
              <button onClick={closeForm} className="w-8 h-8 grid place-items-center rounded-xl border border-gray-100">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
                  <input className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                    placeholder="Juan" value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Apellido</label>
                  <input className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                    placeholder="Pérez" value={form.apellido}
                    onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Teléfono</label>
                <input className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                  placeholder="809-000-0000" inputMode="tel" value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Cédula</label>
                <input className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                  placeholder="000-0000000-0" value={form.cedula}
                  onChange={(e) => setForm({ ...form, cedula: e.target.value })} />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Dirección</label>
                <input className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                  placeholder="Calle, sector, ciudad..." value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Referencia</label>
                <input className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                  placeholder="¿Cómo llegó al negocio?" value={form.referencia}
                  onChange={(e) => setForm({ ...form, referencia: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm}
                  className="flex-1 py-3 border border-gray-100 rounded-xl text-sm text-gray-600">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold">
                  {editing ? "Actualizar" : "Crear cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}