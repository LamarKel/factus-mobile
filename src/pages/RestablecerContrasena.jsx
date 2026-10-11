import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

// Página a la que llega el enlace del correo de "olvidé mi contraseña".
// Supabase lee el token del enlace y abre una sesión temporal de recuperación.
export default function RestablecerContrasena() {
    const nav = useNavigate();
    const [estado, setEstado] = useState("verificando"); // verificando | listo | invalido
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [verPass, setVerPass] = useState(false);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let resuelto = false;
        const marcar = (valor) => { if (!resuelto) { resuelto = true; setEstado(valor); } };

        const { data: sub } = supabase.auth.onAuthStateChange((evento, sesion) => {
            if (evento === "PASSWORD_RECOVERY" || (sesion && evento === "SIGNED_IN")) marcar("listo");
        });

        // Si el enlace ya se procesó (o no trae token), revisar la sesión actual
        const hayToken = /access_token|code=|type=recovery/.test(window.location.href);
        const errorEnLink = /error_description|error=/.test(window.location.href);
        const timer = setTimeout(async () => {
            if (errorEnLink) { marcar("invalido"); return; }
            const { data } = await supabase.auth.getSession();
            marcar(data.session ? "listo" : "invalido");
        }, hayToken ? 2500 : 300);

        return () => { clearTimeout(timer); sub.subscription.unsubscribe(); };
    }, []);

    const guardar = async (e) => {
        e.preventDefault();
        if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres."); return; }
        if (password !== password2) { toast.error("Las contraseñas no coinciden."); return; }
        setGuardando(true);
        const { error } = await supabase.auth.updateUser({ password });
        setGuardando(false);
        if (error) {
            toast.error(/different|same/i.test(error.message)
                ? "La contraseña nueva debe ser distinta a la anterior."
                : "No se pudo cambiar la contraseña. Pide un enlace nuevo.");
            return;
        }
        toast.success("Contraseña actualizada ✅");
        nav("/", { replace: true });
    };

    const inputCls = "w-full border border-gray-200 rounded-xl p-3 pr-10 text-sm focus:outline-none focus:border-gray-400";

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <h1 className="text-xl font-bold text-gray-900">Factus</h1>

                {estado === "verificando" && (
                    <div className="py-8 grid place-items-center gap-3">
                        <span className="w-7 h-7 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">Verificando enlace...</p>
                    </div>
                )}

                {estado === "invalido" && (
                    <div className="mt-4 space-y-3">
                        <p className="font-semibold text-gray-900">El enlace no es válido o ya venció</p>
                        <p className="text-sm text-gray-500">
                            Los enlaces sirven una sola vez y vencen después de un tiempo. Pide uno nuevo desde el inicio de sesión.
                        </p>
                        <button onClick={() => nav("/login", { replace: true })}
                            className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold">
                            Ir a iniciar sesión
                        </button>
                    </div>
                )}

                {estado === "listo" && (
                    <form onSubmit={guardar} className="mt-4 space-y-3">
                        <div>
                            <p className="font-semibold text-gray-900">Crea tu contraseña nueva</p>
                            <p className="text-sm text-gray-500 mt-0.5">Mínimo 6 caracteres.</p>
                        </div>
                        <div className="relative">
                            <input className={inputCls} placeholder="Contraseña nueva"
                                type={verPass ? "text" : "password"} value={password}
                                onChange={(e) => setPassword(e.target.value)} autoFocus required />
                            <button type="button" onClick={() => setVerPass((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <input className={inputCls} placeholder="Repetir contraseña"
                            type={verPass ? "text" : "password"} value={password2}
                            onChange={(e) => setPassword2(e.target.value)} required />
                        <button disabled={guardando} type="submit"
                            className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60">
                            {guardando ? "Guardando..." : "Guardar contraseña"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
