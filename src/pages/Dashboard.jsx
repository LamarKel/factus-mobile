import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Dashboard</h2>
        <button
          className="text-sm underline"
          onClick={() => supabase.auth.signOut()}
        >
          Salir
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl border p-4">
          <p className="text-sm text-gray-600">Facturación</p>
          <p className="text-2xl font-bold">RD$ 0.00</p>
        </div>
        <div className="rounded-2xl border p-4">
          <p className="text-sm text-gray-600">Ganancia</p>
          <p className="text-2xl font-bold">RD$ 0.00</p>
        </div>
        <div className="rounded-2xl border p-4">
          <p className="text-sm text-gray-600">Pendiente por cobrar</p>
          <p className="text-2xl font-bold">RD$ 0.00</p>
        </div>
      </div>
      <button
        onClick={() => nav("/clientes")}
        className="mt-4 w-full bg-black text-white p-3 rounded-xl"
      >
        Ir a Clientes
      </button>
      <button
        onClick={() => nav("/productos")}
        className="mt-3 w-full border p-3 rounded-xl"
      >
        Ir a Productos
      </button>


    </div>

  );
}
