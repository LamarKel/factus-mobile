import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

 const submit = async (e) => {
  e.preventDefault();
  setMsg("");

  if (!email || !password) return setMsg("Completa email y contraseña.");

  let res;

  if (mode === "login") {
    res = await supabase.auth.signInWithPassword({ email, password });
  } else {
    res = await supabase.auth.signUp({ email, password });
  }

  const { error } = res;

  if (error) return setMsg(error.message);

  nav("/");
};


  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-5">
        <h1 className="text-2xl font-bold mb-1">Factus</h1>
        <p className="text-sm text-gray-600 mb-4">
          {mode === "login" ? "Entra a tu cuenta" : "Crea tu cuenta"}
        </p>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full border rounded-xl p-3"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
          <input
            className="w-full border rounded-xl p-3"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />

          {msg && <div className="text-sm text-red-600">{msg}</div>}

          <button className="w-full bg-black text-white rounded-xl p-3 font-semibold">
            {mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <button
          className="w-full mt-3 text-sm text-gray-700 underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "No tengo cuenta, crear una" : "Ya tengo cuenta, entrar"}
        </button>
      </div>
    </div>
  );
}
