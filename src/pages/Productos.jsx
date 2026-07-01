import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import imageCompression from "browser-image-compression";
import ScannerModal from "../components/ScannerModal";
import { Search, Plus, X, Package, Scan, Upload } from "lucide-react";

const emptyForm = {
  nombre: "", codigo: "", referencia: "", unidad_medida: "",
  precio_venta: "", precio_compra: "", control_inventario: false,
  cantidad: "", imagen_url: "", categoria: "",
};

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catActiva, setCatActiva] = useState("Todo");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [uploading, setUploading] = useState(false);

  const subirImagenOptimizada = async (file, bucket, prefijo = "") => {
    const opciones = { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true, fileType: "image/webp" };
    const compressed = await imageCompression(file, opciones);
    const fileName = `${prefijo}${Date.now()}.webp`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, compressed, { upsert: true, contentType: "image/webp" });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const fetchProductos = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("products").select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });
    if (!error) setProductos(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchProductos(); }, []);

  const categorias = useMemo(() => {
    const cats = [...new Set(productos.map((p) => p.categoria).filter(Boolean))];
    return ["Todo", ...cats];
  }, [productos]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return productos.filter((p) => {
      const matchSearch = !s || `${p.nombre} ${p.codigo} ${p.categoria ?? ""}`.toLowerCase().includes(s);
      const matchCat = catActiva === "Todo" || p.categoria === catActiva;
      return matchSearch && matchCat;
    });
  }, [productos, search, catActiva]);

  const resetForm = () => { setForm(emptyForm); setEditing(null); setMsg(""); };
  const openNew = () => { resetForm(); setShowForm(true); };
  const openEdit = (p) => {
    setMsg(""); setEditing(p.id);
    setForm({
      nombre: p.nombre ?? "", codigo: p.codigo ?? "", referencia: p.referencia ?? "",
      unidad_medida: p.unidad_medida ?? "", precio_venta: String(p.precio_venta ?? ""),
      precio_compra: String(p.precio_compra ?? ""), control_inventario: !!p.control_inventario,
      cantidad: p.cantidad == null ? "" : String(p.cantidad),
      imagen_url: p.imagen_url ?? "", categoria: p.categoria ?? "",
    });
    setShowForm(true);
  };

  const removeProducto = async (id) => {
    if (!confirm("¿Eliminar este producto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    fetchProductos();
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setMsg("");
    if (!form.nombre.trim()) return setMsg("El nombre es obligatorio.");
    if (!form.codigo.trim()) return setMsg("El código es obligatorio.");
    const pv = Number(form.precio_venta);
    const pc = Number(form.precio_compra);
    if (Number.isNaN(pv) || pv < 0) return setMsg("Precio de venta inválido.");
    if (Number.isNaN(pc) || pc < 0) return setMsg("Precio de compra inválido.");

    let cantidadValue = null;
    if (form.control_inventario) {
      if (form.cantidad === "") return setMsg("Pon una cantidad o desactiva control de inventario.");
      const c = Number(form.cantidad);
      if (Number.isNaN(c) || c < 0) return setMsg("Cantidad inválida.");
      cantidadValue = c;
    }

    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      user_id: userData.user.id,
      nombre: form.nombre.trim(), codigo: form.codigo.trim(),
      referencia: form.referencia.trim() || null, unidad_medida: form.unidad_medida.trim() || null,
      precio_venta: pv, precio_compra: pc, control_inventario: !!form.control_inventario,
      cantidad: cantidadValue, imagen_url: form.imagen_url.trim() || null,
      categoria: form.categoria.trim() || null,
    };

    const res = editing
      ? await supabase.from("products").update(payload).eq("id", editing)
      : await supabase.from("products").insert([payload]);

    if (res.error) {
      setMsg(String(res.error.message).toLowerCase().includes("duplicate") ? "Ese código ya existe." : res.error.message);
      return;
    }
    setShowForm(false); resetForm(); fetchProductos();
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto pb-24">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Productos</h1>
          <p className="text-xs text-gray-400 mt-0.5">{productos.length} productos</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={14} /> Nuevo
        </button>
      </div>

      {/* ── Buscador ── */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-300"
          placeholder="Buscar por nombre, código o marca..."
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Filtros por categoría ── */}
      {categorias.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mb-4">
          {categorias.map((cat) => (
            <button key={cat} onClick={() => setCatActiva(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${catActiva === cat ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
                }`}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Lista ── */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <Package size={20} className="text-gray-400" />
          </div>
          <p className="font-medium text-gray-900 text-sm">Sin productos</p>
          <p className="text-xs text-gray-400 mt-1">Agrega tu primer producto</p>
        </div>
      ) : (
        <>
          {/* Desktop — tabla */}
          <div className="hidden lg:block bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Producto</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Código</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Marca</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Venta</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Compra</th>
                  <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Stock</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                          {p.imagen_url ? (
                            <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = "none"; }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-base">🌸</div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{p.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{p.codigo}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.categoria || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 text-xs">
                      RD$ {Number(p.precio_venta).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      RD$ {Number(p.precio_compra).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.control_inventario ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(p.cantidad ?? 0) > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                          }`}>
                          {p.cantidad ?? 0}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(p)}
                          className="text-xs px-3 py-1.5 border border-gray-100 rounded-lg text-gray-600 hover:bg-gray-50">
                          Editar
                        </button>
                        <button onClick={() => removeProducto(p.id)}
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

          {/* Móvil — grid con fotos */}
          <div className="lg:hidden grid grid-cols-2 gap-3">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                {/* Imagen */}
                <div className="w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden relative">
                  {p.imagen_url ? (
                    <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = "none"; }} />
                  ) : (
                    <span className="text-3xl">🌸</span>
                  )}
                  {p.control_inventario && (
                    <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${(p.cantidad ?? 0) > 0 ? "bg-green-500 text-white" : "bg-red-500 text-white"
                      }`}>
                      {(p.cantidad ?? 0) > 0 ? p.cantidad : "Agot."}
                    </span>
                  )}
                </div>

                <div className="p-3">
                  <p className="text-xs font-semibold text-gray-900 leading-tight truncate">{p.nombre}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">{p.codigo}</p>
                  {p.categoria && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{p.categoria}</p>
                  )}
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    RD$ {Number(p.precio_venta).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Compra: RD$ {Number(p.precio_compra).toFixed(2)}
                  </p>

                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => openEdit(p)}
                      className="flex-1 py-1.5 border border-gray-100 rounded-lg text-[10px] font-medium text-gray-600">
                      Editar
                    </button>
                    <button onClick={() => removeProducto(p.id)}
                      className="flex-1 py-1.5 border border-red-100 rounded-lg text-[10px] font-medium text-red-500">
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── MODAL FORMULARIO ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end lg:items-center justify-center z-50">
          <div className="bg-white w-full lg:w-[560px] lg:rounded-3xl rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">
                {editing ? "Editar producto" : "Nuevo producto"}
              </h2>
              <button onClick={() => { setShowForm(false); resetForm(); }}
                className="w-8 h-8 grid place-items-center rounded-xl border border-gray-100">
                <X size={14} />
              </button>
            </div>

            {msg && <div className="mb-3 text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl p-3">{msg}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">

              {/* Código + scanner */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Código *</label>
                  <input className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                    placeholder="Ej: PROD001" value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })} required />
                </div>
                <div className="flex flex-col justify-end">
                  <button type="button" onClick={() => setShowScanner(true)}
                    className="w-11 h-11 border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-50">
                    <Scan size={16} />
                  </button>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
                <input className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                  placeholder="Nombre del producto" value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              </div>

              {/* Marca + unidad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Marca</label>
                  <input className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                    placeholder="Dior, Chanel..." value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Unidad</label>
                  <input className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                    placeholder="unidad, lb, kg..." value={form.unidad_medida}
                    onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })} />
                </div>
              </div>

              {/* Referencia */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Referencia</label>
                <input className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                  placeholder="Referencia interna" value={form.referencia}
                  onChange={(e) => setForm({ ...form, referencia: e.target.value })} />
              </div>

              {/* Imagen */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Imagen</label>
                {form.imagen_url.trim() ? (
                  <div className="relative">
                    <img src={form.imagen_url} alt="Vista previa"
                      className="w-full h-40 object-cover rounded-xl border border-gray-100"
                      onError={(e) => (e.target.style.display = "none")} />
                    <button type="button" onClick={() => setForm({ ...form, imagen_url: "" })}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-lg flex items-center justify-center">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                      placeholder="URL de imagen (https://...)" value={form.imagen_url}
                      onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} />
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <div className="flex-1 h-px bg-gray-100" /><span>o</span><div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <label className={`flex items-center justify-center gap-2 w-full border border-dashed border-gray-200 rounded-xl p-4 cursor-pointer text-sm text-gray-400 hover:bg-gray-50 transition ${uploading ? "opacity-50" : ""}`}>
                      <Upload size={14} />
                      {uploading ? "Subiendo..." : "Subir desde el celular"}
                      <input type="file" accept="image/*" className="hidden" disabled={uploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploading(true);
                          try {
                            const url = await subirImagenOptimizada(file, "imagen", "prod_");
                            setForm((prev) => ({ ...prev, imagen_url: url }));
                          } catch (err) {
                            alert("Error al subir imagen: " + err.message);
                          } finally { setUploading(false); }
                        }} />
                    </label>
                  </div>
                )}
              </div>

              {/* Precios */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Precio venta *</label>
                  <input className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                    placeholder="0.00" inputMode="decimal" value={form.precio_venta}
                    onChange={(e) => setForm({ ...form, precio_venta: e.target.value })} required />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Precio compra *</label>
                  <input className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                    placeholder="0.00" inputMode="decimal" value={form.precio_compra}
                    onChange={(e) => setForm({ ...form, precio_compra: e.target.value })} required />
                </div>
              </div>

              {/* Inventario */}
              <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer">
                <input type="checkbox" checked={form.control_inventario}
                  onChange={(e) => setForm({ ...form, control_inventario: e.target.checked, cantidad: e.target.checked ? form.cantidad : "" })} />
                <div>
                  <p className="text-sm text-gray-900 font-medium">Controlar inventario</p>
                  <p className="text-xs text-gray-400">El stock se descuenta al facturar</p>
                </div>
              </label>

              {form.control_inventario && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Cantidad inicial</label>
                  <input className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300"
                    placeholder="0" inputMode="decimal" value={form.cantidad}
                    onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  className="flex-1 py-3 border border-gray-100 rounded-xl text-sm text-gray-600">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold">
                  {editing ? "Actualizar" : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScanner && (
        <ScannerModal
          onScan={(codigo) => { setForm({ ...form, codigo }); setShowScanner(false); }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}