import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

export default function Login() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email.trim() || !password) {
        toast.error("Completa email y contraseña.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast.error("Credenciales inválidas o correo sin confirmar.");
        setLoading(false);
        return;
      }

      toast.success("Sesión iniciada ✅");
      nav("/");
    } catch (err) {
      console.error(err);
      toast.error("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-white border rounded-3xl p-5 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Factus</h1>
          <p className="text-sm text-gray-600">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full border rounded-xl p-3"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="relative">
            <input
              className="w-full border rounded-xl p-3 pr-14"
              placeholder="Contraseña"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm border rounded-lg px-2 py-1"
            >
              {showPass ? "Ocultar" : "Ver"}
            </button>
          </div>

          <button
            disabled={loading}
            className="w-full bg-black text-white rounded-xl p-3 font-semibold disabled:opacity-60"
            type="submit"
          >
            {loading ? "Procesando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}