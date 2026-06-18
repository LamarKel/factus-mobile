import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScannerModal({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const containerId = "scanner-container";

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(containerId);
    scannerRef.current = html5QrCode;
    let isScanning = true; // Controla si el escáner sigue activo

    html5QrCode
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        async (decodedText) => {
          // Si ya detectó uno y está procesando el apagado, ignorar lecturas extras
          if (!isScanning) return; 
          isScanning = false;

          try {
            // 1. Apagamos la cámara primero de forma asíncrona
            if (html5QrCode.isScanning) {
              await html5QrCode.stop();
            }
            // 2. Una vez apagada con éxito, enviamos el dato al padre
            onScan(decodedText);
          } catch (err) {
            console.error("Error al detener el escáner en éxito:", err);
            // Enviar el dato igualmente si falla el stop
            onScan(decodedText); 
          }
        },
        () => {
          // Ignorar errores continuos de enfoque
        }
      )
      .catch((err) => {
        alert("No se pudo acceder a la cámara: " + err);
        onClose();
      });

    // Limpieza al desmontar el componente (ej. si el usuario da click en Cerrar)
    return () => {
      isScanning = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((err) => {
          console.error("Error al detener en desmontaje:", err);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <h2 className="font-bold">Escanear código</h2>
        <button onClick={onClose} className="text-sm underline">
          Cerrar
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div id={containerId} className="w-full max-w-sm rounded-2xl overflow-hidden" />
      </div>

      <p className="text-center text-white text-sm pb-6 px-4">
        Apunta la cámara al código de barras del producto
      </p>
    </div>
  );
}
