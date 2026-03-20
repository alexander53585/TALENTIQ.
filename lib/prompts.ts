/* ═══════════════ AI PROMPTS & JSON UTILS ════════════════ */
import { createClient } from '@/lib/supabase/client';

// Strip characters that break JSON string values
const san = (v: any): string => {
    if (!v) return "";
    return String(v)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, "'")
        .replace(/\n/g, " ")
        .replace(/\r/g, "")
        .replace(/\t/g, " ")
        .replace(/[\x00-\x1F]/g, " ")
        .trim();
};

// Attempt to repair and parse potentially malformed JSON from LLM
export const parseAiJson = (raw: string): any => {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON block found");
    let txt = match[0];
    txt = txt.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, " ");
    txt = txt.replace(/"([^"]*)"/g, (_, inner) =>
        `"${inner.replace(/\n/g, " ").replace(/\r/g, "").replace(/\t/g, " ")}"`
    );
    try { return JSON.parse(txt); } catch (_) { }
    txt = txt.replace(/:\s*"([\s\S]*?)"/g, (_, v) =>
        `: "${v.replace(/\n/g, " ").replace(/\r/g, "")}"`
    );
    return JSON.parse(txt);
};

export const buildPredictPrompt = (f: Record<string, any>): string => `Eres experto en Análisis de Puestos en Latinoamérica.

Cargo a diseñar:
Nombre: ${san(f.puesto)} | Area: ${san(f.area)} | Reporta a: ${san(f.reportaA)} | Nivel: ${san(f.nivelJerarquico) || "por determinar"}
Proposito: ${san(f.propositoPrincipal)}

ORDEN E2E DE FUNCIONES: Las funciones deben ordenarse siguiendo el flujo End-to-End del valor agregado del cargo: primero Planificación/Análisis, luego Diseño/Desarrollo, luego Ejecución/Implementación, luego Supervisión/Control, finalmente Comunicación/Reporte y Mejora continua.

FUNCION ESENCIAL: Una función es esencial si su score (freq*impact + complexity) >= 10 o si es critica para que el cargo cumpla su propósito.

Devuelve UNICAMENTE JSON valido. Sin backticks, sin texto antes o despues, sin saltos de linea dentro de los valores de string. Usa comillas simples dentro de los valores si necesitas citar algo.

{"funciones":[{"desc":"Verbo+Objeto+para+Finalidad sin adverbios de desempeño","freq":4,"impact":4,"complexity":3,"esEsencial":true},{"desc":"otra funcion","freq":3,"impact":3,"complexity":2,"esEsencial":false}],"kpis":"4-5 KPIs separados por | formato: Nombre: descripcion","proyectos":"2-3 proyectos tipicos separados por |","educacion":"formacion academica especifica","experiencia":"anos y tipo de experiencia","habilidadesTecnicas":"6-8 hard skills separados por coma","competencias":"5-6 competencias conductuales separadas por coma","idiomas":"requisito de idiomas","modalidad":"Presencial","viajes":"No requerido","tipoContrato":"Tiempo completo","horario":"Lunes a viernes 08:00-17:00","presupuesto":"descripcion del presupuesto que maneja","personas":"estimado personas a cargo","impactoOrg":"Departamento","salarioBruto":"rango salarial USD"}

CRITICO: genera entre 6 y 8 funciones ordenadas E2E. El array funciones debe tener entre 6 y 8 elementos. NO incluir adverbios: eficientemente, correctamente, adecuadamente, oportunamente.`;

export const buildConditionsPrompt = (f: Record<string, any>): string => `Eres experto en Recursos Humanos.

Cargo levantado:
Nombre: ${san(f.puesto)} | Area: ${san(f.area)} | Nivel estimado: por las funciones descritas
Tipo contrato actual: ${san(f.tipoContrato) || "N/A"} | Tiempo en cargo: ${san(f.tiempoEnPuesto) || "N/A"}

Con base en este cargo, predice las condiciones laborales tipicas. Devuelve UNICAMENTE JSON valido, sin backticks, sin texto adicional, sin saltos de linea en los valores:

{"modalidad":"una de: Presencial, Remoto (Home Office), Hibrido, En campo / Itinerante, Mixto segun necesidad","horario":"horario habitual tipico para este cargo","viajes":"una de: No requerido, Ocasional (< 10%), Moderado (10-30%), Frecuente (30-60%), Constante (> 60%)","presupuesto":"descripcion del presupuesto o recursos que maneja","personas":"estimado de personas supervisadas","impactoOrg":"una de: Individual / Operativo, Equipo / Area, Departamento, Multidepartamental, Toda la organizacion, Grupo empresarial / Corporativo"}`;

export const buildFnAssistPrompt = (raw: string, puesto: string, area: string): string => `Eres experto en Analisis de Puestos.

El ocupante del cargo ${san(puesto)} (Area: ${san(area)}) describe su funcion:
${san(raw)}

Reformula siguiendo esta estructura: [Verbo de accion] + [objeto de la accion] + [verbo de resultado] + [finalidad o impacto]
REGLA CRITICA: NO incluir criterios de eficacia ni adverbios de desempeno como eficientemente, correctamente, adecuadamente, oportunamente, de manera optima, con calidad.
La redaccion debe centrarse en accion, objeto, resultado y finalidad.

Sugiere factores: frecuencia(1-5), impacto(1-5 consecuencia si no se hace), complejidad(1-5).

Devuelve UNICAMENTE JSON valido, sin backticks, sin texto adicional:
{"desc":"funcion reformulada sin comillas dobles internas","freq":4,"impact":3,"complexity":3,"explicacion":"justificacion breve"}`;

export const buildFinalPrompt = (f: Record<string, any>, mode: string, fnData: any[] | null): string => {
    const cavBlock = mode === "levantar" && fnData
        ? "FUNCIONES VALORADAS:\n" + fnData.map((fn, i) =>
            `F${i + 1}: ${san(fn.desc || fn.raw)} | Freq:${fn.freq} Impact:${fn.impact} Complexity:${fn.complexity} Score:${fn.score}${fn.isEssential ? " FUNCION ESENCIAL" : ""}`
        ).join("\n") + "\n"
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
2. NO uses saltos de linea dentro de los valores de string
3. Si necesitas listar items dentro de un string, separalos con | (pipe)
4. NO uses comillas dobles dentro de valores de string - usa comillas simples
5. Todos los strings deben estar en una sola linea

Esquema requerido (reemplaza los valores de ejemplo):
{"resumenEjecutivo":"parrafo 3-4 lineas como texto continuo sin saltos","misionPuesto":"mision en 2 lineas sin saltos","responsabilidadesClave":[{"numero":1,"titulo":"titulo","descripcion":"formato: verbo+objeto+resultado+finalidad sin saltos","porcentajeTiempo":"20%","esEsencial":true}],"indicadoresExito":[{"kpi":"nombre","descripcion":"descripcion","frecuencia":"Mensual","meta":"valor"}],"perfilIdeal":{"educacion":"formacion","experiencia":"anos y tipo","conocimientosTecnicos":["skill1","skill2","skill3"],"competenciasClave":[{"competencia":"nombre","nivel":"Alto","descripcion":"descripcion"}],"idiomas":"requisito"},"condicionesTrabajo":{"modalidad":"valor","disponibilidadViajes":"valor","presupuesto":"valor","personalACargo":"valor","herramientas":["h1","h2"]},"valuacionCargo":{"metodologia":"Puntos por Factor - Adaptacion HAY","factores":[{"factor":"Conocimientos y Habilidades","descripcion":"descripcion","puntaje":18,"maximo":25},{"factor":"Solucion de Problemas","descripcion":"descripcion","puntaje":14,"maximo":20},{"factor":"Responsabilidad e Impacto","descripcion":"descripcion","puntaje":17,"maximo":25},{"factor":"Condiciones de Trabajo","descripcion":"descripcion","puntaje":6,"maximo":10},{"factor":"Liderazgo y Gestion de Personas","descripcion":"descripcion","puntaje":12,"maximo":20}],"puntajeTotal":67,"puntajeMaximo":100,"gradoCargo":"C","bandaSalarial":{"minimo":"$X000","medio":"$X500","maximo":"$X000","moneda":"USD"},"posicionMercado":"En mercado","justificacionValuacion":"justificacion sin saltos","recomendaciones":["rec1","rec2","rec3"]},"relacionesInternas":[{"area":"area","tipo":"Colabora","descripcion":"descripcion"}],"relacionesExternas":[{"entidad":"entidad","proposito":"proposito"}]}

CRITICO: puntajeTotal = suma exacta de los 5 puntajes. Grado: A=80-100 B=65-79 C=50-64 D=35-49 E=20-34.`;
};

/* ═══════════════ STORAGE ═══════════════ */
export const saveDesc = async (result: any, form: any, mode: string): Promise<boolean> => {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        const k = `kulturh:${mode}:${Date.now()}`;
        const record = {
            id: Date.now(), mode, key: k,
            puesto: form.puesto, area: form.area, reportaA: form.reportaA,
            grado: result?.valuacionCargo?.gradoCargo || "–",
            puntaje: result?.valuacionCargo?.puntajeTotal || 0,
            banda: result?.valuacionCargo?.bandaSalarial || {},
            posicionMercado: result?.valuacionCargo?.posicionMercado || "",
            resumen: result?.resumenEjecutivo || "",
            mision: result?.misionPuesto || "",
            createdAt: new Date().toISOString(), result,
        };

        // Try Supabase first if user is logged in
        if (userId) {
            try {
                await supabase.from('descriptivos').insert({
                    user_id: userId,
                    key: k,
                    mode,
                    puesto: form.puesto,
                    area: form.area,
                    data: record,
                });
            } catch (_) {
                // Fall back to localStorage
            }
        }

        // Always save to localStorage as fallback
        localStorage.setItem(k, JSON.stringify(record));
        return true;
    } catch { return false; }
};

export const loadHistorial = async (): Promise<any[]> => {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Try Supabase first
        if (user?.id) {
            try {
                const { data } = await supabase
                    .from('descriptivos')
                    .select('data')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });
                if (data && data.length > 0) {
                    return data.map((r: any) => r.data).sort((a: any, b: any) => b.id - a.id);
                }
            } catch (_) {
                // Fall back to localStorage
            }
        }

        // localStorage fallback
        const items: any[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith("kulturh:")) {
                const r = localStorage.getItem(k);
                if (r) items.push({ ...JSON.parse(r), key: k });
            }
        }
        return items.sort((a, b) => b.id - a.id);
    } catch { return []; }
};

export const deleteDesc = async (k: string): Promise<boolean> => {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
            try {
                await supabase.from('descriptivos').delete().eq('key', k).eq('user_id', user.id);
            } catch (_) { }
        }
        localStorage.removeItem(k);
        return true;
    } catch { return false; }
};

/* ═══════════════ FIELD SCHEMAS ═════════════════ */
export const fieldsCrear = [
    {
        step: 1, title: "Identificación del cargo", subtitle: "Completa los datos base del cargo. Luego el sistema te ayudará a estructurar funciones, condiciones y perfil.", fields: [
            { key: "puesto", label: "Denominación del puesto", placeholder: "Ej. Desarrollador de software", type: "text", required: true },
            { key: "area", label: "Área / Departamento", placeholder: "Ej. Tecnología", type: "text", required: true },
            { key: "reportaA", label: "Reporta a", placeholder: "Ej. Líder de Desarrollo", type: "text", required: true },
            { key: "nivelJerarquico", label: "Nivel jerárquico", type: "select", options: ["Operativo", "Técnico / Especialista", "Supervisor / Coordinador", "Jefatura", "Gerencia", "Dirección", "Alta Dirección / C-Level"] },
            { key: "propositoPrincipal", label: "¿Para qué existe este cargo?", placeholder: "Ej. Diseñar y mejorar aplicaciones internas", type: "textarea", required: true },
        ]
    },
    {
        step: 2, title: "Funciones del cargo", subtitle: "Generadas por IA — revisa y ajusta", aiStep: true, fields: [
            {
                key: "responsabilidades", label: "Funciones principales",
                helper: "Estructura sugerida: verbo de acción + objeto de la acción + verbo de resultado + finalidad o impacto",
                type: "textarea", aiKey: "responsabilidades"
            },
            { key: "kpis", label: "Indicadores de desempeño", type: "textarea", aiKey: "kpis" },
            { key: "proyectos", label: "Proyectos o iniciativas típicas", type: "textarea", aiKey: "proyectos" },
        ]
    },
    {
        step: 3, title: "Condiciones del cargo", subtitle: "Contexto laboral — generado por IA, edita lo que necesites", aiStep: true, fields: [
            { key: "modalidad", label: "Modalidad de trabajo", type: "select", aiKey: "modalidad", options: ["Presencial", "Remoto (Home Office)", "Híbrido (3/2)", "Híbrido (2/3)", "Flexible"] },
            { key: "tipoContrato", label: "Tipo de vinculación", type: "select", aiKey: "tipoContrato", options: ["Tiempo completo", "Tiempo parcial", "Por obra o servicio", "Honorarios profesionales", "Contrato indefinido"] },
            { key: "horario", label: "Jornada / Horario habitual", placeholder: "Ej. Lunes a viernes 08:00–17:00", type: "text", aiKey: "horario" },
            { key: "viajes", label: "Requerimiento de viajes", type: "select", aiKey: "viajes", options: ["No requerido", "Ocasional (< 10%)", "Moderado (10–30%)", "Frecuente (30–60%)", "Constante (> 60%)"] },
            { key: "presupuesto", label: "Administración de presupuesto / recursos", type: "text", aiKey: "presupuesto", placeholder: "Ej. Maneja caja chica de $500 / No aplica" },
            { key: "personas", label: "Personal a cargo (estimado)", type: "text", aiKey: "personas", placeholder: "Ej. 0 / 3 directas / 2 directas + 8 indirectas" },
            { key: "impactoOrg", label: "Alcance del impacto organizacional", type: "select", aiKey: "impactoOrg", options: ["Individual / Operativo", "Equipo / Área", "Departamento", "Multidepartamental", "Toda la organización", "Grupo empresarial / Corporativo"] },
            { key: "salarioBruto", label: "Rango salarial bruto mensual (USD)", type: "text", aiKey: "salarioBruto", placeholder: "Ej. $3,000 – $4,500 USD" },
        ]
    },
    {
        step: 4, title: "Perfil del candidato ideal", subtitle: "Generado por IA con base en el cargo y sus condiciones — revisa y ajusta", aiStep: true, fields: [
            { key: "educacion", label: "Formación académica requerida", type: "text", aiKey: "educacion" },
            { key: "experiencia", label: "Experiencia profesional", type: "text", aiKey: "experiencia" },
            { key: "habilidadesTecnicas", label: "Conocimientos técnicos requeridos", type: "textarea", aiKey: "habilidadesTecnicas" },
            { key: "competencias", label: "Competencias conductuales clave", type: "textarea", aiKey: "competencias" },
            { key: "idiomas", label: "Dominio de idiomas", type: "text", aiKey: "idiomas" },
        ]
    },
];

export const fieldsLevantar = [
    {
        step: 1, title: "Identificación del cargo", subtitle: "Completa los datos base del cargo. Luego el sistema te ayudará a estructurar funciones, condiciones y perfil.", fields: [
            { key: "nombreOcupante", label: "Nombre del ocupante (opcional)", placeholder: "Puede omitirse", type: "text" },
            { key: "puesto", label: "Denominación del puesto", placeholder: "Ej. Desarrollador de software", type: "text", required: true },
            { key: "area", label: "Área / Departamento", placeholder: "Ej. Tecnología", type: "text", required: true },
            { key: "reportaA", label: "Reporta a", placeholder: "Ej. Líder de Desarrollo", type: "text", required: true },
            { key: "tiempoEnPuesto", label: "Tiempo en el cargo", placeholder: "Ej. 3 años 2 meses", type: "text" },
            { key: "tipoContrato", label: "Tipo de vinculación", type: "select", options: ["Tiempo completo", "Tiempo parcial", "Por obra o servicio", "Honorarios profesionales", "Otro"] },
        ]
    },
    { step: 2, title: "Funciones del cargo", subtitle: "Describe cada función en tus palabras. El sistema te ayudará a convertirla en una redacción formal.", cavStep: true, fields: [] },
    {
        step: 3, title: "Condiciones del cargo", subtitle: "Contexto laboral — pre-completado por IA, edita lo que necesites", aiStep: true, fields: [
            { key: "modalidad", label: "Modalidad de trabajo actual", type: "select", aiKey: "modalidad", options: ["Presencial", "Remoto (Home Office)", "Híbrido", "En campo / Itinerante", "Mixto según necesidad"] },
            { key: "horario", label: "Jornada / Horario habitual", placeholder: "Ej. Lunes a viernes 08:00–17:00", type: "text", aiKey: "horario" },
            { key: "viajes", label: "Disponibilidad para viajar", type: "select", aiKey: "viajes", options: ["No requerido", "Ocasional (< 10%)", "Moderado (10–30%)", "Frecuente (30–60%)", "Constante (> 60%)"] },
            { key: "presupuesto", label: "Manejo de presupuesto / recursos", type: "text", aiKey: "presupuesto", placeholder: "Ej. Caja chica $500 / No maneja presupuesto" },
            { key: "personas", label: "Personas que supervisa en la práctica", type: "text", aiKey: "personas", placeholder: "Ej. 0 / 3 directas" },
            { key: "impactoOrg", label: "Alcance del impacto real del cargo", type: "select", aiKey: "impactoOrg", options: ["Individual / Operativo", "Equipo / Área", "Departamento", "Multidepartamental", "Toda la organización", "Grupo empresarial / Corporativo"] },
            { key: "condicionesFisicas", label: "Demandas físicas del cargo", placeholder: "Ej. Permanece sentado 90% del tiempo", type: "textarea" },
            { key: "condicionesAmbientales", label: "Condiciones ambientales o de riesgo", placeholder: "Ej. Oficina climatizada / Bodega con ruido", type: "textarea" },
            { key: "salarioActual", label: "Remuneración bruta mensual actual", placeholder: "Ej. $2,100 USD o Confidencial", type: "text" },
        ]
    },
    {
        step: 4, title: "Contexto operativo y perfil", subtitle: "Cómo opera el cargo en la práctica", fields: [
            { key: "actividadesMensuales", label: "Actividades periódicas o esporádicas", placeholder: "Tareas mensuales, trimestrales o anuales...", type: "textarea" },
            { key: "decisionesToma", label: "Decisiones que toma de forma autónoma", placeholder: "¿Qué resuelve sin consultar?", type: "textarea" },
            { key: "quePasaSiNoEsta", label: "Impacto si falta 1 semana", placeholder: "¿Qué se detiene o complica?", type: "textarea" },
            { key: "internosCon", label: "Relaciones internas frecuentes", placeholder: "Áreas o cargos con los que interactúa...", type: "textarea" },
            { key: "externosCon", label: "Relaciones externas", placeholder: "Proveedores, clientes, entidades...", type: "textarea" },
            { key: "herramientas", label: "Recursos y herramientas que utiliza", placeholder: "Vehículo, caja chica, maquinaria...", type: "textarea" },
            { key: "sistemasSoftware", label: "Software y sistemas digitales", placeholder: "Ej. SAP, Excel, CRM, ERP...", type: "text" },
            { key: "nivelEducacion", label: "Nivel de educación del ocupante", type: "select", options: ["Educación básica", "Bachillerato", "Técnico / Tecnólogo", "Universitaria incompleta", "Universitaria completa", "Especialización / Postgrado", "Maestría o superior"] },
            { key: "carreraEstudio", label: "Carrera o área de estudio", placeholder: "Ej. Administración de Empresas", type: "text" },
            { key: "habilidadesQueUsa", label: "Conocimientos y habilidades en uso real", placeholder: "Lo que realmente aplica en el día a día...", type: "textarea" },
            { key: "retosDelPuesto", label: "Principales retos del cargo", placeholder: "Alta presión, coordinación múltiple...", type: "textarea" },
            { key: "logrosDestacados", label: "Logros o aportes destacados", placeholder: "Mejoras implementadas, resultados extraordinarios...", type: "textarea" },
        ]
    },
];

export const initCrear: Record<string, string> = {
    puesto: "", area: "", reportaA: "", nivelJerarquico: "", propositoPrincipal: "",
    responsabilidades: "", kpis: "", proyectos: "",
    modalidad: "", viajes: "", presupuesto: "", personas: "", impactoOrg: "", salarioBruto: "", horario: "", tipoContrato: "",
    educacion: "", experiencia: "", habilidadesTecnicas: "", competencias: "", idiomas: "",
};

export const mkInitLevantar = () => ({
    nombreOcupante: "", puesto: "", area: "", reportaA: "", tiempoEnPuesto: "", tipoContrato: "",
    funciones: [
        { raw: "", desc: "", freq: 3, impact: 2, complexity: 3, aiStatus: null, aiSuggestion: null, confirmed: false },
        { raw: "", desc: "", freq: 3, impact: 2, complexity: 3, aiStatus: null, aiSuggestion: null, confirmed: false },
        { raw: "", desc: "", freq: 3, impact: 2, complexity: 3, aiStatus: null, aiSuggestion: null, confirmed: false }
    ],
    essentialFunctions: [] as number[],
    modalidad: "", viajes: "", presupuesto: "", personas: "", impactoOrg: "", salarioBruto: "",
    horario: "", condicionesFisicas: "", condicionesAmbientales: "",
    actividadesMensuales: "", decisionesToma: "", quePasaSiNoEsta: "",
    internosCon: "", externosCon: "", herramientas: "", sistemasSoftware: "",
    nivelEducacion: "", carreraEstudio: "", experienciaPrevia: "",
    habilidadesQueUsa: "", retosDelPuesto: "", logrosDestacados: "", salarioActual: "",
});
