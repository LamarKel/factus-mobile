// Colores del catálogo público.
// Cada tema define 5 colores base; los tonos intermedios (texto secundario,
// bordes, texto sobre botones) se calculan para que siempre combinen.

export const COLORES_EDITABLES = [
    { key: "bg", label: "Fondo" },
    { key: "surface", label: "Tarjetas y encabezado" },
    { key: "soft", label: "Portada y detalles" },
    { key: "primary", label: "Botones y pie de página" },
    { key: "text", label: "Texto" },
];

export const TEMAS_CATALOGO = {
    clasico: { nombre: "Clásico", bg: "#f9fafb", surface: "#ffffff", soft: "#f3f4f6", primary: "#111827", text: "#111827" },
    natural: { nombre: "Natural", bg: "#f6f3ec", surface: "#fffdf8", soft: "#ece6d9", primary: "#3f4a33", text: "#2b2a25" },
    rosa: { nombre: "Rosa suave", bg: "#fdf6f7", surface: "#ffffff", soft: "#f8e8eb", primary: "#9d4b5f", text: "#3a2a2e" },
    marino: { nombre: "Azul marino", bg: "#f4f6f9", surface: "#ffffff", soft: "#e6ebf2", primary: "#1f3354", text: "#16233a" },
    terracota: { nombre: "Terracota", bg: "#faf5f0", surface: "#fffcf8", soft: "#f1e4d8", primary: "#a4532f", text: "#33251d" },
    noche: { nombre: "Noche", bg: "#14161a", surface: "#1d2026", soft: "#262a31", primary: "#e8c37a", text: "#f2f2f0" },
};

export const TEMA_DEFAULT = "clasico";

export const esHexValido = (c) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);

const hexARgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbAHex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

// Mezcla dos colores: peso = cuánto de `b` (0 a 1)
export const mezclar = (a, b, peso) => {
    const [ra, ga, ba] = hexARgb(a);
    const [rb, gb, bb] = hexARgb(b);
    return rgbAHex([ra + (rb - ra) * peso, ga + (gb - ga) * peso, ba + (bb - ba) * peso]);
};

const luminancia = (hex) => {
    const [r, g, b] = hexARgb(hex).map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contraste = (a, b) => {
    const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
};

// Texto blanco o casi negro según la luminosidad del color de fondo
export const colorTextoSobre = (hex) => (contraste(hex, "#ffffff") >= contraste(hex, "#111111") ? "#ffffff" : "#111111");

// Genera una paleta completa que combina con un solo color de marca
export function paletaDesdeColor(color, oscuro = false) {
    if (oscuro) {
        const base = mezclar("#111111", color, 0.08);
        return {
            bg: base,
            surface: mezclar(base, "#ffffff", 0.05),
            soft: mezclar(base, color, 0.12),
            primary: color,
            text: mezclar("#f5f5f5", color, 0.06),
        };
    }
    return {
        bg: mezclar("#ffffff", color, 0.04),
        surface: "#ffffff",
        soft: mezclar("#ffffff", color, 0.12),
        primary: color,
        text: mezclar("#111111", color, 0.18),
    };
}

// Completa los colores base con los tonos derivados
export function construirTema(base) {
    return {
        ...base,
        onPrimary: colorTextoSobre(base.primary),
        text2: mezclar(base.text, base.bg, 0.22),
        muted: mezclar(base.text, base.bg, 0.45),
        border: mezclar(base.text, base.bg, 0.86),
    };
}

// Avisos de colores que no se leerían bien
export function avisosContraste(base) {
    const avisos = [];
    if (contraste(base.text, base.bg) < 4.5) avisos.push("El texto casi no se lee sobre el fondo.");
    if (contraste(base.text, base.surface) < 4.5) avisos.push("El texto casi no se lee sobre las tarjetas.");
    if (contraste(base.text, base.soft) < 3) avisos.push("El texto casi no se lee sobre la portada.");
    return avisos;
}

// Valida lo guardado en perfiles.tema_catalogo: { tema, colores: {bg, surface, soft, primary, text}, marca, oscuro }
export function leerTemaGuardado(valor) {
    if (!valor || typeof valor !== "object") return null;
    const c = valor.colores ?? {};
    if (!COLORES_EDITABLES.every(({ key }) => esHexValido(c[key]))) return null;
    const colores = Object.fromEntries(COLORES_EDITABLES.map(({ key }) => [key, c[key]]));
    return {
        tema: valor.tema in TEMAS_CATALOGO ? valor.tema : "personalizado",
        colores,
        marca: esHexValido(valor.marca) ? valor.marca : null,
        oscuro: !!valor.oscuro,
    };
}

// Prioridad: vista previa del link (?tema= / ?c=bg,surface,soft,primary,text sin #) > lo guardado > Clásico
export function resolverTema({ temaId, colores, guardado } = {}) {
    if (colores) {
        const partes = colores.split(",").map((c) => `#${c}`);
        if (partes.length === 5 && partes.every(esHexValido)) {
            const [bg, surface, soft, primary, text] = partes;
            return construirTema({ bg, surface, soft, primary, text });
        }
    }
    if (TEMAS_CATALOGO[temaId]) return construirTema(TEMAS_CATALOGO[temaId]);
    const g = leerTemaGuardado(guardado);
    if (g) return construirTema(g.colores);
    return construirTema(TEMAS_CATALOGO[TEMA_DEFAULT]);
}

export const coloresAParam = (base) => COLORES_EDITABLES.map(({ key }) => base[key].slice(1)).join(",");

// Variables CSS que usan las clases `cat-*` de Tailwind
export function estiloTema(tema) {
    return {
        "--cat-bg": tema.bg,
        "--cat-surface": tema.surface,
        "--cat-soft": tema.soft,
        "--cat-primary": tema.primary,
        "--cat-on-primary": tema.onPrimary,
        "--cat-text": tema.text,
        "--cat-text2": tema.text2,
        "--cat-muted": tema.muted,
        "--cat-border": tema.border,
    };
}
