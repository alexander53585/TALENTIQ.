/* ═══════════════ DESIGN TOKENS — KultuRH Premium Light ════════════════ */
export const C = {
    bg: "#F7F9FC",
    surface: "#FFFFFF",
    surfaceAlt: "#F1F5F9",
    card: "#FFFFFF",
    border: "#D8E1EB",
    borderLight: "#E8EDF3",

    primary: "#3366FF",
    primaryLight: "#5580FF",
    primaryDim: "rgba(51,102,255,0.08)",
    primaryGlow: "rgba(51,102,255,0.15)",

    secondary: "#14B8A6",
    secondaryDim: "rgba(20,184,166,0.08)",

    accent: "#FFB84D",
    accentDim: "rgba(255,184,77,0.10)",

    success: "#18A873",
    successDim: "rgba(24,168,115,0.08)",
    successGlow: "rgba(24,168,115,0.15)",

    error: "#D94A4A",
    errorDim: "rgba(217,74,74,0.08)",

    warn: "#E08A3C",
    warnDim: "rgba(224,138,60,0.08)",

    text: "#182230",
    textSecondary: "#5B6B7F",
    textMuted: "#8FA3C0",

    holo: "linear-gradient(90deg, #7C3AED, #3366FF, #14B8A6)",
    holoShine: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",

    shadow: "0 1px 3px rgba(24,34,48,0.06), 0 1px 2px rgba(24,34,48,0.04)",
    shadowMd: "0 4px 12px rgba(24,34,48,0.07), 0 2px 4px rgba(24,34,48,0.04)",
    shadowLg: "0 10px 30px rgba(24,34,48,0.08), 0 4px 8px rgba(24,34,48,0.04)",
};

export const FONT_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
export const FF = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const KEYFRAMES = `
@import url('${FONT_URL}');
*{box-sizing:border-box;margin:0;padding:0}
body{background:${C.bg};font-family:${FF};color:${C.text};-webkit-font-smoothing:antialiased}
::placeholder{color:${C.textMuted}}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:${C.bg}}
::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(40px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.5;transform:scale(.97)}50%{opacity:1;transform:scale(1.03)}}
@keyframes holoSweep{
  0%{background-position:-200% center}
  100%{background-position:200% center}
}
@keyframes successGlow{
  0%{box-shadow:0 0 0 0 rgba(24,168,115,0.3)}
  50%{box-shadow:0 0 0 8px rgba(24,168,115,0.08)}
  100%{box-shadow:0 0 0 0 rgba(24,168,115,0)}
}
@keyframes checkmark{
  0%{transform:scale(0) rotate(-45deg);opacity:0}
  50%{transform:scale(1.2) rotate(0deg);opacity:1}
  100%{transform:scale(1) rotate(0deg);opacity:1}
}
@keyframes shimmer{
  0%{background-position:-200% 0}
  100%{background-position:200% 0}
}
@keyframes microPress{
  0%{transform:scale(1)}
  40%{transform:scale(0.95)}
  100%{transform:scale(1)}
}
`;

/* ═══════════════ FACTOR OPTIONS (user-friendly, no codes) ════════════════ */
export const FREQ_OPTS = [
    { v: 1, l: "Ocasional", hint: "una o dos veces al mes" },
    { v: 2, l: "Periódica", hint: "una vez por semana" },
    { v: 3, l: "Frecuente", hint: "varias veces por semana" },
    { v: 5, l: "Diaria", hint: "todos los días" },
];

export const IMPACT_OPTS = [
    { v: 1, l: "Bajo", hint: "afecta solo la tarea propia" },
    { v: 2, l: "Medio", hint: "impacta al equipo inmediato" },
    { v: 3, l: "Alto", hint: "impacta a varias áreas" },
    { v: 5, l: "Crítico", hint: "afecta operación o servicio" },
];

export const COMPLEXITY_OPTS = [
    { v: 1, l: "Mínima", hint: "tarea repetitiva y guiada" },
    { v: 2, l: "Baja", hint: "aplica criterio simple" },
    { v: 3, l: "Moderada", hint: "analiza y resuelve variaciones" },
    { v: 4, l: "Alta", hint: "exige decisiones técnicas" },
    { v: 5, l: "Máxima", hint: "define soluciones de alto impacto" },
];

/* ═══════════════ STEPS ═════════════════ */
export const STEPS = [
    { id: 1, label: "Identificación" },
    { id: 2, label: "Funciones" },
    { id: 3, label: "Condiciones" },
    { id: 4, label: "Perfil" },
];

/* ═══════════════ HELPERS ═════════════════ */
export const emptyFn = () => ({
    raw: "", desc: "", freq: 3, impact: 2, complexity: 3,
    aiStatus: null as string | null, aiSuggestion: null as any,
    confirmed: false,
});

// Internal calculation — never shown to user
export const calcScore = (f: { freq?: number | string; impact?: number | string; complexity?: number | string }) =>
    parseInt(String(f.freq || 1)) + (parseInt(String(f.impact || 1)) * parseInt(String(f.complexity || 1)));
