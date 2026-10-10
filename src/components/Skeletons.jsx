// Placeholders de carga con el mismo estilo que AppSkeleton (animate-pulse, tarjetas grises)

const Barra = ({ className = "" }) => <div className={`rounded bg-gray-200 ${className}`} />;

// Lista de tarjetas (clientes, productos, facturas, abonos...)
export function SkeletonLista({ filas = 6, avatar = true }) {
    return (
        <div className="space-y-2 animate-pulse">
            {Array.from({ length: filas }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
                    {avatar && <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />}
                    <div className="flex-1 min-w-0 space-y-2">
                        <Barra className="h-3.5 w-2/5" />
                        <Barra className="h-2.5 w-1/4 bg-gray-100" />
                    </div>
                    <div className="space-y-2 flex flex-col items-end">
                        <Barra className="h-3.5 w-20" />
                        <Barra className="h-2.5 w-12 bg-gray-100" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// Filas pequeñas dentro de un modal o tarjeta
export function SkeletonFilas({ filas = 2 }) {
    return (
        <div className="space-y-2 animate-pulse">
            {Array.from({ length: filas }).map((_, i) => (
                <div key={i} className="flex items-center justify-between border border-gray-100 rounded-xl p-3">
                    <div className="flex-1 space-y-2">
                        <Barra className="h-3 w-1/2" />
                        <Barra className="h-2.5 w-1/4 bg-gray-100" />
                    </div>
                    <Barra className="h-3.5 w-16 ml-3" />
                </div>
            ))}
        </div>
    );
}

// Gráfica de barras
export function SkeletonGrafica({ alto = "h-48" }) {
    const alturas = [45, 70, 35, 85, 55, 65, 40];
    return (
        <div className={`${alto} flex items-end gap-3 px-2 animate-pulse`}>
            {alturas.map((h, i) => (
                <div key={i} className="flex-1 rounded-t-lg bg-gray-100" style={{ height: `${h}%` }} />
            ))}
        </div>
    );
}

// Página completa: título, acciones y contenido en tarjetas
export function SkeletonPagina({ ancho = "max-w-5xl", filas = 5 }) {
    return (
        <div className={`p-4 lg:p-6 ${ancho} mx-auto pb-24 animate-pulse`}>
            <div className="flex items-center justify-between mb-5">
                <div className="space-y-2">
                    <Barra className="h-5 w-36" />
                    <Barra className="h-2.5 w-24 bg-gray-100" />
                </div>
                <div className="h-9 w-28 rounded-xl bg-gray-200" />
            </div>
            <div className="h-10 rounded-xl bg-white border border-gray-100 mb-4" />
            <div className="space-y-2">
                {Array.from({ length: filas }).map((_, i) => (
                    <div key={i} className="h-20 rounded-2xl bg-white border border-gray-100" />
                ))}
            </div>
        </div>
    );
}

// Pantalla de facturar: buscador, cuadrícula de productos y carrito (PC)
export function SkeletonFacturar() {
    return (
        <div className="h-[calc(100vh-56px)] flex flex-col lg:flex-row overflow-hidden animate-pulse">
            <div className="flex-1 flex flex-col min-h-0">
                <div className="p-3 border-b border-gray-100 bg-white space-y-2">
                    <div className="flex gap-2">
                        <div className="flex-1 h-10 rounded-xl bg-gray-100" />
                        <div className="w-10 h-10 rounded-xl bg-gray-100" />
                    </div>
                    <div className="flex gap-2">
                        {[16, 20, 14, 18].map((w, i) => (
                            <div key={i} className="h-7 rounded-full bg-gray-100" style={{ width: `${w * 4}px` }} />
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-hidden p-3">
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="bg-white border border-gray-100 rounded-xl p-2">
                                <div className="aspect-square rounded-lg bg-gray-100" />
                                <Barra className="h-2.5 w-3/4 mt-2" />
                                <Barra className="h-3 w-1/2 mt-1.5" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="hidden lg:flex flex-col w-80 border-l border-gray-100 bg-white p-4 gap-3">
                <Barra className="h-4 w-24" />
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl bg-gray-100" />
                ))}
                <div className="mt-auto h-12 rounded-xl bg-gray-200" />
            </div>
        </div>
    );
}
