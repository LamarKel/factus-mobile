import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
import { Bluetooth, Printer, RefreshCw } from "lucide-react";
import { IMPRESORA_KEY, pedirPermisoBluetooth, imprimirBytes, asegurarBluetoothActivo } from "../lib/bluetoothPrinter";

export default function Impresora() {
    const nativo = Capacitor.isNativePlatform();
    const [dispositivos, setDispositivos] = useState([]);
    const [seleccionada, setSeleccionada] = useState(localStorage.getItem(IMPRESORA_KEY) || "");
    const [buscando, setBuscando] = useState(false);
    const [imprimiendo, setImprimiendo] = useState(false);
    const [estado, setEstado] = useState("");
    const [estadoTipo, setEstadoTipo] = useState("info");

    const listarDispositivos = () => {
        setBuscando(true);
        setEstado("");
        asegurarBluetoothActivo()
            .then(() => pedirPermisoBluetooth())
            .then(() => {
                try {
                    window.bluetoothSerial.list(
                        (devices) => { setDispositivos(devices); setBuscando(false); },
                        (err) => {
                            setEstado("No se pudo listar dispositivos: " + err);
                            setEstadoTipo("error");
                            setBuscando(false);
                        }
                    );
                } catch (err) {
                    setEstado("No se pudo listar dispositivos: " + err.message);
                    setEstadoTipo("error");
                    setBuscando(false);
                }
            })
            .catch((err) => {
                setEstado(err);
                setEstadoTipo("error");
                setBuscando(false);
            });
    };

    useEffect(() => {
        if (!nativo) return;
        queueMicrotask(() => listarDispositivos());
    }, [nativo]);

    const seleccionar = (address) => {
        setSeleccionada(address);
        localStorage.setItem(IMPRESORA_KEY, address);
        setEstado("Impresora guardada.");
        setEstadoTipo("ok");
    };

    const quitarImpresora = () => {
        setSeleccionada("");
        localStorage.removeItem(IMPRESORA_KEY);
        setEstado("Impresora quitada. La factura volverá a imprimirse como antes.");
        setEstadoTipo("info");
    };

    const imprimirPrueba = () => {
        if (!seleccionada) {
            setEstado("Primero selecciona una impresora de la lista.");
            setEstadoTipo("error");
            return;
        }
        setImprimiendo(true);
        setEstado("Conectando...");
        setEstadoTipo("info");

        const encoder = new ReceiptPrinterEncoder({ language: "esc-pos", columns: 32 });
        const bytes = encoder
            .initialize()
            .align("center")
            .bold(true)
            .line("PRUEBA DE IMPRESION")
            .bold(false)
            .line("Factus Mobile")
            .newline()
            .align("left")
            .line("Si ves este ticket, la conexion")
            .line("Bluetooth con la impresora")
            .line("quedo funcionando bien.")
            .newline()
            .cut()
            .encode();

        imprimirBytes(bytes)
            .then(() => {
                setEstado("¡Impreso correctamente!");
                setEstadoTipo("ok");
                setImprimiendo(false);
            })
            .catch((err) => {
                setEstado(err);
                setEstadoTipo("error");
                setImprimiendo(false);
            });
    };

    if (!nativo) {
        return (
            <div className="p-4 max-w-lg mx-auto">
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
                    La impresión Bluetooth solo funciona dentro de la app instalada en Android,
                    no en el navegador de escritorio.
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 max-w-lg mx-auto space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold text-gray-900">Impresora Bluetooth</h1>
                <button onClick={listarDispositivos} disabled={buscando}
                    className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-100 rounded-xl px-3 py-1.5">
                    <RefreshCw size={14} className={buscando ? "animate-spin" : ""} />
                    Buscar
                </button>
            </div>

            <p className="text-xs text-gray-400">
                Si no usas impresora térmica, no hace falta que configures nada aquí — la
                factura se sigue imprimiendo como siempre. Esto es solo para quien tenga una
                impresora Bluetooth como la PT-210.
            </p>
            <p className="text-xs text-gray-400">
                Empareja primero la impresora desde los ajustes de Bluetooth del sistema.
                Luego selecciónala aquí.
            </p>

            <div className="space-y-2">
                {dispositivos.length === 0 && !buscando && (
                    <div className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">
                        No hay dispositivos emparejados. Empareja la impresora desde Ajustes.
                    </div>
                )}
                {dispositivos.map((d) => (
                    <button key={d.address} onClick={() => seleccionar(d.address)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left ${seleccionada === d.address ? "border-gray-900 bg-gray-50" : "border-gray-100"
                            }`}>
                        <Bluetooth size={16} className="text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{d.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{d.address}</p>
                        </div>
                        {seleccionada === d.address && (
                            <span className="ml-auto text-xs font-semibold text-gray-900">Seleccionada</span>
                        )}
                    </button>
                ))}
            </div>

            {estado && (
                <div className={`text-xs rounded-xl p-3 border ${estadoTipo === "error"
                        ? "bg-red-50 border-red-100 text-red-600"
                        : estadoTipo === "ok"
                            ? "bg-green-50 border-green-100 text-green-700"
                            : "bg-gray-50 border-gray-100 text-gray-600"
                    }`}>
                    {estado}
                </div>
            )}

            <button onClick={imprimirPrueba} disabled={imprimiendo || !seleccionada}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
                <Printer size={16} />
                {imprimiendo ? "Imprimiendo..." : "Imprimir ticket de prueba"}
            </button>

            {seleccionada && (
                <button onClick={quitarImpresora}
                    className="w-full text-xs text-gray-400 underline text-center">
                    Quitar impresora configurada
                </button>
            )}
        </div>
    );
}
