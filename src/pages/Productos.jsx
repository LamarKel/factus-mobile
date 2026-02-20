import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const emptyForm = {
  nombre: "",
  codigo: "",
  referencia: "",
  unidad_medida: "",
  precio_venta: "",
  precio_compra: "",
  control_inventario: false,
  cantidad: "", // solo si control_inventario = true
};

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState("");

  const fetchProductos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setProductos(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return productos;
    return productos.filter((p) => {
      const t = `${p.nombre} ${p.codigo}`.toLowerCase();
      return t.includes(s);
    });
  }, [productos, search]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setMsg("");
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (p) => {
    setMsg("");
    setEditing(p.id);
    setForm({
      nombre: p.nombre ?? "",
      codigo: p.codigo ?? "",
      referencia: p.referencia ?? "",
      unidad_medida: p.unidad_medida ?? "",
      precio_venta: String(p.precio_venta ?? ""),
      precio_compra: String(p.precio_compra ?? ""),
      control_inventario: !!p.control_inventario,
      cantidad: p.cantidad === null || p.cantidad === undefined ? "" : String(p.cantidad),
    });
    setShowForm(true);
  };

  const removeProducto = async (id) => {
    const ok = confirm("¿Eliminar este producto?");
    if (!ok) return;

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    fetchProductos();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!form.nombre.trim()) return setMsg("El nombre es obligatorio.");
    if (!form.codigo.trim()) return setMsg("El código es obligatorio.");

    const pv = Number(form.precio_venta);
    const pc = Number(form.precio_compra);

    if (Number.isNaN(pv) || pv < 0) return setMsg("Precio de venta inválido.");
    if (Number.isNaN(pc) || pc < 0) return setMsg("Precio de compra inválido.");

    // Cantidad solo si controla inventario
    let cantidadValue = null;
    if (form.control_inventario) {
      if (form.cantidad === "") return setMsg("Pon una cantidad o desactiva control de inventario.");
      const c = Number(form.cantidad);
      if (Number.isNaN(c) || c < 0) return setMsg("Cantidad inválida.");
      cantidadValue = c;
    } else {
      cantidadValue = null;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    const payload = {
      user_id: user.id,
      nombre: form.nombre.trim(),
      codigo: form.codigo.trim(),
      referencia: form.referencia.trim() || null,
      unidad_medida: form.unidad_medida.trim() || null,
      precio_venta: pv,
      precio_compra: pc,
      control_inventario: !!form.control_inventario,
      cantidad: cantidadValue,
    };

    let res;
    if (editing) {
      res = await supabase.from("products").update(payload).eq("id", editing);
    } else {
      res = await supabase.from("products").insert([payload]);
    }

    if (res.error) {
      // Código único por usuario (unique(user_id, codigo))
      if (String(res.error.message).toLowerCase().includes("duplicate")) {
        setMsg("Ese código ya existe. Usa otro.");
      } else {
        setMsg(res.error.message);
      }
      return;
    }

    setShowForm(false);
    resetForm();
    fetchProductos();
  };

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Productos</h1>
        <button onClick={openNew} className="bg-black text-white px-4 py-2 rounded-xl">
          + Nuevo
        </button>
      </div>

      <input
        className="w-full mt-4 border rounded-xl p-3"
        placeholder="Buscar por nombre o código..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="mt-4">Cargando...</p>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.length === 0 && (
            <p className="text-gray-500 text-sm">No hay productos aún.</p>
          )}

          {filtered.map((p) => (
            <div key={p.id} className="border rounded-2xl p-4 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{p.nombre}</p>
                  <p className="text-xs text-gray-600">Código: {p.codigo}</p>
                  <p className="text-sm mt-1">
                    Venta: <span className="font-semibold">RD$ {Number(p.precio_venta).toFixed(2)}</span>
                  </p>
                  <p className="text-xs text-gray-600">
                    Compra: RD$ {Number(p.precio_compra).toFixed(2)}
                  </p>

                  <div className="mt-2 text-xs text-gray-600">
                    {p.control_inventario ? (
                      <span className="inline-flex items-center gap-2">
                        ✅ Control inventario
                        <span className="px-2 py-1 border rounded-full">
                          Cant: {p.cantidad ?? 0}
                        </span>
                      </span>
                    ) : (
                      <span>⚪ Sin control de inventario</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="text-sm px-3 py-2 rounded-xl border"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => removeProducto(p.id)}
                    className="text-sm px-3 py-2 rounded-xl border text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">
                {editing ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-sm underline"
              >
                Cerrar
              </button>
            </div>

            {msg && <div className="mb-3 text-sm text-red-600">{msg}</div>}

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
                placeholder="Código"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                required
              />

              <input
                className="w-full border rounded-xl p-3"
                placeholder="Unidad de medida (ej: unidad, lb, kg, caja...)"
                value={form.unidad_medida}
                onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
              />

              <input
                className="w-full border rounded-xl p-3"
                placeholder="Referencia"
                value={form.referencia}
                onChange={(e) => setForm({ ...form, referencia: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  className="w-full border rounded-xl p-3"
                  placeholder="Precio venta"
                  inputMode="decimal"
                  value={form.precio_venta}
                  onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
                  required
                />
                <input
                  className="w-full border rounded-xl p-3"
                  placeholder="Precio compra"
                  inputMode="decimal"
                  value={form.precio_compra}
                  onChange={(e) => setForm({ ...form, precio_compra: e.target.value })}
                  required
                />
              </div>

              <label className="flex items-center gap-3 p-3 border rounded-xl">
                <input
                  type="checkbox"
                  checked={form.control_inventario}
                  onChange={(e) =>
                    setForm({ ...form, control_inventario: e.target.checked, cantidad: e.target.checked ? form.cantidad : "" })
                  }
                />
                <span className="text-sm">Controlar inventario de este producto</span>
              </label>

              {form.control_inventario && (
                <input
                  className="w-full border rounded-xl p-3"
                  placeholder="Cantidad inicial"
                  inputMode="decimal"
                  value={form.cantidad}
                  onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                />
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="w-full border rounded-xl p-3"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="w-full bg-black text-white rounded-xl p-3 font-semibold"
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
