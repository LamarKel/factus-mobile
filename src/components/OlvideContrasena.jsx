import { useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";

// En la app Android el origin es https://localhost; VITE_PUBLIC_URL apunta al dominio de Netlify
const baseUrl = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/$/, "");

// Formulario para pedir el enlace de cambio de contraseña por correo
export default function OlvideContrasena({ emailInicial = "", onVolver }) {
    const [email, setEmail] = useState(emailInicial);
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState(false);

    const enviar = async (e) => {
        e.preventDefault();
        if (!email.trim()) { toast.error("Escribe tu correo."); return; }
        setEnviando(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${baseUrl}/restablecer`,
            });
            if (error) {
                toast.error(/rate|seconds/i.test(error.message)
                    ? "Espera un momento antes de pedir otro enlace."
                    : "No se pudo enviar el correo. Intenta de nuevo.");
                return;
            }
            setEnviado(true);
        } catch {
            toast.error(!navigator.onLine
                ? "Sin conexión a internet. Conéctate e intenta de nuevo."
                : "Ocurrió un error. Intenta de nuevo.");
        } finally {
            setEnviando(false);
        }
    };

    if (enviado) return (
        <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-green-50 rounded-2xl grid place-items-center mx-auto text-xl">✉️</div>
            <p className="font-semibold text-gray-900">Revisa tu correo</p>
            <p className="text-sm text-gray-500">
                Si <span className="font-medium text-gray-700">{email.trim()}</span> está registrado,
                te llegará un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.
            </p>
            <button type="button" onClick={onVolver}
                className="w-full border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-700">
                Volver a iniciar sesión
            </button>
        </div>
    );

    return (
        <form onSubmit={enviar} className="space-y-3">
            <div>
                <p className="font-semibold text-gray-900">¿Olvidaste tu contraseña?</p>
                <p className="text-sm text-gray-500 mt-0.5">
                    Escribe tu correo y te enviaremos un enlace para crear una nueva.
                </p>
            </div>
            <input
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-400"
                placeholder="tu@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
            />
            <button disabled={enviando} type="submit"
                className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60">
                {enviando ? "Enviando..." : "Enviar enlace"}
            </button>
            <button type="button" onClick={onVolver}
                className="w-full text-sm text-gray-500 hover:text-gray-800">
                ← Volver a iniciar sesión
            </button>
        </form>
    );
}
