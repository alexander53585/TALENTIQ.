// ============================================================
// 16PF SCORING ENGINE — TypeScript port
// Verified data from Ps. Octavio Escobar (2009, 2011)
// DO NOT MODIFY SCORING LOGIC
// ============================================================

import type {
  Answers, Decatipos, RawScores, ScoringResult,
  GlobalDims, DerivedEqs, Discriminants, Interpretation,
  Question, FactorDef, FactorDescription, ParseResult,
} from './types';

// ============================================================
// QUESTION BANK (187 items) — exported from 16pf-platform.jsx
// ============================================================
export { QUESTIONS } from './questions';

// ============================================================
// SCORING KEY — verified 100% against sample case
// Format: [scoreA, scoreB, scoreC] — items 1, 2, 187 unscored
// ============================================================
export const SCORING_KEY: Record<number, [number, number, number]> = {
  1:[0,0,0],2:[0,0,0],3:[0,1,0],4:[2,1,0],5:[0,1,2],6:[2,1,0],7:[0,1,2],
  8:[0,1,2],9:[2,1,0],10:[0,1,2],11:[0,1,2],12:[0,1,2],13:[0,1,2],14:[2,1,0],
  15:[0,1,2],16:[2,1,0],17:[0,1,2],18:[0,1,2],19:[0,1,2],20:[2,1,0],21:[0,1,2],
  22:[0,1,0],23:[0,1,2],24:[0,1,0],25:[2,1,0],26:[2,1,0],27:[0,1,2],28:[0,1,2],
  29:[2,1,0],30:[2,1,0],31:[0,1,2],32:[2,1,0],33:[2,1,0],34:[0,1,2],35:[0,1,2],
  36:[2,1,0],37:[0,1,2],38:[2,1,0],39:[0,1,2],40:[0,1,0],41:[0,0,1],42:[0,1,2],
  43:[0,1,2],44:[0,1,2],45:[2,1,0],46:[0,1,2],47:[2,1,0],48:[2,1,0],49:[0,1,2],
  50:[2,1,0],51:[0,1,2],52:[0,1,2],53:[2,1,0],54:[0,1,2],55:[2,1,0],56:[2,1,0],
  57:[2,1,0],58:[0,1,2],59:[0,1,0],60:[0,0,1],61:[2,1,0],62:[2,1,0],63:[0,1,2],
  64:[0,1,2],65:[0,1,2],66:[0,1,2],67:[0,1,2],68:[0,1,2],69:[2,1,0],70:[2,1,0],
  71:[0,1,2],72:[2,1,0],73:[2,1,0],74:[0,1,2],75:[2,1,0],76:[2,1,0],77:[2,1,0],
  78:[0,1,0],79:[0,0,1],80:[2,1,0],81:[0,1,2],82:[2,1,0],83:[2,1,0],84:[0,1,2],
  85:[0,1,2],86:[0,1,2],87:[2,1,0],88:[2,1,0],89:[0,1,2],90:[2,1,0],91:[2,1,0],
  92:[0,1,2],93:[2,1,0],94:[0,1,2],95:[0,1,2],96:[0,1,2],97:[0,1,0],98:[0,1,2],
  99:[0,1,2],100:[0,1,2],101:[2,1,0],102:[2,1,0],103:[0,1,2],104:[2,1,0],105:[2,1,0],
  106:[0,1,2],107:[0,1,2],108:[0,1,2],109:[2,1,0],110:[0,1,2],111:[0,1,2],112:[0,1,2],
  113:[2,1,0],114:[0,1,2],115:[2,1,0],116:[1,0,0],117:[2,1,0],118:[2,1,0],119:[0,1,2],
  120:[0,1,2],121:[0,1,2],122:[2,1,0],123:[2,1,0],124:[0,1,2],125:[2,1,0],126:[2,1,0],
  127:[0,1,2],128:[2,1,0],129:[0,1,2],130:[0,1,2],131:[2,1,0],132:[2,1,0],133:[0,1,2],
  134:[2,1,0],135:[0,0,1],136:[0,1,2],137:[2,1,0],138:[2,1,0],139:[0,1,2],140:[2,1,0],
  141:[2,1,0],142:[2,1,0],143:[2,1,0],144:[2,1,0],145:[2,1,0],146:[2,1,0],147:[2,1,0],
  148:[2,1,0],149:[2,1,0],150:[0,1,2],151:[2,1,0],152:[0,1,2],153:[0,1,2],154:[1,0,0],
  155:[0,1,2],156:[2,1,0],157:[2,1,0],158:[2,1,0],159:[2,1,0],160:[0,1,2],161:[0,1,2],
  162:[0,1,2],163:[2,1,0],164:[0,1,2],165:[2,1,0],166:[0,1,2],167:[2,1,0],168:[2,1,0],
  169:[2,1,0],170:[2,1,0],171:[0,1,2],172:[2,1,0],173:[1,0,0],174:[2,1,0],175:[2,1,0],
  176:[2,1,0],177:[2,1,0],178:[2,1,0],179:[2,1,0],180:[2,1,0],181:[2,1,0],182:[0,1,2],
  183:[0,1,2],184:[2,1,0],185:[0,1,2],186:[0,1,2],187:[0,0,0]
};

export const FACTOR_ITEMS: Record<string, number[]> = {
  'A': [20,21,39,58,77,96,115,134,153,172],
  'B': [3,22,40,41,59,60,78,79,97,116,135,154,173],
  'C': [4,23,42,61,80,98,99,117,118,136,137,155,174],
  'E': [5,6,24,43,62,81,100,119,138,156,157,175,176],
  'F': [7,25,26,44,45,63,64,82,101,120,139,158,177],
  'G': [8,27,46,65,83,102,121,140,159,178],
  'H': [9,28,47,66,84,85,103,104,122,123,141,160,179],
  'I': [10,29,48,67,86,105,124,142,161,180],
  'L': [11,30,49,68,87,106,125,143,162,181],
  'M': [12,31,50,69,88,107,126,144,145,163,164,182,183],
  'N': [13,32,51,70,89,108,127,146,165,184],
  'O': [14,15,33,34,52,53,71,90,109,128,147,166,185],
  'Q1': [16,35,54,72,91,110,129,148,167,186],
  'Q2': [17,36,55,73,74,92,111,130,149,168],
  'Q3': [18,37,56,75,93,94,112,131,150,169],
  'Q4': [19,38,57,76,95,113,114,132,133,151,152,170,171],
};

export const NORM_NAMES: Record<number, string> = {
  1:'Forma A · Varones Adultos Colombia',
  2:'Forma A · Mujeres Adultas Colombia',
  3:'Forma A · Adultos Mixto Colombia',
  4:'Forma A · Varones Adultos España',
  5:'Forma A · Mujeres Adultas España',
  6:'Forma A · Varones Adolescentes España',
  7:'Forma A · Mujeres Adolescentes España',
  8:'Forma A · Varones Profesionales Colombia',
  9:'Forma A · Mujeres Profesionales Colombia',
  10:'Forma A · Varones Bachillerato Colombia',
  11:'Forma A · Mujeres Bachillerato Colombia',
  12:'Forma B · Varones Adultos España',
  13:'Forma B · Mujeres Adultas España',
  14:'Forma B · Varones Adolescentes España',
  15:'Forma B · Mujeres Adolescentes España',
  16:'Versión 5 · Varones España',
  17:'Versión 5 · Mujeres España',
  18:'Versión 5 · Mixto España',
};

// Norm tables imported from separate file to keep engine.ts manageable
export { NORM_TABLES } from './norms';

export const POLO_BAJO: Record<string, string> = { A:"RESERVADO", B:"PENSAMIENTO CONCRETO", C:"INESTABILIDAD EMOCIONAL", E:"SUMISO", F:"PRUDENTE", G:"DESPREOCUPADO", H:"TÍMIDO", I:"RACIONAL", L:"CONFIADO", M:"PRÁCTICO", N:"SENCILLO", O:"SEGURO", Q1:"TRADICIONALISTA", Q2:"DEPENDIENTE DEL GRUPO", Q3:"DESINHIBIDO", Q4:"TRANQUILO" };
export const POLO_ALTO: Record<string, string> = { A:"ABIERTO", B:"PENSAMIENTO ABSTRACTO", C:"ESTABILIDAD EMOCIONAL", E:"DOMINANTE", F:"IMPULSIVO", G:"ESCRUPULOSO", H:"ESPONTÁNEO", I:"EMOCIONAL", L:"SUSPICAZ", M:"SOÑADOR", N:"ASTUTO", O:"INSEGURO", Q1:"INNOVADOR", Q2:"AUTOSUFICIENTE", Q3:"CONTROLADO", Q4:"TENSIONADO" };

export const FACTORS: FactorDef[] = [
  { id: "A", name: "Afectividad", low: "Reservado / Frío", high: "Abierto / Cálido" },
  { id: "B", name: "Inteligencia", low: "Pensamiento concreto", high: "Pensamiento abstracto" },
  { id: "C", name: "Estabilidad", low: "Inestabilidad emocional", high: "Estabilidad emocional" },
  { id: "E", name: "Dominancia", low: "Sumiso / Dócil", high: "Dominante / Asertivo" },
  { id: "F", name: "Impulsividad", low: "Prudente / Serio", high: "Impulsivo / Animado" },
  { id: "G", name: "Lealtad grupo", low: "Despreocupado / Flexible", high: "Escrupuloso / Persistente" },
  { id: "H", name: "Audacia", low: "Tímido / Inhibido", high: "Espontáneo / Audaz" },
  { id: "I", name: "Sensibilidad", low: "Racional / Objetivo", high: "Emocional / Sensible" },
  { id: "L", name: "Suspicacia", low: "Confiado / Adaptable", high: "Suspicaz / Celoso" },
  { id: "M", name: "Imaginación", low: "Práctico / Realista", high: "Soñador / Imaginativo" },
  { id: "N", name: "Astucia", low: "Sencillo / Natural", high: "Astuto / Calculador" },
  { id: "O", name: "Inseguridad", low: "Seguro / Confiado", high: "Inseguro / Aprensivo" },
  { id: "Q1", name: "Radicalismo", low: "Conservador / Tradicional", high: "Liberal / Innovador" },
  { id: "Q2", name: "Autosuficiencia", low: "Dependiente del grupo", high: "Autosuficiente" },
  { id: "Q3", name: "Control", low: "Desinhibido / Impulsivo", high: "Controlado / Perfeccionista" },
  { id: "Q4", name: "Tensión", low: "Tranquilo / Relajado", high: "Tensionado / Frustrado" },
];

export const FACTOR_ORDER = ["A","B","C","E","F","G","H","I","L","M","N","O","Q1","Q2","Q3","Q4"];

// ============================================================
// SCORING FUNCTIONS
// ============================================================
export function computeResults(answers: Answers, normIdx: number): ScoringResult {
  // Import norms dynamically to avoid circular
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { NORM_TABLES } = require('./norms');
  
  const rawScores: RawScores = {};
  for (const factor of Object.keys(FACTOR_ITEMS)) {
    let total = 0;
    for (const itemNum of FACTOR_ITEMS[factor]) {
      const ans = answers[itemNum];
      if (ans !== undefined) total += SCORING_KEY[itemNum][ans - 1];
    }
    rawScores[factor] = total;
  }
  const decatipos: Decatipos = {};
  for (const factor of Object.keys(rawScores)) {
    const raw = rawScores[factor];
    const table = NORM_TABLES[factor]?.[normIdx];
    decatipos[factor] = table ? (table[Math.min(raw, table.length - 1)] ?? 5) : 5;
  }
  return { rawScores, decatipos };
}

const clamp = (v: number) => Math.max(1, Math.min(10, v));

export function computeGlobalDims(d: Decatipos): GlobalDims {
  return {
    ANS: clamp(d.A*0.07 + d.B*0.02 - d.C*0.31 - d.E*0.04 + d.F*0.01 + d.G*0.05 - d.H*0.16 + d.I*0.08 + d.L*0.19 - d.M*0.12 + d.O*0.30 - d.Q1*0.03 - d.Q2*0.04 - d.Q3*0.12 + d.Q4*0.27 + 4.57),
    EXT: clamp(d.A*0.40 - d.B*0.07 - d.C*0.05 + d.E*0.05 + d.F*0.31 + d.G*0.24 + d.H*0.26 + d.I*0.08 + d.L*0.10 - d.M*0.06 + d.O*0.05 - d.Q1*0.05 - d.Q2*0.42 + d.Q3*0.08 + d.Q4*0.05 + 0.17),
    SCO: clamp(d.A*0.10 + d.B*0.30 - d.C*0.08 - d.E*0.18 - d.F*0.30 + d.G*0.35 - d.H*0.11 + d.I*0.05 + d.L*0.02 - d.M*0.11 + (d.N||0)*0.40 - d.O*0.04 - d.Q1*0.05 - d.Q2*0.03 + d.Q3*0.26 + d.Q4*0.08 + 2.31),
    IND: clamp(d.A*0.03 + d.B*0.48 - d.C*0.02 + d.E*0.31 + d.F*0.03 - d.G*0.02 + d.H*0.04 - d.I*0.04 + d.L*0.34 + d.M*0.13 + (d.N||0)*0.07 - d.O*0.06 + d.Q1*0.42 + d.Q2*0.10 + d.Q3*0.01 + d.Q4*0.02 - 4.62),
    OBJ: clamp(-d.A*0.08 + d.B*0.14 - d.C*0.02 - d.E*0.22 + d.F*0.08 + d.G*0.06 - d.H*0.04 + d.I*0.64 - d.L*0.18 + d.M*0.54 - (d.N||0)*0.08 + d.O*0.05 + d.Q1*0.07 - d.Q2*0.09 - d.Q3*0.01 - d.Q4*0.04 + 0.99),
  };
}

export function computeDerivedEqs(d: Decatipos): DerivedEqs {
  return {
    CRE: clamp(0.99 - d.A*0.33 + d.B*0.33 + d.E*0.17 - d.F*0.33 + d.H*0.16 + d.I*0.33 + d.M*0.16 - (d.N||0)*0.16 + d.Q1*0.16 + d.Q2*0.33),
    NEU: clamp(6.27 - d.B*0.07 - d.C*0.26 - d.E*0.17 - d.F*0.38 - d.G*0.10 + d.H*0.10 + d.I*0.22 + d.O*0.26 - d.Q1*0.09 + d.Q4*0.35),
    PSI: clamp(5.2 - d.A*0.2 - d.B*0.2 + d.C*0.1 - d.F*0.4 + d.G*0.1 + d.I*0.2 - d.L*0.3 + d.M*0.4 + (d.N||0)*0.1 - d.O*0.1 + d.Q1*0.1 - d.Q2*0.1 - d.Q3*0.4 + d.Q4*0.7),
    LID: clamp(d.B*0.12 + d.C*0.12 + d.E*0.05 + d.F*0.24 + d.G*0.24 + d.H*0.24 - d.I*0.12 - d.M*0.12 + (d.N||0)*0.05 - d.O*0.24 + d.Q3*0.24 - d.Q4*0.12 + 1.65),
    LAC: clamp(d.B*0.12 + d.C*0.18 - d.E*0.12 - d.F*0.12 + d.G*0.30 - d.M*0.30 - d.O*0.18 + d.Q3*0.18 - d.Q4*0.18 + 6.16),
  };
}

export function computeDiscriminants(d: Decatipos): Discriminants {
  const secRaw = d.A*0.305 + d.B*0.113 - d.C*0.412 - d.E*0.071 + d.F*0.083 + d.G*0.18 + d.H*0.322 + d.I*0.187 - d.L*0.198 + d.M*0.282 - (d.N||0)*0.319 + d.O*0.515 + d.Q1*0.223 + d.Q2*0.279 - d.Q3*0.104 - d.Q4*0.014 - 8.328;
  const secProb = 1 / (1 + Math.exp(-secRaw));
  const SEC = clamp(Math.ceil(secProb * 10));

  const cuotaSum = -d.A*1.911 - d.B*0.104 + d.C*0.071 - d.E*0.078 + d.F*1.228 - d.G*1.536 + d.H*0.616 + d.I*1.776 + d.L*0.119 + d.M*0.720 + (d.N||0)*2.417 - d.O*2.156 - d.Q1*1.355 + d.Q2*2.095 - d.Q3*0.337 + d.Q4*3.235 + 75.985;
  const ADM_CUOTA_PCT = Math.round(cuotaSum);
  const ADM_CUOTA = clamp(Math.round(cuotaSum / 10));

  const SPA = clamp(Math.round(d.A*0.1 + d.B*0.4 + d.C*0.15 - d.E*0.1 - d.F*0.1 + d.G*0.2 - d.H*0.05 - d.I*0.05 - d.L*0.1 - d.M*0.05 + (d.N||0)*0.05 - d.O*0.1 + d.Q1*0.1 - d.Q2*0.05 + d.Q3*0.15 - d.Q4*0.1 + 3.5));
  const MED = clamp(Math.round(d.B*0.3 + d.C*0.1 + d.G*0.2 + d.I*(-0.1) + d.L*0.1 + d.Q3*0.2 - d.Q4*0.1 + 4.0));
  const EMPRES = clamp(Math.round(d.A*0.1 + d.B*0.15 + d.C*0.1 + d.E*0.3 + d.F*0.2 - d.G*0.1 + d.H*0.15 - d.I*0.05 + (d.N||0)*0.2 - d.O*0.1 + d.Q1*0.1 + d.Q2*0.2 - d.Q4*0.05 + 1.5));
  const CIENT = clamp(Math.round(d.B*0.4 + d.C*0.1 + d.G*0.2 - d.F*0.1 + d.I*0.05 - d.M*0.05 + d.Q3*0.15 - d.Q4*0.05 + 3.0));
  const CIENT_ING = clamp(Math.round(d.B*0.35 + d.C*0.1 + d.E*0.1 + d.G*0.15 + d.H*0.1 - d.I*0.1 + d.Q1*0.15 + d.Q3*0.1 - d.Q4*0.1 + 3.5));
  const CIENT_SOC = clamp(Math.round(d.A*0.2 + d.B*0.2 + d.C*0.1 + d.F*0.1 + d.I*0.2 + d.M*0.15 + (d.N||0)*0.1 + d.Q1*0.15 - d.Q3*0.05 + 2.0));

  return { SEC, ADM_CUOTA, ADM_CUOTA_PCT, SPA, MED, EMPRES, CIENT, CIENT_ING, CIENT_SOC };
}

// ============================================================
// INTERPRETATION
// ============================================================
export { INTERP_MATRIX } from './interpretation';
import { INTERP_MATRIX } from './interpretation';

export function getInterpText(key: string, decatipo: number): string {
  const texts = INTERP_MATRIX[key];
  if (!texts) return "";
  if (decatipo <= 3) return texts[0] || "";
  if (decatipo === 4) return texts[1] || "";
  if (decatipo <= 6) return texts[2] || "";
  if (decatipo === 7) return texts[3] || "";
  return texts[4] || "";
}

export function generateInterpretation(decatipos: Decatipos, globalDims: GlobalDims | null, derivedEqs: DerivedEqs | null): Interpretation {
  const d = decatipos;
  const g = globalDims || {} as GlobalDims;
  const e = derivedEqs || {} as DerivedEqs;
  const blank = (t: string) => !t || t.trim() === "";

  const buildSection = (items: [string, number][]) =>
    items.map(([key, val]) => {
      const t = getInterpText(key, val);
      return blank(t) ? null : t;
    }).filter(Boolean) as string[];

  return {
    intelectual: buildSection([
      ["B", d.B], ["CRE", e.CRE||5], ["F", d.F], ["H_CONC", d.H], ["M", d.M], ["Q1", d.Q1]
    ]),
    emocional: buildSection([
      ["ANS", g.ANS||5], ["NEU", e.NEU||5], ["C", d.C], ["I", d.I], ["O", d.O], ["Q4", d.Q4], ["PSI", e.PSI||5]
    ]),
    social: buildSection([
      ["LID", e.LID||5], ["EXT", g.EXT||5], ["IND", g.IND||5], ["A", d.A], ["E", d.E], ["H", d.H], ["L", d.L], ["N", d.N||5], ["Q2", d.Q2], ["Q3", d.Q3]
    ]),
    etica: buildSection([
      ["G", d.G], ["C_MORAL", d.C], ["O_ETH", d.O], ["B_ETH", d.B]
    ]),
  };
}

// ============================================================
// SINCERITY / IMAGE MANAGEMENT
// ============================================================
const SINC_CHECK2 = [5,10,26,29,38,75,84,112,176];
const SINC_CHECK_NOT2 = [67,92,95,113,152,171];

export function computeSinceridad(answers: Answers | null): number | null {
  if (!answers) return null;
  let score = 0;
  for (const item of SINC_CHECK2) { if (answers[item] === 2) score++; }
  for (const item of SINC_CHECK_NOT2) { if (answers[item] && answers[item] !== 2) score++; }
  return score;
}

export function sincLabel(score: number | null) {
  if (score === null) return null;
  if (score <= 3)  return { label: "Muy sincero",          color: "#10B981", bg: "#D1FAE5", icon: "✅" };
  if (score <= 6)  return { label: "Sincero",               color: "#10B981", bg: "#ECFDF5", icon: "✔" };
  if (score <= 9)  return { label: "Algo distorsionador",   color: "#F59E0B", bg: "#FEF3C7", icon: "⚠️" };
  if (score <= 12) return { label: "Distorsionador",        color: "#EF4444", bg: "#FEE2E2", icon: "🚨" };
  if (score <= 15) return { label: "Muy distorsionador!",   color: "#DC2626", bg: "#FEE2E2", icon: "🚨" };
  return { label: "ERROR", color: "#7C3AED", bg: "#EDE9FE", icon: "⛔" };
}

// ============================================================
// PARSE PASTE STRING
// ============================================================
export function parsePasteString(raw: string): ParseResult {
  const clean = raw.replace(/[\s,.\-|]/g, "");
  if (clean.length === 0) return { ok: false, error: "Ingresa la cadena de respuestas." };
  if (clean.length !== 187) return { ok: false, error: `La cadena tiene ${clean.length} caracteres. Se requieren exactamente 187.` };
  const invalid: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    if (!["1","2","3"].includes(clean[i])) invalid.push(i + 1);
  }
  if (invalid.length > 0) return { ok: false, error: `Respuestas inválidas en posición(es): ${invalid.slice(0,10).join(", ")}${invalid.length > 10 ? "..." : ""}. Solo se permiten 1, 2 o 3.` };
  const ans: Answers = {};
  for (let i = 0; i < 187; i++) {
    ans[i + 1] = parseInt(clean[i], 10) as 1 | 2 | 3;
  }
  return { ok: true, answers: ans };
}

// ============================================================
// FACTOR DESCRIPTIONS (for dynamic interpretation)
// ============================================================
export const FACTOR_DESCRIPTIONS: Record<string, FactorDescription> = {
  A: { low:"Tendencia a la reserva y al distanciamiento interpersonal. Prefiere el trabajo individual y puede percibirse como frío o formal ante el grupo.", mid:"Equilibrio entre apertura social e independencia. Establece relaciones adecuadas sin ser excesivamente sociable.", high:"Alta disposición al contacto interpersonal. Cálido, participativo y orientado hacia las personas. Disfruta y potencia el trabajo en equipo." },
  B: { low:"Pensamiento predominantemente concreto. Mayor facilidad con tareas prácticas y rutinarias que con el razonamiento abstracto complejo.", mid:"Capacidad intelectual dentro del promedio. Maneja adecuadamente tanto el razonamiento concreto como el abstracto.", high:"Pensamiento ágil y abstracto. Buena capacidad analítica y para la resolución de problemas complejos. Aprendizaje rápido y flexible." },
  C: { low:"Inestabilidad emocional ante el estrés. Tendencia a la frustración, irritabilidad y dificultad para mantener la calma bajo presión.", mid:"Estabilidad emocional moderada. Generalmente maneja bien el estrés aunque puede mostrar tensión en situaciones de alta presión sostenida.", high:"Marcada estabilidad emocional. Tranquilo bajo presión, maduro en el manejo de conflictos y tolerante a la frustración." },
  E: { low:"Actitud sumisa y complaciente. Tiende a ceder ante los demás y evita confrontaciones.", mid:"Equilibrio entre asertividad y cooperación. Capaz de defender sus ideas sin imponerse excesivamente.", high:"Alta dominancia y asertividad. Seguro, competitivo y con fuerte necesidad de control." },
  F: { low:"Cauto, reflexivo y serio. Toma decisiones con detenimiento y prefiere la prudencia.", mid:"Balance entre impulsividad y reflexión. Puede ser espontáneo pero también deliberado.", high:"Impulsivo, animado y expresivo. Busca estimulación y variedad; puede tomar decisiones apresuradas." },
  G: { low:"Flexible ante normas y convenciones. Puede actuar por conveniencia propia.", mid:"Respeto moderado por las normas. Generalmente cumple sus obligaciones.", high:"Altamente escrupuloso y responsable. Fuerte sentido del deber, persistente y autodisciplinado." },
  H: { low:"Timidez e inhibición social. Sensible al rechazo, prefiere mantenerse en lo predecible.", mid:"Nivel moderado de audacia. Se desenvuelve en situaciones sociales con algo de nerviosismo.", high:"Espontáneo, audaz y desinhibido socialmente. Disfruta los desafíos y las situaciones de riesgo." },
  I: { low:"Pragmático, racional y objetivo. Toma decisiones basadas en hechos.", mid:"Mezcla de objetividad y sensibilidad emocional.", high:"Emocional, sensible y receptivo a los matices afectivos del entorno." },
  L: { low:"Confiado, adaptable y colaborador. Acepta las motivaciones de los demás sin sospechas.", mid:"Nivel moderado de suspicacia. Generalmente confía pero puede ser cauteloso.", high:"Suspicaz y desconfiado. Cuestiona las intenciones ajenas." },
  M: { low:"Altamente práctico y orientado a la realidad. Enfocado en hechos concretos.", mid:"Equilibrio entre practicidad e imaginación.", high:"Imaginativo y orientado internamente. Rica vida mental y creativa." },
  N: { low:"Sencillo, directo y sin pretensiones. Comunica sus pensamientos francamente.", mid:"Nivel moderado de astucia social.", high:"Astuto, calculador y diplomático. Comprende bien las dinámicas sociales." },
  O: { low:"Seguro y confiado en sí mismo. Baja tendencia a la culpa o la ansiedad.", mid:"Nivel moderado de aprensión.", high:"Alta inseguridad y aprensión. Tendencia a la culpa y autocrítica excesiva." },
  Q1: { low:"Conservador y respetuoso de las tradiciones. Prefiere métodos probados.", mid:"Balance entre tradición e innovación.", high:"Innovador, crítico y liberal. Disfruta cuestionando las normas." },
  Q2: { low:"Dependiente del grupo y orientado al consenso.", mid:"Equilibrio entre autonomía y dependencia social.", high:"Autosuficiente e independiente. Prefiere tomar decisiones por cuenta propia." },
  Q3: { low:"Desinhibido y flexible en su conducta. Puede seguir sus impulsos.", mid:"Control moderado de la conducta.", high:"Alto autocontrol y perfeccionismo. Imagen social muy cuidada." },
  Q4: { low:"Tranquilo, relajado y con baja tensión interna.", mid:"Tensión moderada. Puede sentir cierta presión.", high:"Alta tensión, frustración e irritabilidad." },
};
