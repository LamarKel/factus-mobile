import { Capacitor } from "@capacitor/core";

export const IMPRESORA_KEY = "impresora_bt_address";

export function getImpresoraGuardada() {
    return localStorage.getItem(IMPRESORA_KEY) || "";
}

export function cargarImagen(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

export function tieneImpresoraConfigurada() {
    return Capacitor.isNativePlatform() && !!getImpresoraGuardada();
}

export function pedirPermisoBluetooth() {
    return new Promise((resolve, reject) => {
        const permissions = window.cordova?.plugins?.permissions;
        if (!permissions) { resolve(); return; } // Android < 12, o entorno sin el plugin
        const lista = [permissions.BLUETOOTH_CONNECT, permissions.BLUETOOTH_SCAN];
        try {
            permissions.requestPermissions(
                lista,
                (status) => (status.hasPermission ? resolve() : reject("Permiso de Bluetooth denegado.")),
                () => reject("Permiso de Bluetooth denegado.")
            );
        } catch {
            reject("Permiso de Bluetooth denegado.");
        }
    });
}

// El plugin de Bluetooth puede fallar de forma abrupta (crash nativo) si se
// intenta conectar con el Bluetooth del teléfono apagado. Por eso siempre se
// verifica/activa antes de listar o conectar, en vez de dejar que falle solo.
export function asegurarBluetoothActivo() {
    return new Promise((resolve, reject) => {
        try {
            window.bluetoothSerial.isEnabled(
                () => resolve(),
                () => {
                    try {
                        window.bluetoothSerial.enable(
                            () => resolve(),
                            () => reject("Activa el Bluetooth del teléfono para poder imprimir.")
                        );
                    } catch {
                        reject("Activa el Bluetooth del teléfono para poder imprimir.");
                    }
                }
            );
        } catch {
            reject("Activa el Bluetooth del teléfono para poder imprimir.");
        }
    });
}

export function imprimirBytes(bytes, copias = 1) {
    const address = getImpresoraGuardada();
    if (!address) return Promise.reject("No hay impresora Bluetooth configurada.");
    const total = Math.max(1, copias);

    return asegurarBluetoothActivo()
        .then(() => pedirPermisoBluetooth())
        .then(
            () =>
                new Promise((resolve, reject) => {
                    try {
                        window.bluetoothSerial.connect(
                            address,
                            () => {
                                const escribirCopia = (restantes) => {
                                    window.bluetoothSerial.write(
                                        bytes.buffer,
                                        () => {
                                            if (restantes > 1) escribirCopia(restantes - 1);
                                            else { window.bluetoothSerial.disconnect(); resolve(); }
                                        },
                                        (err) => { window.bluetoothSerial.disconnect(); reject("Error al imprimir: " + err); }
                                    );
                                };
                                escribirCopia(total);
                            },
                            (err) => reject("Error al conectar con la impresora: " + err)
                        );
                    } catch (err) {
                        reject("Error al conectar con la impresora: " + err.message);
                    }
                })
        );
}
