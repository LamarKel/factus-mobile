import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email.trim() || !password) {
        toast.error("Completa email y contraseña.");
        return;
      }

      if (mode === "signup") {
        if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres."); return; }
        if (password !== password2) { toast.error("Las contraseñas no coinciden."); return; }
        if (!businessName.trim()) { toast.error("Pon el nombre de la empresa."); return; }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: {
            data: {
              full_name: fullName.trim(), business_name: businessName.trim(),
              phone: phone.trim(), address: address.trim(),
            },
          },
        });

        if (error) { toast.error(error.message); return; }

        if (!data?.session) {
          toast.success("Cuenta creada. Revisa tu correo y confirma para iniciar sesión.");
          setMode("login"); setPassword(""); setPassword2("");
          return;
        }

        toast.success("Cuenta creada ✅");
        nav("/");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });

      if (error) { toast.error("Credenciales inválidas o correo sin confirmar."); return; }

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* ── Logo / Brand ── */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center font-bold text-xl mx-auto mb-3">
            F
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Factus</h1>
          <p className="text-sm text-gray-400 mt-1">
            {mode === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
          </p>
        </div>

        {/* ── Card ── */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
            <button type="button" onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === "login" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}>
              Iniciar sesión
            </button>
            <button type="button" onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === "signup" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}>
              Crear cuenta
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">

            {/* Email */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <input
                className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300 bg-gray-50"
                placeholder="tu@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Contraseña</label>
              <div className="relative">
                <input
                  className="w-full border border-gray-100 rounded-xl p-3 pr-10 text-sm focus:outline-none focus:border-gray-300 bg-gray-50"
                  placeholder="••••••••"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Campos de signup */}
            {mode === "signup" && (
              <>
                {/* Repetir contraseña */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Repetir contraseña</label>
                  <div className="relative">
                    <input
                      className="w-full border border-gray-100 rounded-xl p-3 pr-10 text-sm focus:outline-none focus:border-gray-300 bg-gray-50"
                      placeholder="••••••••"
                      type={showPass2 ? "text" : "password"}
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPass2((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass2 ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500 font-medium mb-3">Datos del negocio</p>

                  <div className="space-y-2">
                    <input
                      className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300 bg-gray-50"
                      placeholder="Nombre de la empresa *"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                    <input
                      className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300 bg-gray-50"
                      placeholder="Tu nombre (opcional)"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300 bg-gray-50"
                        placeholder="Teléfono"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      <input
                        className="w-full border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-300 bg-gray-50"
                        placeholder="Dirección"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 mt-2">
                    Recibirás un correo de confirmación antes de poder iniciar sesión.
                  </p>
                </div>
              </>
            )}

            <button
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60 transition mt-2"
              type="submit"
            >
              {loading
                ? "Procesando..."
                : mode === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Factus · Sistema de facturación
        </p>
      </div>
    </div>
  );
}