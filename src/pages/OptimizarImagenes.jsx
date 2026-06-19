import { useState } from "react";
import { supabase } from "../lib/supabase";
import imageCompression from "browser-image-compression";

export default function OptimizarImagenes() {
    const [log, setLog] = useState([]);
    const [corriendo, setCorriendo] = useState(false);
    const [progreso, setProgreso] = useState({ actual: 0, total: 0 });

    const addLog = (msg) => setLog((prev) => [...prev, msg]);

    const optimizar = async () => {
        setCorriendo(true);
        setLog([]);
        setProgreso({ actual: 0, total: 0 });

        // 1. Traer todos los archivos del bucket
        const { data: archivos, error } = await supabase.storage
            .from("imagen")
            .list("", { limit: 1000 });

        if (error) {
            addLog("❌ Error listando archivos: " + error.message);
            setCorriendo(false);
            return;
        }

        // Solo JPG/PNG — ignorar carpetas y webp ya optimizados
        const imagenes = archivos.filter((f) =>
            f.name.match(/\.(jpg|jpeg|png)$/i)
        );

        setProgreso({ actual: 0, total: imagenes.length });
        addLog(`📦 ${imagenes.length} imágenes encontradas para optimizar`);

        let ahorroTotal = 0;

        for (let i = 0; i < imagenes.length; i++) {
            const archivo = imagenes[i];
            setProgreso({ actual: i + 1, total: imagenes.length });

            try {
                // 2. Descargar la imagen original
                const { data: blob, error: downloadError } = await supabase.storage
                    .from("imagen")
                    .download(archivo.name);

                if (downloadError) {
                    addLog(`⚠️ Error descargando ${archivo.name}: ${downloadError.message}`);
                    continue;
                }

                const pesoOriginal = blob.size;

                // 3. Comprimir
                const opciones = {
                    maxSizeMB: 0.3,
                    maxWidthOrHeight: 800,
                    useWebWorker: true,
                    fileType: "image/webp",
                };

                const file = new File([blob], archivo.name, { type: blob.type });
                const comprimido = await imageCompression(file, opciones);

                const pesoNuevo = comprimido.size;
                const ahorro = pesoOriginal - pesoNuevo;
                ahorroTotal += ahorro;

                // 4. Reemplazar en Supabase con el mismo nombre
                const { error: uploadError } = await supabase.storage
                    .from("imagen")
                    .upload(archivo.name, comprimido, {
                        upsert: true,
                        contentType: "image/webp",
                    });

                if (uploadError) {
                    addLog(`⚠️ Error subiendo ${archivo.name}: ${uploadError.message}`);
                    continue;
                }

                addLog(
                    `✅ ${archivo.name} — ${(pesoOriginal / 1024).toFixed(0)} KB → ${(pesoNuevo / 1024).toFixed(0)} KB (ahorró ${(ahorro / 1024).toFixed(0)} KB)`
                );

            } catch (err) {
                addLog(`❌ Error en ${archivo.name}: ${err.message}`);
            }

            // Pausa pequeña para no saturar la red
            await new Promise((r) => setTimeout(r, 300));
        }

        addLog(`🎉 Listo — Ahorro total: ${(ahorroTotal / 1024 / 1024).toFixed(2)} MB`);
        setCorriendo(false);
    };

    const pct = progreso.total > 0
        ? Math.round((progreso.actual / progreso.total) * 100)
        : 0;

    return (
        <div className="min-h-screen p-4 pb-24">
            <h1 className="text-2xl font-bold mb-2">Optimizar Imágenes</h1>
            <p className="text-sm text-gray-500 mb-4">
                Descarga, comprime y reemplaza todas las imágenes del bucket automáticamente.
            </p>

            <button
                onClick={optimizar}
                disabled={corriendo}
                className="w-full bg-black text-white p-3 rounded-xl font-semibold disabled:opacity-50 mb-4"
            >
                {corriendo ? `Optimizando... (${progreso.actual}/${progreso.total})` : "🚀 Iniciar optimización"}
            </button>

            {/* Barra de progreso */}
            {corriendo && (
                <div className="w-full bg-gray-100 rounded-full h-3 mb-4">
                    <div
                        className="bg-black h-3 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            )}

            {/* Log */}
            {log.length > 0 && (
                <div className="border rounded-2xl p-4 bg-white space-y-1 max-h-[60vh] overflow-y-auto">
                    {log.map((l, i) => (
                        <p key={i} className="text-xs font-mono text-gray-700">{l}</p>
                    ))}
                </div>
            )}
        </div>
    );
}