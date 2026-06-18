import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScannerModal({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const containerId = "scanner-container";

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(containerId);
    scannerRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: "environment" }, // cámara trasera
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        (decodedText) => {
          onScan(decodedText);
          html5QrCode.stop().catch(() => {});
        },
        () => {
          // error de lectura por frame, se ignora (pasa constantemente mientras enfoca)
        }
      )
      .catch((err) => {
        alert("No se pudo acceder a la cámara: " + err);
        onClose();
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
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