import { useState, useRef, useEffect } from "react";

/* ═══════════════ TOKENS ════════════════ */
const C = {
  bg: "#080C14", surface: "#0F1520", card: "#131B29", border: "#1A2535",
  accent: "#B8932A", accentLight: "#D4AF5A", accentDim: "#B8932A1A",
  text: "#E6EAF2", textMuted: "#5E7191", textSoft: "#8FA3C0",
  teal: "#2AACAA", tealDim: "#2AACAA12", violet: "#8B7EC8", violetDim: "#8B7EC812",
  red: "#D96C6C", green: "#4DB87A", warn: "#E08A3C",
};
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap');`;
const FD = "'Playfair Display',Georgia,serif";
const FB = "'Lora',Georgia,serif";
const FM = "'JetBrains Mono',monospace";
const KF = `
*{box-sizing:border-box}
::placeholder{color:#5E7191;font-family:'Lora',serif}
select option{background:#0F1520}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:#080C14}
::-webkit-scrollbar-thumb{background:#1A2535;border-radius:3px}
@keyframes fadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.4;transform:scale(.95)}50%{opacity:1;transform:scale(1.05)}}
`;

/* ═══════════════ STEPS ═════════════════ */
const stepsCrear = [
  { id: 1, label: "Concepto", icon: "◈" }, { id: 2, label: "Funciones", icon: "◉" },
  { id: 3, label: "Condiciones", icon: "◍" }, { id: 4, label: "Perfil", icon: "◎" },
];
const stepsLevantar = [
  { id: 1, label: "Identificación", icon: "◈" }, { id: 2, label: "Funciones", icon: "◉" },
  { id: 3, label: "Condiciones", icon: "◍" }, { id: 4, label: "Contexto & Perfil", icon: "◎" },
];

/* ═══════════════ CAV SCALES ════════════ */
const FR_OPTS = [{ v: 5, l: "Diaria (5)" }, { v: 4, l: "Semanal (4)" }, { v: 3, l: "Quincenal (3)" }, { v: 2, l: "Mensual (2)" }, { v: 1, l: "Otra / esporádica (1)" }];
const CO_OPTS = [{ v: 5, l: "5 — Muy graves: afectan múltiples áreas" }, { v: 4, l: "4 — Graves: afectan resultados clave" }, { v: 3, l: "3 — Considerables: repercuten en otros" }, { v: 2, l: "2 — Menores: incidencia en mismo puesto" }, { v: 1, l: "1 — Mínimas: poca o ninguna incidencia" }];
const GD_OPTS = [{ v: 5, l: "5 — Máxima: conocimiento avanzado/especializado" }, { v: 4, l: "4 — Alta: conocimiento técnico importante" }, { v: 3, l: "3 — Moderada: conocimiento intermedio" }, { v: 2, l: "2 — Baja: conocimiento básico" }, { v: 1, l: "1 — Mínima: sin conocimiento técnico" }];

const emptyFn = () => ({ raw: "", desc: "", fr: 5, co: 3, gd: 3, total: 14, aiStatus: null, aiSuggestion: null, approved: false });
const calcTotal = f => parseInt(f.fr || 1) + (parseInt(f.co || 1) * parseInt(f.gd || 1));

/* ═══════════════ INIT STATE ════════════ */
const initCrear = {
  puesto: "", area: "", reportaA: "", nivelJerarquico: "", propositoPrincipal: "",
  responsabilidades: "", kpis: "", proyectos: "",
  modalidad: "", viajes: "", presupuesto: "", personas: "", impactoOrg: "", salarioBruto: "", horario: "", tipoContrato: "",
  educacion: "", experiencia: "", habilidadesTecnicas: "", competencias: "", idiomas: "",
};
const mkInitLevantar = () => ({
  nombreOcupante: "", puesto: "", area: "", reportaA: "", tiempoEnPuesto: "", tipoContrato: "",
  funciones: [emptyFn(), emptyFn(), emptyFn()], funcionPrimaria: 0,
  modalidad: "", viajes: "", presupuesto: "", personas: "", impactoOrg: "", salarioBruto: "",
  horario: "", condicionesFisicas: "", condicionesAmbientales: "",
  actividadesMensuales: "", decisionesToma: "", quePasaSiNoEsta: "",
  internosCon: "", externosCon: "", herramientas: "", sistemasSoftware: "",
  nivelEducacion: "", carreraEstudio: "", experienciaPrevia: "",
  habilidadesQueUsa: "", retosDelPuesto: "", logrosDestacados: "", salarioActual: "",
});

/* ═══════════════ FIELD SCHEMAS ══════════
   Orden: Concepto → Funciones → CONDICIONES → Perfil
════════════════════════════════════════ */
const fieldsCrear = [
  {
    step: 1, title: "Identificación del Cargo", subtitle: "Información base — la IA completará todo lo demás automáticamente", fields: [
      { key: "puesto", label: "Denominación del Puesto", placeholder: "Ej. Gerente Comercial, Analista de Datos, Jefe de Logística", type: "text", required: true },
      { key: "area", label: "Unidad / Área / Departamento", placeholder: "Ej. Dirección Comercial, Tecnología, Operaciones", type: "text", required: true },
      { key: "reportaA", label: "Reporta a (Supervisor Inmediato)", placeholder: "Cargo al que reporta este puesto", type: "text", required: true },
      { key: "nivelJerarquico", label: "Nivel Jerárquico (opcional)", type: "select", options: ["Operativo", "Técnico / Especialista", "Supervisor / Coordinador", "Jefatura", "Gerencia", "Dirección", "Alta Dirección / C-Level"] },
      { key: "propositoPrincipal", label: "¿Para qué existe este cargo? (en tus palabras)", placeholder: "Describe brevemente el propósito y qué problema resuelve en la organización...", type: "textarea", required: true },
    ]
  },
  {
    step: 2, title: "Funciones & Responsabilidades", subtitle: "Generadas por IA — revisa y ajusta", aiStep: true, fields: [
      {
        key: "responsabilidades", label: "Funciones Principales",
        helper: "Formato CAV: [Verbo infinitivo] + [Objeto] + [para/con el fin de] + [Finalidad]. Ej: «Gestionar la cartera de clientes para asegurar el cumplimiento de metas comerciales»",
        type: "textarea", aiKey: "responsabilidades"
      },
      { key: "kpis", label: "Indicadores de Desempeño (KPIs)", type: "textarea", aiKey: "kpis" },
      { key: "proyectos", label: "Proyectos o Iniciativas Estratégicas Típicas", type: "textarea", aiKey: "proyectos" },
    ]
  },
  {
    step: 3, title: "Condiciones del Cargo", subtitle: "Contexto laboral — generado por IA, edita lo que necesites", aiStep: true, fields: [
      { key: "modalidad", label: "Modalidad de Trabajo", type: "select", aiKey: "modalidad", options: ["Presencial", "Remoto (Home Office)", "Híbrido (3/2)", "Híbrido (2/3)", "Flexible"] },
      { key: "tipoContrato", label: "Tipo de Vinculación", type: "select", aiKey: "tipoContrato", options: ["Tiempo completo", "Tiempo parcial", "Por obra o servicio", "Honorarios profesionales", "Contrato indefinido"] },
      { key: "horario", label: "Jornada / Horario habitual", placeholder: "Ej. Lunes a viernes 08:00–17:00 / Horario flexible", type: "text", aiKey: "horario" },
      { key: "viajes", label: "Requerimiento de Viajes", type: "select", aiKey: "viajes", options: ["No requerido", "Ocasional (< 10%)", "Moderado (10–30%)", "Frecuente (30–60%)", "Constante (> 60%)"] },
      { key: "presupuesto", label: "Administración de Presupuesto / Recursos", type: "text", aiKey: "presupuesto", placeholder: "Ej. Maneja caja chica de $500 / No aplica" },
      { key: "personas", label: "Personal a Cargo (estimado)", type: "text", aiKey: "personas", placeholder: "Ej. 0 / 3 directas / 2 directas + 8 indirectas" },
      { key: "impactoOrg", label: "Alcance del Impacto Organizacional", type: "select", aiKey: "impactoOrg", options: ["Individual / Operativo", "Equipo / Área", "Departamento", "Multidepartamental", "Toda la organización", "Grupo empresarial / Corporativo"] },
      { key: "salarioBruto", label: "Rango Salarial Bruto Mensual (USD)", type: "text", aiKey: "salarioBruto", placeholder: "Ej. $3,000 – $4,500 USD" },
    ]
  },
  {
    step: 4, title: "Perfil del Candidato Ideal", subtitle: "Generado por IA con base en el cargo y sus condiciones — revisa y ajusta", aiStep: true, fields: [
      { key: "educacion", label: "Formación Académica Requerida", type: "text", aiKey: "educacion" },
      { key: "experiencia", label: "Experiencia Profesional", type: "text", aiKey: "experiencia" },
      { key: "habilidadesTecnicas", label: "Conocimientos Técnicos Requeridos", type: "textarea", aiKey: "habilidadesTecnicas" },
      { key: "competencias", label: "Competencias Conductuales Clave", type: "textarea", aiKey: "competencias" },
      { key: "idiomas", label: "Dominio de Idiomas", type: "text", aiKey: "idiomas" },
    ]
  },
];

const fieldsLevantar = [
  {
    step: 1, title: "Identificación del Puesto", subtitle: "Datos generales del cargo y ocupante actual", fields: [
      { key: "nombreOcupante", label: "Nombre del Ocupante (opcional)", placeholder: "Puede omitirse", type: "text" },
      { key: "puesto", label: "Denominación del Cargo", placeholder: "Título formal o nombre con el que se conoce el puesto", type: "text", required: true },
      { key: "area", label: "Unidad / Área / Departamento", placeholder: "Ej. Operaciones, Administración, Ventas", type: "text", required: true },
      { key: "reportaA", label: "Supervisor Inmediato (en la práctica)", placeholder: "A quién rinde cuentas de facto", type: "text", required: true },
      { key: "tiempoEnPuesto", label: "Tiempo en el Cargo", placeholder: "Ej. 3 años 2 meses", type: "text" },
      { key: "tipoContrato", label: "Tipo de Vinculación", type: "select", options: ["Tiempo completo", "Tiempo parcial", "Por obra o servicio", "Honorarios profesionales", "Otro"] },
    ]
  },
  // Step 2 = CAV table (rendered separately, placeholder keeps grp defined)
  { step: 2, title: "Funciones & Ponderación CAV", subtitle: "Describe cada función en tus palabras — usa ✦ Asistencia IA para reformular y asignar pesos", cavStep: true, fields: [] },
  {
    step: 3, title: "Condiciones del Cargo", subtitle: "Contexto laboral actual — pre-completado por IA, edita lo que necesites", aiStep: true, fields: [
      { key: "modalidad", label: "Modalidad de Trabajo Actual", type: "select", aiKey: "modalidad", options: ["Presencial", "Remoto (Home Office)", "Híbrido", "En campo / Itinerante", "Mixto según necesidad"] },
      { key: "horario", label: "Jornada / Horario habitual", placeholder: "Ej. Lunes a viernes 08:00–17:00 / Horario flexible", type: "text", aiKey: "horario" },
      { key: "viajes", label: "Disponibilidad para Viajar", type: "select", aiKey: "viajes", options: ["No requerido", "Ocasional (< 10%)", "Moderado (10–30%)", "Frecuente (30–60%)", "Constante (> 60%)"] },
      { key: "presupuesto", label: "Manejo de Presupuesto / Recursos", type: "text", aiKey: "presupuesto", placeholder: "Ej. Caja chica $500 / No maneja presupuesto" },
      { key: "personas", label: "Personas que Supervisa en la Práctica", type: "text", aiKey: "personas", placeholder: "Ej. 0 / 3 directas" },
      { key: "impactoOrg", label: "Alcance del Impacto Real del Cargo", type: "select", aiKey: "impactoOrg", options: ["Individual / Operativo", "Equipo / Área", "Departamento", "Multidepartamental", "Toda la organización", "Grupo empresarial / Corporativo"] },
      { key: "condicionesFisicas", label: "Demandas Físicas del Cargo", placeholder: "Ej. Permanece sentado 90% del tiempo / Trabaja en campo con caminata frecuente", type: "textarea" },
      { key: "condicionesAmbientales", label: "Condiciones Ambientales o de Riesgo", placeholder: "Ej. Oficina climatizada / Bodega con ruido / Exposición a temperaturas extremas", type: "textarea" },
      { key: "salarioActual", label: "Remuneración Bruta Mensual Actual", placeholder: "Ej. $2,100 USD o Confidencial", type: "text" },
    ]
  },
  {
    step: 4, title: "Contexto Operativo & Perfil Real", subtitle: "Cómo opera el cargo en la práctica y perfil del ocupante", fields: [
      { key: "actividadesMensuales", label: "Actividades Periódicas o Esporádicas", placeholder: "Tareas mensuales, trimestrales o anuales...", type: "textarea" },
      { key: "decisionesToma", label: "Decisiones que Toma de Forma Autónoma", placeholder: "¿Qué resuelve sin consultar? Revela la autonomía real.", type: "textarea" },
      { key: "quePasaSiNoEsta", label: "Impacto si Falta 1 Semana", placeholder: "¿Qué se detiene o complica? Revela la criticidad real.", type: "textarea" },
      { key: "internosCon", label: "Relaciones Internas Frecuentes", placeholder: "Áreas o cargos con los que interactúa regularmente...", type: "textarea" },
      { key: "externosCon", label: "Relaciones Externas", placeholder: "Proveedores, clientes, entidades reguladoras...", type: "textarea" },
      { key: "herramientas", label: "Recursos y Herramientas que Utiliza", placeholder: "Vehículo, caja chica, maquinaria...", type: "textarea" },
      { key: "sistemasSoftware", label: "Software y Sistemas Digitales", placeholder: "Ej. SAP, Excel, CRM, ERP...", type: "text" },
      { key: "nivelEducacion", label: "Nivel de Educación del Ocupante", type: "select", options: ["Educación básica", "Bachillerato", "Técnico / Tecnólogo", "Universitaria incompleta", "Universitaria completa", "Especialización / Postgrado", "Maestría o superior"] },
      { key: "carreraEstudio", label: "Carrera o Área de Estudio", placeholder: "Ej. Administración de Empresas", type: "text" },
      { key: "habilidadesQueUsa", label: "Conocimientos y Habilidades en Uso Real", placeholder: "Lo que realmente aplica en el día a día...", type: "textarea" },
      { key: "retosDelPuesto", label: "Principales Retos del Cargo", placeholder: "Alta presión, coordinación múltiple, cambios frecuentes...", type: "textarea" },
      { key: "logrosDestacados", label: "Logros o Aportes Destacados", placeholder: "Mejoras implementadas, resultados extraordinarios...", type: "textarea" },
    ]
  },
];

/* ═══════════════ JSON UTILS ════════════
   FIX: sanitize inputs + robust repair before parse
════════════════════════════════════════ */
// Strip characters that break JSON string values
const san = v => {
  if (!v) return "";
  return String(v)
    .replace(/\\/g, "\\\\")   // backslashes first
    .replace(/"/g, "'")        // double quotes → single quotes
    .replace(/\n/g, " ")       // newlines → space
    .replace(/\r/g, "")        // carriage returns
    .replace(/\t/g, " ")       // tabs → space
    .replace(/[\x00-\x1F]/g, " ") // other control chars
    .trim();
};

// Attempt to repair and parse potentially malformed JSON from LLM
const parseAiJson = raw => {
  // 1. Extract outermost JSON object
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON block found");
  let txt = match[0];

  // 2. Remove control characters that break JSON parsers
  txt = txt.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, " ");

  // 3. Fix unescaped newlines inside string values (common LLM mistake)
  // Replace literal \n that appear inside quoted strings
  txt = txt.replace(/"([^"]*)"/g, (_, inner) => `"${inner.replace(/\n/g, " ").replace(/\r/g, "").replace(/\t/g, " ")}"`);

  // 4. Try direct parse
  try { return JSON.parse(txt); } catch (_) { }

  // 5. Last resort: replace remaining unescaped newlines
  txt = txt.replace(/:\s*"([\s\S]*?)"/g, (_, v) => `: "${v.replace(/\n/g, " ").replace(/\r/g, "")}"`);
  return JSON.parse(txt);
};

/* ═══════════════ PROMPTS ═══════════════ */
const buildPredictPrompt = f => `Eres experto en Análisis de Puestos en Latinoamérica.

Cargo a diseñar:
Nombre: ${san(f.puesto)} | Area: ${san(f.area)} | Reporta a: ${san(f.reportaA)} | Nivel: ${san(f.nivelJerarquico) || "por determinar"}
Proposito: ${san(f.propositoPrincipal)}

Devuelve UNICAMENTE JSON valido. Sin backticks, sin texto antes o despues, sin saltos de linea dentro de los valores de string.
Usa comillas simples dentro de los valores si necesitas citar algo.

{"responsabilidades":"6-8 funciones en formato CAV, separadas por | (pipe), cada una: Verbo+Objeto+para+Finalidad","kpis":"4-5 KPIs separados por | (pipe), formato: Nombre: descripcion","proyectos":"2-3 proyectos tipicos separados por |","educacion":"formacion academica especifica","experiencia":"anos y tipo de experiencia","habilidadesTecnicas":"6-8 hard skills separados por coma","competencias":"5-6 competencias conductuales separadas por coma","idiomas":"requisito de idiomas","modalidad":"Presencial","viajes":"No requerido","tipoContrato":"Tiempo completo","horario":"Lunes a viernes 08:00-17:00","presupuesto":"descripcion del presupuesto que maneja","personas":"estimado personas a cargo","impactoOrg":"Departamento","salarioBruto":"rango salarial USD"}`;

const buildConditionsPrompt = f => `Eres experto en Recursos Humanos.

Cargo levantado:
Nombre: ${san(f.puesto)} | Area: ${san(f.area)} | Nivel estimado: por las funciones descritas
Tipo contrato actual: ${san(f.tipoContrato) || "N/A"} | Tiempo en cargo: ${san(f.tiempoEnPuesto) || "N/A"}

Con base en este cargo, predice las condiciones laborales tipicas. Devuelve UNICAMENTE JSON valido, sin backticks, sin texto adicional, sin saltos de linea en los valores:

{"modalidad":"una de: Presencial, Remoto (Home Office), Hibrido, En campo / Itinerante, Mixto segun necesidad","horario":"horario habitual tipico para este cargo","viajes":"una de: No requerido, Ocasional (< 10%), Moderado (10-30%), Frecuente (30-60%), Constante (> 60%)","presupuesto":"descripcion del presupuesto o recursos que maneja","personas":"estimado de personas supervisadas","impactoOrg":"una de: Individual / Operativo, Equipo / Area, Departamento, Multidepartamental, Toda la organizacion, Grupo empresarial / Corporativo"}`;

const buildFnAssistPrompt = (raw, puesto, area) => `Eres experto en Analisis de Puestos.

El ocupante del cargo ${san(puesto)} (Area: ${san(area)}) describe su funcion:
${san(raw)}

Reformula en formato CAV: Verbo infinitivo + Objeto + para + Finalidad organizacional.
Sugiere pesos CAV: FR(1-5 frecuencia), CO(1-5 consecuencia error), GD(1-5 complejidad).

Devuelve UNICAMENTE JSON valido, sin backticks, sin texto adicional:
{"desc":"funcion reformulada sin comillas dobles internas","fr":4,"co":3,"gd":3,"explicacion":"justificacion breve de los pesos"}`;

const buildFinalPrompt = (f, mode, fnData) => {
  const cavBlock = mode === "levantar" && fnData
    ? "FUNCIONES VALORADAS (CAV):\n" + fnData.map((fn, i) => `F${i + 1}: ${san(fn.desc || fn.raw)} | FR:${fn.fr} CO:${fn.co} GD:${fn.gd} TOTAL:${fn.total}${fn.isPrimary ? " DEBER PRIMARIO" : ""}`).join("\n") + "\n"
    : "";

  const datos = mode === "crear"
    ? `CARGO NUEVO:
Denominacion: ${san(f.puesto)} | Area: ${san(f.area)} | Nivel: ${san(f.nivelJerarquico) || "N/A"} | Reporta a: ${san(f.reportaA)}
Proposito: ${san(f.propositoPrincipal)}
Funciones: ${san(f.responsabilidades)}
KPIs: ${san(f.kpis) || "N/A"} | Proyectos: ${san(f.proyectos) || "N/A"}
CONDICIONES: Modalidad: ${san(f.modalidad) || "N/A"} | Contrato: ${san(f.tipoContrato) || "N/A"} | Horario: ${san(f.horario) || "N/A"}
Viajes: ${san(f.viajes) || "N/A"} | Presupuesto: ${san(f.presupuesto) || "N/A"} | Personas: ${san(f.personas) || "N/A"}
Impacto: ${san(f.impactoOrg) || "N/A"} | Salario ref: ${san(f.salarioBruto) || "N/A"}
PERFIL: Formacion: ${san(f.educacion)} | Experiencia: ${san(f.experiencia)}
Skills: ${san(f.habilidadesTecnicas) || "N/A"} | Competencias: ${san(f.competencias) || "N/A"} | Idiomas: ${san(f.idiomas) || "N/A"}`
    : `CARGO EXISTENTE:
Ocupante: ${san(f.nombreOcupante) || "Anonimo"} | Cargo: ${san(f.puesto)} | Area: ${san(f.area)}
Reporta a: ${san(f.reportaA)} | Tiempo: ${san(f.tiempoEnPuesto) || "N/A"} | Contrato: ${san(f.tipoContrato) || "N/A"}
${cavBlock}CONDICIONES: Modalidad: ${san(f.modalidad) || "N/A"} | Horario: ${san(f.horario) || "N/A"}
Viajes: ${san(f.viajes) || "N/A"} | Presupuesto: ${san(f.presupuesto) || "N/A"} | Personas: ${san(f.personas) || "N/A"}
Impacto: ${san(f.impactoOrg) || "N/A"} | Salario actual: ${san(f.salarioActual) || "N/A"}
Cond. fisicas: ${san(f.condicionesFisicas) || "N/A"} | Cond. ambientales: ${san(f.condicionesAmbientales) || "N/A"}
CONTEXTO: Act. periodicas: ${san(f.actividadesMensuales) || "N/A"}
Decisiones autonomas: ${san(f.decisionesToma) || "N/A"} | Si falta: ${san(f.quePasaSiNoEsta) || "N/A"}
Relaciones int: ${san(f.internosCon) || "N/A"} | Ext: ${san(f.externosCon) || "N/A"}
Herramientas: ${san(f.herramientas) || "N/A"} | Software: ${san(f.sistemasSoftware) || "N/A"}
PERFIL OCUPANTE: Educacion: ${san(f.nivelEducacion) || "N/A"} ${san(f.carreraEstudio) || ""}
Habilidades en uso: ${san(f.habilidadesQueUsa) || "N/A"}
Retos: ${san(f.retosDelPuesto) || "N/A"} | Logros: ${san(f.logrosDestacados) || "N/A"}`;

  return `Eres experto senior en RRHH, Organizacion y Compensaciones. Genera el DESCRIPTIVO FORMAL con VALUACION DE CARGO (Puntos por Factor - adaptacion HAY).

${datos}

INSTRUCCIONES CRITICAS DE FORMATO:
1. Devuelve SOLO JSON valido, sin texto antes ni despues, sin backticks
2. NO uses saltos de linea (\\n) dentro de los valores de string
3. Si necesitas listar items dentro de un string, separalos con | (pipe)
4. NO uses comillas dobles dentro de valores de string - usa comillas simples
5. Todos los strings deben estar en una sola linea

Esquema requerido (reemplaza los valores de ejemplo):
{"resumenEjecutivo":"parrafo 3-4 lineas como texto continuo sin saltos","misionPuesto":"mision en 2 lineas sin saltos","responsabilidadesClave":[{"numero":1,"titulo":"titulo","descripcion":"formato CAV sin saltos","porcentajeTiempo":"20%","esEsencial":true}],"indicadoresExito":[{"kpi":"nombre","descripcion":"descripcion","frecuencia":"Mensual","meta":"valor"}],"perfilIdeal":{"educacion":"formacion","experiencia":"anos y tipo","conocimientosTecnicos":["skill1","skill2","skill3"],"competenciasClave":[{"competencia":"nombre","nivel":"Alto","descripcion":"descripcion"}],"idiomas":"requisito"},"condicionesTrabajo":{"modalidad":"valor","disponibilidadViajes":"valor","presupuesto":"valor","personalACargo":"valor","herramientas":["h1","h2"]},"valuacionCargo":{"metodologia":"Puntos por Factor - Adaptacion HAY","factores":[{"factor":"Conocimientos y Habilidades","descripcion":"descripcion","puntaje":18,"maximo":25},{"factor":"Solucion de Problemas","descripcion":"descripcion","puntaje":14,"maximo":20},{"factor":"Responsabilidad e Impacto","descripcion":"descripcion","puntaje":17,"maximo":25},{"factor":"Condiciones de Trabajo","descripcion":"descripcion","puntaje":6,"maximo":10},{"factor":"Liderazgo y Gestion de Personas","descripcion":"descripcion","puntaje":12,"maximo":20}],"puntajeTotal":67,"puntajeMaximo":100,"gradoCargo":"C","bandaSalarial":{"minimo":"$X000","medio":"$X500","maximo":"$X000","moneda":"USD"},"posicionMercado":"En mercado","justificacionValuacion":"justificacion sin saltos","recomendaciones":["rec1","rec2","rec3"]},"relacionesInternas":[{"area":"area","tipo":"Colabora","descripcion":"descripcion"}],"relacionesExternas":[{"entidad":"entidad","proposito":"proposito"}]}

CRITICO: puntajeTotal = suma exacta de los 5 puntajes. Grado: A=80-100 B=65-79 C=50-64 D=35-49 E=20-34.`;
};

/* ═══════════════ STORAGE ═══════════════ */
const saveDesc = async (result, form, mode) => {
  try {
    const k = `talentiq:${mode}:${Date.now()}`;
    localStorage.setItem(k, JSON.stringify({
      id: Date.now(), mode, key: k,
      puesto: form.puesto, area: form.area, reportaA: form.reportaA,
      grado: result?.valuacionCargo?.gradoCargo || "–",
      puntaje: result?.valuacionCargo?.puntajeTotal || 0,
      banda: result?.valuacionCargo?.bandaSalarial || {},
      posicionMercado: result?.valuacionCargo?.posicionMercado || "",
      resumen: result?.resumenEjecutivo || "",
      mision: result?.misionPuesto || "",
      createdAt: new Date().toISOString(), result,
    }));
    return true;
  } catch { return false; }
};
const loadHistorial = async () => {
  try {
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("talentiq:")) {
        const r = localStorage.getItem(k);
        if (r) items.push({ ...JSON.parse(r), key: k });
      }
    }
    return items.sort((a, b) => b.id - a.id);
  } catch { return []; }
};
const deleteDesc = async k => { try { localStorage.removeItem(k); return true; } catch { return false; } };

/* ═══════════════ ATOMS ═════════════════ */
function Tag({ children, color }) {
  return <span style={{
    display: "inline-block", background: color ? `${color}15` : C.accentDim,
    border: `1px solid ${color ? `${color}40` : C.accent + "40"}`, color: color || C.accentLight,
    borderRadius: 20, padding: "3px 11px", fontSize: 12, fontFamily: FB, margin: "3px 4px 3px 0"
  }}>{children}</span>;
}

function ProgressBar({ current, steps, color = C.accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
      {steps.map((s, i) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: current > s.id ? color : current === s.id ? `${color}18` : "transparent",
              border: `2px solid ${current >= s.id ? color : C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: current > s.id ? 11 : 14, fontWeight: 600,
              color: current > s.id ? C.bg : current === s.id ? color : C.textMuted,
              fontFamily: FD, transition: "all 0.4s"
            }}>
              {current > s.id ? "✓" : s.icon}
            </div>
            <span style={{
              fontSize: 9, color: current >= s.id ? color : C.textMuted, fontFamily: FB,
              fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap"
            }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && <div style={{
            flex: 1, height: 1, margin: "0 5px", marginBottom: 20,
            background: current > s.id ? color : C.border, transition: "background 0.4s"
          }} />}
        </div>
      ))}
    </div>
  );
}

function Field({ field, value, onChange, isAI = false }) {
  const [focused, setFocused] = useState(false);
  const base = {
    width: "100%", boxSizing: "border-box",
    background: isAI ? `${C.teal}08` : C.surface,
    border: `1px solid ${focused ? C.accent : isAI ? `${C.teal}30` : C.border}`,
    boxShadow: focused ? `0 0 0 3px ${C.accentDim}` : "none",
    borderRadius: 6, color: C.text, fontFamily: FB, fontSize: 14,
    padding: "11px 14px", outline: "none", transition: "all 0.2s", lineHeight: 1.6,
  };
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <label style={{
          fontSize: 11, color: C.textSoft, fontFamily: FB, fontWeight: 600,
          letterSpacing: "0.07em", textTransform: "uppercase"
        }}>
          {field.label}{field.required && <span style={{ color: C.accent }}> *</span>}
        </label>
        {isAI && <span style={{
          fontSize: 9, background: `${C.teal}15`, border: `1px solid ${C.teal}30`,
          color: C.teal, borderRadius: 10, padding: "1px 8px", fontFamily: FB, fontWeight: 700
        }}>✦ IA</span>}
      </div>
      {field.helper && (
        <div style={{
          fontSize: 12, color: C.textMuted, fontFamily: FB, lineHeight: 1.65, marginBottom: 8,
          padding: "10px 13px", background: `${C.accent}08`, borderLeft: `2px solid ${C.accent}40`,
          borderRadius: "0 5px 5px 0", whiteSpace: "pre-wrap"
        }}>{field.helper}</div>
      )}
      {field.type === "textarea" ? (
        <textarea rows={4} value={value || ""} placeholder={field.placeholder || ""}
          onChange={e => onChange(field.key, e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ ...base, resize: "vertical" }} />
      ) : field.type === "select" ? (
        <select value={value || ""} onChange={e => onChange(field.key, e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            ...base, cursor: "pointer", appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%23B8932A' d='M5 7L0 2h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center"
          }}>
          <option value="">— Seleccionar —</option>
          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type="text" value={value || ""} placeholder={field.placeholder || ""}
          onChange={e => onChange(field.key, e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={base} />
      )}
    </div>
  );
}

function Spinner({ label, sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 460, gap: 28 }}>
      <div style={{ position: "relative", width: 100, height: 100 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${C.accent}`, animation: "spin 3s linear infinite" }} />
        <div style={{ position: "absolute", inset: 10, borderRadius: "50%", border: `1px solid ${C.teal}`, animation: "spin 2s linear infinite reverse" }} />
        <div style={{ position: "absolute", inset: 22, borderRadius: "50%", background: `radial-gradient(circle,${C.accent}33,transparent)`, animation: "pulse 2s ease-in-out infinite" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontFamily: FD, color: C.accent }}>⬡</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: FD, fontSize: 22, color: C.text, marginBottom: 8, fontStyle: "italic" }}>{label}</div>
        <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, fontFamily: FB }}>{sub}</div>
      </div>
    </div>
  );
}

/* ═══════════════ CAV TABLE ══════════════ */
function FunctionTable({ funciones, funcionPrimaria, onChange, puesto, area }) {
  const addFn = () => { if (funciones.length >= 10) return; onChange("funciones", [...funciones, emptyFn()]); };
  const removeFn = idx => {
    if (funciones.length <= 1) return;
    const nf = funciones.filter((_, i) => i !== idx);
    onChange("funciones", nf);
    if (funcionPrimaria >= nf.length) onChange("funcionPrimaria", 0);
  };
  const updFn = (idx, patch) => {
    const nf = funciones.map((fn, i) => {
      if (i !== idx) return fn;
      const u = { ...fn, ...patch }; u.total = calcTotal(u); return u;
    });
    onChange("funciones", nf);
  };

  const callAiAssist = async idx => {
    const fn = funciones[idx];
    if (!(fn.raw || "").trim()) return;
    updFn(idx, { aiStatus: "loading" });
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "anthropic-dangerously-allow-browser": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 400,
          messages: [{ role: "user", content: buildFnAssistPrompt(fn.raw, puesto || "el cargo", area || "el area") }]
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("").trim() || "";
      const parsed = parseAiJson(text);
      updFn(idx, { aiStatus: "done", aiSuggestion: parsed, approved: false });
    } catch (e) { updFn(idx, { aiStatus: "error" }); }
  };

  const approveAi = idx => {
    const fn = funciones[idx];
    if (!fn.aiSuggestion) return;
    updFn(idx, {
      desc: fn.aiSuggestion.desc, fr: fn.aiSuggestion.fr, co: fn.aiSuggestion.co,
      gd: fn.aiSuggestion.gd, approved: true, aiStatus: "approved"
    });
  };

  const isEsencial = fn => calcTotal(fn) > 15;
  const esencialesCount = funciones.filter(isEsencial).length;
  const selBase = {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 5,
    color: C.text, fontFamily: FB, fontSize: 12, padding: "6px 8px", outline: "none", appearance: "none", cursor: "pointer", width: "100%"
  };

  return (
    <div>
      <div style={{ background: `${C.accent}08`, border: `1px solid ${C.accent}22`, borderRadius: 8, padding: "13px 16px", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.accentLight, fontFamily: FB, marginBottom: 4 }}>Valoración de Funciones — Metodología CAV</div>
        <div style={{ fontSize: 12, color: C.textMuted, fontFamily: FB, lineHeight: 1.7 }}>
          Describe cada función en tus palabras y usa <strong style={{ color: C.teal }}>✦ Asistencia IA</strong> para reformularla y asignar los pesos automáticamente.<br />
          <strong style={{ color: C.textSoft }}>Total = FR + (CO × GD)</strong> · Funciones con Total &gt; 15 son <strong style={{ color: C.green }}>esenciales</strong> (máx. 3)
        </div>
      </div>

      {funciones.map((fn, idx) => {
        const total = calcTotal(fn);
        const esencial = total > 15;
        const isPrimary = funcionPrimaria === idx;
        const hasRaw = (fn.raw || "").trim().length > 0;
        return (
          <div key={idx} style={{
            background: C.surface,
            border: `1px solid ${isPrimary ? C.accent : fn.approved ? `${C.green}50` : esencial ? `${C.green}30` : C.border}`,
            borderRadius: 10, padding: "18px", marginBottom: 16, transition: "all 0.2s",
            boxShadow: isPrimary ? `0 0 0 1px ${C.accent}25` : "none"
          }}>

            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: isPrimary ? C.accent : fn.approved ? `${C.green}20` : esencial ? `${C.green}18` : C.accentDim,
                border: `1px solid ${isPrimary ? C.accent : fn.approved ? C.green : esencial ? C.green : C.accent}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FD, fontSize: 12, fontWeight: 700,
                color: isPrimary ? C.bg : fn.approved ? C.green : esencial ? C.green : C.accent, flexShrink: 0
              }}>
                {fn.approved ? "✓" : idx + 1}
              </div>
              {isPrimary && <Tag color={C.accent}>Deber Primario</Tag>}
              {fn.approved && <Tag color={C.green}>✓ Aprobada</Tag>}
              {esencial && !isPrimary && !fn.approved && <Tag color={C.green}>Función Esencial</Tag>}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  fontFamily: FM, fontSize: 16, fontWeight: 700,
                  color: total > 15 ? C.green : total > 8 ? C.warn : C.textMuted
                }}>{total}</div>
                <div style={{ fontSize: 10, color: C.textMuted, fontFamily: FB }}>pts</div>
              </div>
            </div>

            {/* Raw input */}
            <div style={{ marginBottom: 12 }}>
              <label style={{
                fontSize: 10, color: C.textSoft, fontFamily: FB, fontWeight: 600,
                letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: 6
              }}>
                Describe la función con tus palabras
              </label>
              <textarea rows={3} value={fn.raw || ""}
                placeholder={`Escríbelo como quieras. Ej: "Todos los días reviso los pedidos, los ingreso al sistema y coordino con bodega para que salgan a tiempo"\n— o en formato CAV: "Coordinar el procesamiento de pedidos para asegurar la entrega oportuna"`}
                onChange={e => updFn(idx, { raw: e.target.value, approved: false, aiStatus: null, aiSuggestion: null })}
                style={{
                  width: "100%", boxSizing: "border-box", background: C.card, resize: "vertical",
                  border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontFamily: FB,
                  fontSize: 13, padding: "10px 12px", outline: "none", lineHeight: 1.65
                }} />
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => callAiAssist(idx)} disabled={!hasRaw || fn.aiStatus === "loading"}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    background: hasRaw && fn.aiStatus !== "loading" ? `${C.teal}15` : `${C.border}20`,
                    border: `1px solid ${hasRaw && fn.aiStatus !== "loading" ? C.teal + "40" : C.border}`,
                    color: hasRaw && fn.aiStatus !== "loading" ? C.teal : C.textMuted,
                    borderRadius: 6, padding: "7px 14px", fontFamily: FB, fontSize: 12, fontWeight: 600,
                    cursor: hasRaw && fn.aiStatus !== "loading" ? "pointer" : "not-allowed", transition: "all 0.2s"
                  }}>
                  {fn.aiStatus === "loading"
                    ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Analizando...</>
                    : <><span style={{ fontSize: 13 }}>✦</span> Asistencia IA</>}
                </button>
                {fn.aiStatus === "error" && <span style={{ fontSize: 11, color: C.red, fontFamily: FB }}>No se pudo generar. Intenta nuevamente.</span>}
                {!hasRaw && <span style={{ fontSize: 11, color: C.textMuted, fontFamily: FB, fontStyle: "italic" }}>Escribe la descripción primero</span>}
              </div>
            </div>

            {/* AI suggestion */}
            {fn.aiSuggestion && fn.aiStatus !== "loading" && (
              <div style={{
                marginBottom: 14, background: fn.approved ? `${C.green}08` : `${C.teal}08`,
                border: `1px solid ${fn.approved ? C.green + "30" : C.teal + "25"}`, borderRadius: 8, padding: "14px 16px"
              }}>
                <div style={{
                  fontSize: 10, color: fn.approved ? C.green : C.teal, fontFamily: FB, fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8
                }}>
                  {fn.approved ? "✓ Función aprobada" : "✦ Sugerencia IA — revisa y aprueba"}
                </div>
                <div style={{ fontSize: 13, color: C.text, fontFamily: FB, lineHeight: 1.75, marginBottom: 10, fontStyle: "italic" }}>
                  "{fn.aiSuggestion.desc}"
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
                  {[["FR", fn.aiSuggestion.fr, "Frecuencia"], ["CO", fn.aiSuggestion.co, "Consecuencia"], ["GD", fn.aiSuggestion.gd, "Complejidad"]].map(([k, v, lbl]) => (
                    <div key={k} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: C.textMuted, fontFamily: FB, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{lbl}</div>
                      <div style={{ fontFamily: FM, fontSize: 18, fontWeight: 700, color: C.accentLight }}>{v}</div>
                    </div>
                  ))}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: C.textMuted, fontFamily: FB, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Total</div>
                    <div style={{
                      fontFamily: FM, fontSize: 18, fontWeight: 700,
                      color: (parseInt(fn.aiSuggestion.fr) + parseInt(fn.aiSuggestion.co) * parseInt(fn.aiSuggestion.gd)) > 15 ? C.green : C.warn
                    }}>
                      {parseInt(fn.aiSuggestion.fr) + parseInt(fn.aiSuggestion.co) * parseInt(fn.aiSuggestion.gd)}
                    </div>
                  </div>
                </div>
                {fn.aiSuggestion.explicacion && (
                  <div style={{
                    fontSize: 12, color: C.textMuted, fontFamily: FB, lineHeight: 1.6,
                    padding: "8px 12px", background: C.surface, borderRadius: 5, marginBottom: 12
                  }}>
                    💡 {fn.aiSuggestion.explicacion}
                  </div>
                )}
                {!fn.approved && (
                  <button onClick={() => approveAi(idx)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: `${C.green}18`, border: `1px solid ${C.green}40`,
                      color: C.green, borderRadius: 6, padding: "8px 18px",
                      fontFamily: FB, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
                    }}>
                    ✓ Estoy satisfecho — Aplicar esta función
                  </button>
                )}
              </div>
            )}

            {/* Manual desc when no AI */}
            {!fn.aiSuggestion && (
              <div style={{ marginBottom: 12 }}>
                <label style={{
                  fontSize: 10, color: C.textSoft, fontFamily: FB, fontWeight: 600,
                  letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: 5
                }}>
                  Función formal (edita si no usas IA)
                </label>
                <textarea rows={2} value={fn.desc || ""}
                  placeholder="Formato CAV: Verbo + Objeto + para + Finalidad"
                  onChange={e => updFn(idx, { desc: e.target.value })}
                  style={{
                    width: "100%", boxSizing: "border-box", background: C.card, resize: "vertical",
                    border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontFamily: FB,
                    fontSize: 13, padding: "9px 11px", outline: "none", lineHeight: 1.6
                  }} />
              </div>
            )}

            {/* Scoring selects */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, marginBottom: 12 }}>
              {[{ key: "fr", label: "Frecuencia (FR)", opts: FR_OPTS }, { key: "co", label: "Consecuencia (CO)", opts: CO_OPTS }, { key: "gd", label: "Complejidad (GD)", opts: GD_OPTS }].map(col => (
                <div key={col.key}>
                  <label style={{
                    fontSize: 10, color: C.textSoft, fontFamily: FB, fontWeight: 600,
                    letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: 4
                  }}>{col.label}</label>
                  <select value={fn[col.key]} onChange={e => updFn(idx, { [col.key]: parseInt(e.target.value) })} style={selBase}>
                    {col.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Formula + actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FM }}>
                {fn.fr} + ({fn.co} × {fn.gd}) = <strong style={{ color: total > 15 ? C.green : total > 8 ? C.warn : C.textMuted }}>{total}</strong> pts
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => onChange("funcionPrimaria", idx)}
                  style={{
                    fontSize: 11, background: isPrimary ? C.accent : "transparent",
                    border: `1px solid ${isPrimary ? C.accent : C.border}`,
                    color: isPrimary ? C.bg : C.textMuted, borderRadius: 6,
                    padding: "5px 12px", cursor: "pointer", fontFamily: FB, transition: "all 0.2s"
                  }}>
                  {isPrimary ? "★ Primario" : "☆ Marcar Primario"}
                </button>
                {funciones.length > 1 && (
                  <button onClick={() => removeFn(idx)}
                    style={{
                      fontSize: 11, background: "transparent", border: `1px solid ${C.border}`,
                      color: C.textMuted, borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontFamily: FB
                    }}>✕</button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {funciones.length < 10 && (
        <button onClick={addFn}
          style={{
            width: "100%", background: "transparent", border: `1px dashed ${C.border}`,
            borderRadius: 8, padding: "11px", fontFamily: FB, fontSize: 13, color: C.textMuted,
            cursor: "pointer", transition: "all 0.2s"
          }}>
          + Agregar función
        </button>
      )}

      <div style={{
        marginTop: 14, padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 7, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center"
      }}>
        <div style={{ fontSize: 12, color: C.textMuted, fontFamily: FB }}>
          <strong style={{ color: C.green }}>{funciones.filter(fn => calcTotal(fn) > 15).length}</strong> esencial(es)
          &nbsp;·&nbsp;
          <strong style={{ color: funciones.filter(fn => fn.approved).length > 0 ? C.green : C.textMuted }}>
            {funciones.filter(fn => fn.approved).length}
          </strong> aprobada(s)
          &nbsp;·&nbsp;
          <strong style={{ color: C.textSoft }}>{funciones.length}</strong> total
        </div>
        {esencialesCount > 3 && <div style={{ fontSize: 11, color: C.warn, fontFamily: FB }}>⚠ Máx. 3 esenciales recomendadas</div>}
      </div>
    </div>
  );
}

/* ═══════════════ HISTORIAL ══════════════ */
function HistorialGallery({ onViewProfile }) {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { loadHistorial().then(d => { setItems(d); setLoading(false); }); });

  const handleDelete = async key => {
    setDeleting(key);
    await deleteDesc(key);
    setItems(p => p.filter(i => i.key !== key));
    setDeleting(null);
  };

  const filtered = tab === "all" ? items : items.filter(i => i.mode === tab);
  const gc = g => ({ A: C.teal, B: C.green, C: C.accent, D: C.warn, E: C.red }[g] || C.accent);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 56 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 6 }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <div style={{ fontFamily: FD, fontSize: 22, color: C.textSoft, fontStyle: "italic", whiteSpace: "nowrap" }}>Revisa nuestros perfiles</div>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: C.textMuted, fontFamily: FB }}>{items.length} descriptivo{items.length !== 1 ? "s" : ""} generado{items.length !== 1 ? "s" : ""}</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "center", flexWrap: "wrap" }}>
        {[["all", "Todos"], ["crear", "✦ Creados"], ["levantar", "◎ Levantados"]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{
              background: tab === v ? C.accentDim : "transparent",
              border: `1px solid ${tab === v ? C.accent + "50" : C.border}`,
              color: tab === v ? C.accentLight : C.textMuted,
              borderRadius: 20, padding: "5px 16px", fontFamily: FB, fontSize: 12,
              cursor: "pointer", transition: "all 0.2s", fontWeight: tab === v ? 600 : 400
            }}>
            {l}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 14 }}>
        {filtered.map(item => {
          const isOpen = expanded === item.key;
          const date = new Date(item.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
          return (
            <div key={item.key} style={{
              background: C.card, border: `1px solid ${isOpen ? C.accent + "50" : C.border}`,
              borderRadius: 10, overflow: "hidden", transition: "all 0.3s",
              boxShadow: isOpen ? `0 8px 24px ${C.accent}10` : "none"
            }}>
              <div style={{ padding: "16px 16px 12px", cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : item.key)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <Tag color={item.mode === "crear" ? C.accent : C.violet}>{item.mode === "crear" ? "✦ Creado" : "◎ Levantado"}</Tag>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", border: `2px solid ${gc(item.grado)}`,
                    background: `${gc(item.grado)}12`, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: FD, fontSize: 14, fontWeight: 700, color: gc(item.grado)
                  }}>
                    {item.grado}
                  </div>
                </div>
                <div style={{ fontFamily: FD, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 3, lineHeight: 1.3 }}>{item.puesto}</div>
                <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FB, marginBottom: 8 }}>{item.area}</div>
                {item.banda?.minimo && <div style={{ fontSize: 11, color: C.accentLight, fontFamily: FB, marginBottom: 6, fontStyle: "italic" }}>{item.banda.minimo} – {item.banda.maximo}</div>}
                <div style={{ fontSize: 10, color: C.textMuted, fontFamily: FM }}>{date}</div>
              </div>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 16px", background: C.surface }}>
                  <div style={{
                    fontSize: 12, color: C.textSoft, fontFamily: FB, lineHeight: 1.75, marginBottom: 12,
                    display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden"
                  }}>
                    {item.resumen}
                  </div>
                  {item.mision && (
                    <div style={{
                      fontSize: 12, fontFamily: FD, color: C.text, fontStyle: "italic", marginBottom: 12,
                      padding: "8px 10px", background: C.accentDim, borderLeft: `2px solid ${C.accent}`, borderRadius: "0 4px 4px 0"
                    }}>
                      "{item.mision}"
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                    <button onClick={() => onViewProfile(item)}
                      style={{
                        flex: 1, background: C.accentDim, border: `1px solid ${C.accent}40`,
                        color: C.accentLight, borderRadius: 6, padding: "7px 0", fontFamily: FB,
                        fontSize: 12, fontWeight: 600, cursor: "pointer"
                      }}>
                      Ver descriptivo completo →
                    </button>
                    <button onClick={() => handleDelete(item.key)} disabled={deleting === item.key}
                      style={{
                        background: "transparent", border: `1px solid ${C.border}`,
                        color: C.textMuted, borderRadius: 6, padding: "7px 10px", fontFamily: FB,
                        fontSize: 11, cursor: "pointer", opacity: deleting === item.key ? 0.5 : 1
                      }}>
                      {deleting === item.key ? "..." : "🗑"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════ LANDING ════════════════ */
function Landing({ onSelect, onViewProfile }) {
  const [hov, setHov] = useState(null);
  const cards = [
    {
      id: "crear", icon: "✦", iColor: C.accent, gColor: C.accentDim, badge: "CARGO NUEVO",
      title: "Crear un Cargo",
      desc: "El puesto no existe. Describe el propósito y la IA diseñará funciones, condiciones, perfil y valuación completa.",
      bullets: ["Solo necesitas el propósito general", "La IA pre-rellena funciones, condiciones y perfil", "Revisas paso a paso antes de generar"], cta: "Diseñar cargo →"
    },
    {
      id: "levantar", icon: "◎", iColor: C.violet, gColor: C.violetDim, badge: "CARGO EXISTENTE",
      title: "Levantar un Cargo",
      desc: "La persona ya trabaja pero sin descriptivo formal. La IA pre-rellena condiciones y formaliza las funciones con metodología CAV.",
      bullets: ["Describe cada función en tus propias palabras", "IA reformula en formato CAV y sugiere pesos", "Condiciones pre-rellenadas por IA antes del perfil"], cta: "Levantar cargo →"
    },
  ];
  return (
    <div style={{ animation: "fadeIn 0.6s ease" }}>
      <div style={{ textAlign: "center", marginBottom: 52, paddingTop: 4 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, background: C.accentDim,
          border: `1px solid ${C.accent}30`, borderRadius: 4, padding: "5px 16px", marginBottom: 24
        }}>
          <span style={{ color: C.accent, fontSize: 10 }}>⬡</span>
          <span style={{ fontSize: 10, color: C.accentLight, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: FB, fontWeight: 600 }}>
            TalentIQ · Análisis y Valoración de Puestos
          </span>
        </div>
        <h1 style={{ fontFamily: FD, fontSize: 44, fontWeight: 500, lineHeight: 1.2, margin: "0 0 16px", fontStyle: "italic" }}>
          Descriptivos de Puesto<br />
          <span style={{ color: C.accent, fontStyle: "normal", fontWeight: 700 }}>con Inteligencia Artificial</span>
        </h1>
        <p style={{ fontSize: 15, color: C.textMuted, maxWidth: 500, margin: "0 auto", lineHeight: 1.85, fontFamily: FB }}>
          Descriptivos formales con valuación HAY, metodología CAV y banda salarial. Condiciones pre-rellenadas por IA para mayor precisión.
        </p>
      </div>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontFamily: FD, fontSize: 22, color: C.textSoft, fontStyle: "italic" }}>¿Por dónde empezamos?</div>
        <div style={{ width: 40, height: 1, background: C.accent, margin: "10px auto 0" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 760, margin: "0 auto" }}>
        {cards.map(c => (
          <div key={c.id} onClick={() => onSelect(c.id)}
            onMouseEnter={() => setHov(c.id)} onMouseLeave={() => setHov(null)}
            style={{
              background: hov === c.id ? c.gColor : C.card, border: `1.5px solid ${hov === c.id ? c.iColor : C.border}`,
              borderRadius: 12, padding: "28px 24px", cursor: "pointer", transition: "all 0.3s",
              transform: hov === c.id ? "translateY(-4px)" : "translateY(0)",
              boxShadow: hov === c.id ? `0 16px 40px ${c.iColor}15` : "none", position: "relative", overflow: "hidden"
            }}>
            <div style={{
              position: "absolute", top: -40, right: -40, width: 110, height: 110, borderRadius: "50%",
              background: `${c.iColor}08`, opacity: hov === c.id ? 1 : 0, transition: "opacity 0.3s"
            }} />
            <div style={{
              display: "inline-block", background: `${c.iColor}15`, border: `1px solid ${c.iColor}40`,
              borderRadius: 3, padding: "2px 10px", marginBottom: 16
            }}>
              <span style={{ fontSize: 9, color: c.iColor, fontFamily: FB, fontWeight: 700, letterSpacing: "0.12em" }}>{c.badge}</span>
            </div>
            <div style={{ fontSize: 32, marginBottom: 12, color: c.iColor, fontFamily: FD }}>{c.icon}</div>
            <h2 style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, margin: "0 0 10px", color: C.text }}>{c.title}</h2>
            <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.8, margin: "0 0 20px", fontFamily: FB }}>{c.desc}</p>
            <div style={{ marginBottom: 22 }}>
              {c.bullets.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 9, marginBottom: 7, alignItems: "flex-start" }}>
                  <span style={{ color: c.iColor, fontSize: 11, marginTop: 2, flexShrink: 0 }}>›</span>
                  <span style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.65, fontFamily: FB }}>{b}</span>
                </div>
              ))}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center",
              background: hov === c.id ? c.iColor : "transparent", border: `1px solid ${c.iColor}`,
              borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600,
              color: hov === c.id ? C.bg : c.iColor, fontFamily: FB, transition: "all 0.2s", letterSpacing: "0.03em"
            }}>
              {c.cta}
            </div>
          </div>
        ))}
      </div>
      <HistorialGallery onViewProfile={onViewProfile} />
    </div>
  );
}

/* ═══════════════ RESULTS ════════════════ */
function ResultCard({ title, icon, children }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "22px 26px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 17, color: C.accent }}>{icon}</span>
        <h3 style={{ margin: 0, fontFamily: FD, fontSize: 18, fontWeight: 600, color: C.text }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Results({ result, form, mode, onReset }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => { saveDesc(result, form, mode).then(ok => { if (ok) setSaved(true); }); }, []);
  const gc = g => ({ A: C.teal, B: C.green, C: C.accent, D: C.warn, E: C.red }[g] || C.accent);
  const vc = result.valuacionCargo;
  return (
    <div style={{ animation: "fadeIn 0.5s ease" }}>
      <div style={{
        marginBottom: 14, padding: "10px 16px",
        background: saved ? `${C.green}10` : `${C.accent}08`,
        border: `1px solid ${saved ? C.green + "30" : C.accent + "20"}`, borderRadius: 7,
        display: "flex", alignItems: "center", gap: 10
      }}>
        <span style={{ fontSize: 14 }}>{saved ? "✓" : "⟳"}</span>
        <span style={{ fontSize: 12, color: saved ? C.green : C.textMuted, fontFamily: FB }}>
          {saved ? "Descriptivo guardado en historial — visible en «Revisa nuestros perfiles»" : "Guardando..."}
        </span>
      </div>

      <div style={{
        background: `linear-gradient(135deg,${C.card},${C.surface})`,
        border: `1px solid ${C.border}`, borderRadius: 12, padding: "28px 32px", marginBottom: 16,
        position: "relative", overflow: "hidden"
      }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 130, height: 130, borderRadius: "50%", background: `${C.accent}06` }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <Tag color={mode === "crear" ? C.accent : C.violet}>{mode === "crear" ? "✦ Cargo Diseñado" : "◎ Cargo Levantado"}</Tag>
          <Tag color={C.teal}>Descriptivo Formal</Tag>
        </div>
        <h1 style={{ margin: "0 0 4px", fontFamily: FD, fontSize: 30, fontWeight: 700 }}>{form.puesto}</h1>
        <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 22, fontFamily: FB }}>{form.area} · Reporta a: {form.reportaA}</div>
        {vc && (
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
            {[{ v: vc.puntajeTotal, m: vc.puntajeMaximo, lbl: "Puntaje", clr: vc.puntajeTotal / vc.puntajeMaximo >= .75 ? C.green : vc.puntajeTotal / vc.puntajeMaximo >= .5 ? C.accent : C.red, sz: 18 },
            { v: vc.gradoCargo, lbl: "Grado", clr: gc(vc.gradoCargo), sz: 24 }
            ].map((b, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{
                  width: 62, height: 62, borderRadius: "50%", border: `3px solid ${b.clr}`,
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px",
                  background: `${b.clr}12`, fontFamily: FD, fontSize: b.sz, fontWeight: 700, color: b.clr
                }}>{b.v}</div>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FB }}>{b.lbl}</div>
              </div>
            ))}
            <div style={{ flex: 1, minWidth: 175 }}>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, fontFamily: FB }}>Banda Salarial</div>
              <div style={{ fontFamily: FD, fontSize: 18, color: C.accentLight, fontStyle: "italic" }}>{vc.bandaSalarial?.minimo} – {vc.bandaSalarial?.maximo}</div>
              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FB }}>Punto medio: {vc.bandaSalarial?.medio} · {vc.posicionMercado}</div>
            </div>
          </div>
        )}
      </div>

      <ResultCard title="Resumen Ejecutivo" icon="◈">
        <div style={{ fontSize: 14, lineHeight: 1.85, color: C.textSoft, fontFamily: FB }}>{result.resumenEjecutivo}</div>
        {result.misionPuesto && (
          <div style={{ marginTop: 14, padding: "13px 16px", background: C.accentDim, borderLeft: `3px solid ${C.accent}`, borderRadius: "0 7px 7px 0" }}>
            <div style={{ fontSize: 10, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, fontFamily: FB, fontWeight: 600 }}>Misión del Puesto</div>
            <div style={{ fontFamily: FD, fontSize: 15, color: C.text, lineHeight: 1.7, fontStyle: "italic" }}>"{result.misionPuesto}"</div>
          </div>
        )}
      </ResultCard>

      {result.responsabilidadesClave?.length > 0 && (
        <ResultCard title="Funciones Principales" icon="◉">
          {result.responsabilidadesClave.map(r => (
            <div key={r.numero} style={{ display: "flex", gap: 13, marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
              <div style={{
                minWidth: 28, height: 28, borderRadius: 6,
                background: r.esEsencial ? `${C.green}15` : C.accentDim,
                border: `1px solid ${r.esEsencial ? C.green + "40" : C.accent + "40"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FD, fontSize: 12, color: r.esEsencial ? C.green : C.accent, fontWeight: 700, flexShrink: 0
              }}>{r.numero}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FB }}>{r.titulo}</div>
                  {r.porcentajeTiempo && <span style={{ fontSize: 10, color: C.textMuted, fontFamily: FM }}>{r.porcentajeTiempo}</span>}
                  {r.esEsencial && <Tag color={C.green}>Esencial</Tag>}
                </div>
                <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.8, fontFamily: FB }}>{r.descripcion}</div>
              </div>
            </div>
          ))}
        </ResultCard>
      )}

      {result.indicadoresExito?.length > 0 && (
        <ResultCard title="Indicadores de Desempeño" icon="◎">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(195px,1fr))", gap: 11 }}>
            {result.indicadoresExito.map((k, i) => (
              <div key={i} style={{ background: C.tealDim, border: `1px solid ${C.teal}20`, borderRadius: 9, padding: "13px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.teal, marginBottom: 4, fontFamily: FB }}>{k.kpi}</div>
                <div style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.65, marginBottom: 7, fontFamily: FB }}>{k.descripcion}</div>
                <div><Tag color={C.teal}>{k.frecuencia}</Tag>{k.meta && <Tag color={C.textMuted}>{k.meta}</Tag>}</div>
              </div>
            ))}
          </div>
        </ResultCard>
      )}

      {result.perfilIdeal && (
        <ResultCard title="Perfil del Ocupante" icon="◍">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {[["Formación Académica", "educacion"], ["Experiencia Profesional", "experiencia"]].map(([lbl, k]) => (
              <div key={k}>
                <div style={{ fontSize: 10, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: FB, fontWeight: 600 }}>{lbl}</div>
                <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.75, fontFamily: FB }}>{result.perfilIdeal[k]}</div>
              </div>
            ))}
          </div>
          {result.perfilIdeal.conocimientosTecnicos?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: FB, fontWeight: 600 }}>Conocimientos Técnicos</div>
              <div>{result.perfilIdeal.conocimientosTecnicos.map((k, i) => <Tag key={i}>{k}</Tag>)}</div>
            </div>
          )}
          {result.perfilIdeal.competenciasClave?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: FB, fontWeight: 600 }}>Competencias Conductuales</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(185px,1fr))", gap: 9 }}>
                {result.perfilIdeal.competenciasClave.map((comp, i) => (
                  <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, flexWrap: "wrap", gap: 3 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: FB }}>{comp.competencia}</div>
                      <Tag color={comp.nivel === "Alto" ? C.green : comp.nivel === "Medio" ? C.accent : C.textMuted}>{comp.nivel}</Tag>
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.55, fontFamily: FB }}>{comp.descripcion}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ResultCard>
      )}

      {vc && (
        <ResultCard title="Valuación de Cargo" icon="⬡">
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14, fontFamily: FB }}>{vc.metodologia}</div>
          {vc.factores?.map((f, i) => {
            const p = (f.puntaje / f.maximo) * 100;
            const bc = p >= 75 ? C.green : p >= 50 ? C.accent : C.warn;
            return (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FB }}>{f.factor}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FB }}>{f.descripcion}</div>
                  </div>
                  <div style={{ fontFamily: FM, fontSize: 16, color: bc, fontWeight: 700, minWidth: 55, textAlign: "right" }}>
                    {f.puntaje}<span style={{ fontSize: 10, color: C.textMuted }}>/{f.maximo}</span>
                  </div>
                </div>
                <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${p}%`, background: `linear-gradient(90deg,${bc}70,${bc})`, borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 18, padding: "13px 16px", background: C.accentDim, borderRadius: 8, border: `1px solid ${C.accent}30` }}>
            <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.8, fontFamily: FB }}>{vc.justificacionValuacion}</div>
          </div>
          {vc.recomendaciones?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: FB, fontWeight: 600 }}>Recomendaciones</div>
              {vc.recomendaciones.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 9, marginBottom: 7 }}>
                  <span style={{ color: C.accent, fontSize: 12, marginTop: 1 }}>›</span>
                  <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.7, fontFamily: FB }}>{r}</div>
                </div>
              ))}
            </div>
          )}
        </ResultCard>
      )}

      {(result.relacionesInternas?.length > 0 || result.relacionesExternas?.length > 0) && (
        <ResultCard title="Mapa de Relaciones" icon="◌">
          {result.relacionesInternas?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: FB, fontWeight: 600 }}>Relaciones Internas</div>
              {result.relacionesInternas.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, padding: "9px 12px", background: C.surface, borderRadius: 7 }}>
                  <div style={{ minWidth: 72 }}><Tag>{r.tipo}</Tag></div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FB }}>{r.area}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FB }}>{r.descripcion}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {result.relacionesExternas?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: C.teal, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: FB, fontWeight: 600 }}>Relaciones Externas</div>
              {result.relacionesExternas.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, padding: "9px 12px", background: C.tealDim, borderRadius: 7 }}>
                  <div style={{ minWidth: 100 }}><div style={{ fontSize: 12, fontWeight: 600, color: C.teal, fontFamily: FB }}>{r.entidad}</div></div>
                  <div style={{ fontSize: 12, color: C.textSoft, fontFamily: FB }}>{r.proposito}</div>
                </div>
              ))}
            </div>
          )}
        </ResultCard>
      )}

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button onClick={onReset} style={{
          background: "transparent", border: `1px solid ${C.border}`,
          color: C.textSoft, borderRadius: 6, padding: "10px 24px", fontFamily: FB, fontSize: 13, cursor: "pointer"
        }}>
          ← Volver al inicio
        </button>
      </div>
    </div>
  );
}

function ProfileViewer({ item, onBack }) {
  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{
          background: "transparent", border: `1px solid ${C.border}`,
          color: C.textSoft, borderRadius: 6, padding: "8px 16px", fontFamily: FB, fontSize: 12, cursor: "pointer"
        }}>
          ← Volver al historial
        </button>
        <div style={{ fontSize: 12, color: C.textMuted, fontFamily: FB }}>
          {new Date(item.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
        </div>
        <Tag color={item.mode === "crear" ? C.accent : C.violet}>{item.mode === "crear" ? "✦ Creado" : "◎ Levantado"}</Tag>
      </div>
      {item.result && (
        <Results result={item.result} form={{ puesto: item.puesto, area: item.area, reportaA: item.reportaA }}
          mode={item.mode} onReset={onBack} />
      )}
    </div>
  );
}

function Nav({ screen, mode, step, ac, onReset }) {
  return (
    <div style={{
      borderBottom: `1px solid ${C.border}`, background: C.surface,
      padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={onReset}>
        <div style={{
          width: 32, height: 32, borderRadius: 6, background: `linear-gradient(135deg,${C.accent},${C.accentLight})`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: C.bg, fontFamily: FD, fontWeight: 700
        }}>⬡</div>
        <div>
          <div style={{ fontFamily: FD, fontSize: 17, fontWeight: 700, letterSpacing: "0.02em" }}>TalentIQ</div>
          <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: FB }}>Análisis y Valoración de Puestos · IA</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {mode && screen === "form" && (
          <div style={{ background: `${ac}15`, border: `1px solid ${ac}40`, borderRadius: 3, padding: "3px 11px" }}>
            <span style={{ fontSize: 9, color: ac, fontFamily: FB, fontWeight: 700, letterSpacing: "0.12em" }}>
              {mode === "crear" ? "✦ CREAR CARGO" : "◎ LEVANTAR CARGO"}
            </span>
          </div>
        )}
        {screen === "form" && <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FM }}>Paso {step}/4</div>}
      </div>
    </div>
  );
}

/* ═══════════════ MAIN APP ═══════════════ */
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [mode, setMode] = useState(null);
  const [step, setStep] = useState(1);
  const [formC, setFormC] = useState(initCrear);
  const [formL, setFormL] = useState(mkInitLevantar());
  const [aiPredictions, setAiPredictions] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [viewingProfile, setViewingProfile] = useState(null);
  const topRef = useRef(null);
  const resRef = useRef(null);

  const form = mode === "crear" ? formC : formL;
  const setForm = mode === "crear" ? setFormC : setFormL;
  const steps = mode === "crear" ? stepsCrear : stepsLevantar;
  const allFields = mode === "crear" ? fieldsCrear : fieldsLevantar;
  const grp = allFields.find(g => g.step === step);

  useEffect(() => { topRef.current?.scrollIntoView({ behavior: "smooth" }); }, [step, screen]);
  useEffect(() => { if (result) resRef.current?.scrollIntoView({ behavior: "smooth" }); }, [result]);

  const chg = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const canNext = () => {
    if (mode === "levantar" && step === 2) return formL.funciones.some(fn => (fn.raw || fn.desc || "").trim().length > 0);
    if (!grp) return false;
    return grp.fields.filter(f => f.required).every(f => (form[f.key] || "").trim().length > 0);
  };

  const handleSelect = m => { setMode(m); setScreen("form"); setStep(1); };
  const handleReset = () => {
    setScreen("landing"); setMode(null); setStep(1);
    setFormC(initCrear); setFormL(mkInitLevantar());
    setAiPredictions({}); setResult(null); setError(""); setViewingProfile(null);
  };

  // CREAR step 1 → step 2: predict functions + conditions + profile
  const predictFields = async () => {
    setScreen("predicting"); setError("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "anthropic-dangerously-allow-browser": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1500,
          messages: [{ role: "user", content: buildPredictPrompt(formC) }]
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = data.content?.map(b => b.text || "").join("").trim() || "";
      const parsed = parseAiJson(raw);
      setAiPredictions(parsed);
      setFormC(f => ({ ...f, ...parsed }));
      setScreen("form"); setStep(2);
    } catch (e) {
      setError(`No se pudo generar la predicción. Completa manualmente. (${e.message})`);
      setScreen("form");
    }
  };

  // LEVANTAR step 2 → step 3: predict conditions from known info
  const predictConditions = async () => {
    setScreen("predicting"); setError("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "anthropic-dangerously-allow-browser": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 600,
          messages: [{ role: "user", content: buildConditionsPrompt(formL) }]
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = data.content?.map(b => b.text || "").join("").trim() || "";
      const parsed = parseAiJson(raw);
      // Merge only condition fields (don't overwrite user-entered data)
      setFormL(f => ({
        ...f,
        modalidad: f.modalidad || parsed.modalidad || "",
        horario: f.horario || parsed.horario || "",
        viajes: f.viajes || parsed.viajes || "",
        presupuesto: f.presupuesto || parsed.presupuesto || "",
        personas: f.personas || parsed.personas || "",
        impactoOrg: f.impactoOrg || parsed.impactoOrg || "",
      }));
      setAiPredictions(p => ({ ...p, ...parsed }));
      setScreen("form"); setStep(3);
    } catch (e) {
      // If conditions prediction fails, still advance to step 3
      setScreen("form"); setStep(3);
    }
  };

  const generate = async () => {
    setScreen("generating"); setError("");
    try {
      const fnData = mode === "levantar"
        ? formL.funciones
          .filter(fn => (fn.desc || fn.raw || "").trim())
          .map((fn, i) => ({ ...fn, desc: fn.desc || fn.raw, total: calcTotal(fn), isPrimary: i === formL.funcionPrimaria }))
        : null;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "anthropic-dangerously-allow-browser": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 4096,
          messages: [{ role: "user", content: buildFinalPrompt(form, mode, fnData) }]
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = data.content?.map(b => b.text || "").join("").trim() || "";
      setResult(parseAiJson(raw));
      setScreen("result");
    } catch (e) {
      setError(`Error al generar el descriptivo: ${e.message}. Intenta nuevamente.`);
      setScreen("form");
    }
  };

  const handleNext = () => {
    // crear: step 1 → AI predict all fields
    if (mode === "crear" && step === 1) { predictFields(); return; }
    // levantar: step 2 → AI predict conditions before showing step 3
    if (mode === "levantar" && step === 2) { predictConditions(); return; }
    if (step < 4) { setStep(s => s + 1); } else { generate(); }
  };

  const ac = mode === "crear" ? C.accent : C.violet;
  const al = mode === "crear" ? C.accentLight : "#B8ADEE";

  if (screen === "profile" && viewingProfile) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: FB }} ref={topRef}>
        <style>{FONTS + KF}</style>
        <Nav screen={screen} mode={mode} step={step} ac={ac} onReset={handleReset} />
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 18px" }}>
          <ProfileViewer item={viewingProfile} onBack={handleReset} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: FB }} ref={topRef}>
      <style>{FONTS + KF}</style>
      <Nav screen={screen} mode={mode} step={step} ac={ac} onReset={handleReset} />

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 18px" }}>
        {screen === "landing" && <Landing onSelect={handleSelect} onViewProfile={item => { setViewingProfile(item); setScreen("profile"); }} />}
        {screen === "predicting" && <Spinner label="Analizando con IA" sub={`Procesando información del cargo "${(mode === "crear" ? formC : formL).puesto || "..."}"...`} />}
        {screen === "generating" && <Spinner label="Generando descriptivo formal" sub="Estructurando el descriptivo con valuación HAY y banda salarial..." />}

        {screen === "form" && grp && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <ProgressBar current={step} steps={steps} color={ac} />

            {/* AI banner */}
            {Object.keys(aiPredictions).length > 0 && step > 1 && (
              <div style={{
                background: `${C.teal}08`, border: `1px solid ${C.teal}22`, borderRadius: 8,
                padding: "11px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 11
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", background: `${C.teal}18`,
                  border: `1px solid ${C.teal}35`, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 11, color: C.teal, flexShrink: 0
                }}>✦</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.teal, marginBottom: 2, fontFamily: FB }}>Contenido pre-completado por IA</div>
                  <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.55, fontFamily: FB }}>
                    Los campos <strong style={{ color: C.teal }}>✦ IA</strong> fueron generados automáticamente. Edita lo que necesites.
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "28px 32px" }}>
              <div style={{ marginBottom: 22 }}>
                <div style={{
                  fontSize: 10, color: ac, fontWeight: 700, letterSpacing: "0.12em",
                  textTransform: "uppercase", marginBottom: 5, fontFamily: FB
                }}>
                  {mode === "crear" ? "✦ Diseño de Cargo" : "◎ Levantamiento"} · Sección {step}
                </div>
                <h2 style={{ margin: "0 0 4px", fontFamily: FD, fontSize: 24, fontWeight: 600 }}>{grp.title}</h2>
                {grp.subtitle && <div style={{ fontSize: 13, color: C.textMuted, fontFamily: FB }}>{grp.subtitle}</div>}
              </div>

              {mode === "levantar" && step === 2 ? (
                <FunctionTable funciones={formL.funciones} funcionPrimaria={formL.funcionPrimaria}
                  puesto={formL.puesto} area={formL.area}
                  onChange={(k, v) => setFormL(f => ({ ...f, [k]: v }))} />
              ) : (
                grp.fields.map(field => {
                  const isAI = grp.aiStep && !!field.aiKey && Object.keys(aiPredictions).length > 0;
                  return <Field key={field.key} field={field} value={form[field.key]} onChange={chg} isAI={isAI} />;
                })
              )}

              {error && (
                <div style={{
                  color: C.red, fontSize: 12, marginBottom: 14, padding: "10px 14px",
                  background: `${C.red}08`, borderRadius: 7, border: `1px solid ${C.red}25`,
                  lineHeight: 1.55, fontFamily: FB
                }}>⚠ {error}</div>
              )}

              <div style={{
                display: "flex", justifyContent: "space-between", marginTop: 26,
                paddingTop: 20, borderTop: `1px solid ${C.border}`
              }}>
                <button onClick={step === 1 ? handleReset : () => setStep(s => s - 1)}
                  style={{
                    background: "transparent", border: `1px solid ${C.border}`, color: C.textSoft,
                    borderRadius: 6, padding: "10px 20px", fontFamily: FB, fontSize: 13, cursor: "pointer"
                  }}>
                  ← {step === 1 ? "Volver" : "Anterior"}
                </button>
                <button onClick={handleNext} disabled={!canNext()}
                  style={{
                    background: canNext() ? `linear-gradient(135deg,${ac},${al})` : C.border,
                    border: "none", color: canNext() ? C.bg : C.textMuted, borderRadius: 6,
                    padding: "10px 28px", fontFamily: FB, fontSize: 13, fontWeight: 700,
                    cursor: canNext() ? "pointer" : "not-allowed", transition: "all 0.2s", letterSpacing: "0.03em"
                  }}>
                  {step === 1 && mode === "crear" ? "✦ Analizar con IA →" :
                    step === 2 && mode === "levantar" ? "✦ Predecir Condiciones con IA →" :
                      step < 4 ? "Siguiente →" : "⬡ Generar Descriptivo"}
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === "result" && result && (
          <div ref={resRef}><Results result={result} form={form} mode={mode} onReset={handleReset} /></div>
        )}
      </div>
    </div>
  );
}
