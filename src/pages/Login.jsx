import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

export default function Login() {
  const nav = useNavigate();

  const [mode, setMode] = useState("login"); // login | signup
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  // Datos extra (para profile/PDF)
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
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        if (password.length < 6) {
          toast.error("La contraseña debe tener al menos 6 caracteres.");
          setLoading(false);
          return;
        }
        if (password !== password2) {
          toast.error("Las contraseñas no coinciden.");
          setLoading(false);
          return;
        }
        if (!businessName.trim()) {
          toast.error("Pon el nombre de la empresa.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            // Aquí mandamos los datos extra como metadata (el trigger los guarda en profiles)
            data: {
              full_name: fullName.trim(),
              business_name: businessName.trim(),
              phone: phone.trim(),
              address: address.trim(),
            },
          },
        });

        if (error) {
          toast.error(error.message);
          setLoading(false);
          return;
        }

        // Si confirm email está activo, normalmente NO hay sesión aquí
        if (!data?.session) {
          toast.success("Cuenta creada. Revisa tu correo y CONFIRMA para iniciar sesión.");
          setMode("login");
          setPassword("");
          setPassword2("");
          setLoading(false);
          return;
        }

        toast.success("Cuenta creada ✅");
        nav("/");
        setLoading(false);
        return;
      }

      // LOGIN
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
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Factus</h1>
          <p className="text-sm text-gray-600">
            {mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={
              "p-3 rounded-xl border text-sm " +
              (mode === "login" ? "bg-black text-white border-black" : "bg-white")
            }
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={
              "p-3 rounded-xl border text-sm " +
              (mode === "signup" ? "bg-black text-white border-black" : "bg-white")
            }
          >
            Crear cuenta
          </button>
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

          {mode === "signup" && (
            <>
              <div className="relative">
                <input
                  className="w-full border rounded-xl p-3 pr-14"
                  placeholder="Repetir contraseña"
                  type={showPass2 ? "text" : "password"}
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass2((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm border rounded-lg px-2 py-1"
                >
                  {showPass2 ? "Ocultar" : "Ver"}
                </button>
              </div>

              <div className="border rounded-2xl p-3 bg-gray-50">
                <p className="text-sm font-semibold mb-2">Datos del negocio (para tu PDF)</p>

                <input
                  className="w-full border rounded-xl p-3 mb-2"
                  placeholder="Nombre de la empresa *"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />

                <input
                  className="w-full border rounded-xl p-3 mb-2"
                  placeholder="Tu nombre (opcional)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />

                <input
                  className="w-full border rounded-xl p-3 mb-2"
                  placeholder="Teléfono (opcional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <input
                  className="w-full border rounded-xl p-3"
                  placeholder="Dirección (opcional)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />

                <p className="text-xs text-gray-600 mt-2">
                  Al crear la cuenta te enviaremos un correo. Si tu proyecto requiere confirmación,
                  debes confirmar para poder iniciar sesión.
                </p>
              </div>
            </>
          )}

          <button
            disabled={loading}
            className="w-full bg-black text-white rounded-xl p-3 font-semibold disabled:opacity-60"
            type="submit"
          >
            {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}