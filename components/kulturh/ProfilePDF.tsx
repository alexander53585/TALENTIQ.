'use client';

/* ═══════════════ PROFILE PDF — KultuRH ═══════════════
   Generador de PDF con react-pdf. Estilo: "Lujo silencioso"
   — líneas finas, tipografía limpia, tablas funcionales.
   ══════════════════════════════════════════════════════ */
import { Document, Page, View, Text, StyleSheet, Font, pdf } from "@react-pdf/renderer";

/* ─── Font Registration ──────────────────────────────── */
Font.register({
    family: "Inter",
    fonts: [
        { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf", fontWeight: 400 },
        { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf", fontWeight: 600 },
        { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf", fontWeight: 700 },
    ],
});

/* ─── Color Palette ──────────────────────────────────── */
const P = {
    bg: "#FFFFFF",
    headerBg: "#1B2A4A",
    headerText: "#FFFFFF",
    primary: "#2A5FD8",
    accent: "#14B8A6",
    text: "#1E293B",
    textSec: "#64748B",
    textMuted: "#94A3B8",
    border: "#CBD5E1",
    borderLight: "#E2E8F0",
    light: "#F8FAFC",
    essential: "#F59E0B",
    rowAlt: "#F1F5F9",
};

/* ─── Stylesheet ─────────────────────────────────────── */
const s = StyleSheet.create({
    page: {
        fontFamily: "Inter", fontSize: 8.5, color: P.text, paddingTop: 36, paddingBottom: 48,
        paddingHorizontal: 36, backgroundColor: P.bg,
    },

    /* Header */
    header: {
        backgroundColor: P.headerBg, borderRadius: 4, padding: "14px 18px",
        flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16,
    },
    headerTitle: { fontSize: 14, fontWeight: 700, color: P.headerText, letterSpacing: 0.3 },
    headerSub: { fontSize: 8, color: "#94A3C8", marginTop: 2 },

    /* Section */
    sectionTitle: {
        fontSize: 9.5, fontWeight: 700, color: P.primary, textTransform: "uppercase",
        letterSpacing: 0.8, borderBottomWidth: 1.5, borderBottomColor: P.primary,
        paddingBottom: 4, marginBottom: 8, marginTop: 14,
    },

    /* Tables */
    table: { borderWidth: 0.5, borderColor: P.border, borderRadius: 3, overflow: "hidden", marginBottom: 10 },
    row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: P.borderLight },
    rowAlt: { backgroundColor: P.rowAlt },
    cellLabel: {
        width: "30%", padding: "5px 8px", fontWeight: 600, fontSize: 8,
        backgroundColor: P.light, borderRightWidth: 0.5, borderRightColor: P.borderLight,
        color: P.textSec, textTransform: "uppercase", letterSpacing: 0.3,
    },
    cellValue: { width: "70%", padding: "5px 8px", fontSize: 8.5, color: P.text, lineHeight: 1.5 },
    cellHalf: { width: "50%", padding: "5px 8px", fontSize: 8.5 },

    /* Functions */
    fnRow: {
        flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: P.borderLight, minHeight: 22,
    },
    fnNum: {
        width: "6%", padding: "5px 4px", textAlign: "center", fontWeight: 700, fontSize: 8,
        color: P.textMuted, backgroundColor: P.light, borderRightWidth: 0.5, borderRightColor: P.borderLight,
    },
    fnDesc: { width: "76%", padding: "5px 8px", fontSize: 8.5, lineHeight: 1.5, color: P.text },
    fnPct: {
        width: "10%", padding: "5px 4px", textAlign: "center", fontSize: 8,
        borderLeftWidth: 0.5, borderLeftColor: P.borderLight, color: P.textSec,
    },
    fnEss: {
        width: "8%", padding: "5px 4px", textAlign: "center", fontSize: 8,
        borderLeftWidth: 0.5, borderLeftColor: P.borderLight, color: P.essential, fontWeight: 700,
    },

    /* Competencies */
    compRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: P.borderLight, minHeight: 20 },
    compName: {
        width: "40%", padding: "4px 8px", fontSize: 8.5, fontWeight: 600, color: P.text,
        borderRightWidth: 0.5, borderRightColor: P.borderLight,
    },
    compLevel: {
        width: "15%", padding: "3px 4px", textAlign: "center", fontSize: 7.5,
        borderRightWidth: 0.5, borderRightColor: P.borderLight,
    },
    compLevelActive: { backgroundColor: P.primary, color: "#FFF", fontWeight: 700, borderRadius: 2 },

    /* Footer */
    footer: {
        position: "absolute", bottom: 20, left: 36, right: 36,
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        borderTopWidth: 0.5, borderTopColor: P.borderLight, paddingTop: 6,
    },
    footerText: { fontSize: 7, color: P.textMuted },

    /* Block text */
    blockText: { fontSize: 8.5, lineHeight: 1.7, color: P.text, textAlign: "justify", padding: "6px 0" },
    noteText: { fontSize: 7, color: P.textSec, fontStyle: "italic", marginTop: 4, lineHeight: 1.5 },

    /* Two-column layout */
    twoCol: { flexDirection: "row", gap: 8 },
    col: { flex: 1 },

    /* KPI block */
    kpiCard: {
        borderWidth: 0.5, borderColor: P.borderLight, borderRadius: 3, padding: "6px 8px",
        marginBottom: 6, backgroundColor: P.light,
    },
    kpiTitle: { fontSize: 8, fontWeight: 700, color: P.primary, marginBottom: 2 },
    kpiDesc: { fontSize: 8, color: P.textSec, lineHeight: 1.4 },

    /* Valuation */
    valBar: {
        height: 6, backgroundColor: P.borderLight, borderRadius: 3, marginTop: 3, marginBottom: 2,
    },
    valFill: { height: 6, backgroundColor: P.primary, borderRadius: 3 },
    valGrade: {
        fontSize: 22, fontWeight: 700, color: P.primary, textAlign: "center",
        marginVertical: 4,
    },

    /* Conditions */
    condRow: { flexDirection: "row", paddingVertical: 3 },
    condDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: P.accent, marginTop: 3, marginRight: 6 },
    condText: { fontSize: 8.5, color: P.text, flex: 1, lineHeight: 1.4 },
});

/* ─── Helper: safe get ──────────────────────────────── */
const g = (obj: any, path: string, def: any = "—"): any => {
    try {
        const v = path.split(".").reduce((o: any, k: string) => o?.[k], obj);
        return v ?? def;
    } catch { return def; }
};

const safeArray = (v: any): any[] => (Array.isArray(v) ? v : []);

/* ═══════════════ PDF DOCUMENT ═══════════════ */
interface ProfileDocumentProps {
    result: any;
    form: any;
    mode: string;
    company?: any;
    sections?: string[];
}

export const ProfileDocument = ({ result, form, mode, company, sections }: ProfileDocumentProps) => {
    const r = result || {};
    const showAll = !sections || sections.length === 0;
    const show = (key: string) => showAll || sections!.includes(key);

    const hasEssential = safeArray(r.responsabilidadesClave).some((f: any) => f.esEsencial);
    const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

    return (
        <Document>
            <Page size="LETTER" style={s.page}>
                {/* ═══ HEADER ═══ */}
                <View style={s.header} fixed>
                    <View>
                        <Text style={s.headerTitle}>DESCRIPTIVO DE CARGO</Text>
                        <Text style={s.headerSub}>{company?.name || "Empresa"} · {today}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 10, fontWeight: 700, color: P.headerText }}>KultuRH</Text>
                        <Text style={{ fontSize: 7, color: "#94A3C8" }}>Sistema de Gestión de Cargos</Text>
                    </View>
                </View>

                {/* ═══ 1. IDENTIFICACIÓN ═══ */}
                {show("identificacion") && (
                    <View>
                        <Text style={s.sectionTitle}>1. Identificación del Cargo</Text>
                        <View style={s.table}>
                            {[
                                ["Denominación del cargo", g(form, "puesto")],
                                ["Dirección / Área", g(form, "area")],
                                ["Departamento", g(form, "area")],
                                ["Jefatura inmediata", g(form, "reportaA")],
                                ["Cargos a supervisar", g(r, "condicionesTrabajo.personalACargo", g(form, "personas", "No aplica"))],
                            ].map(([label, value], i) => (
                                <View style={[s.row, i % 2 === 1 ? s.rowAlt : {}]} key={i}>
                                    <Text style={s.cellLabel}>{label}</Text>
                                    <Text style={s.cellValue}>{value}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Propósito */}
                        <View style={[s.table, { marginTop: 4 }]}>
                            <View style={[s.row, { backgroundColor: P.light }]}>
                                <Text style={[s.cellLabel, { width: "100%", textAlign: "center" }]}>Propósito del Cargo</Text>
                            </View>
                            <View style={{ padding: "6px 10px" }}>
                                <Text style={s.blockText}>{g(r, "misionPuesto", g(form, "propositoPrincipal"))}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* ═══ 2. FUNCIONES ═══ */}
                {show("funciones") && (
                    <View wrap={false}>
                        <Text style={s.sectionTitle}>2. Funciones del Cargo</Text>
                        <View style={s.table}>
                            {/* Header */}
                            <View style={[s.fnRow, { backgroundColor: P.light }]}>
                                <Text style={[s.fnNum, { fontWeight: 700, color: P.textSec }]}>N°</Text>
                                <Text style={[s.fnDesc, { fontWeight: 700, color: P.textSec, fontSize: 8 }]}>Descripción de la Función</Text>
                                <Text style={[s.fnPct, { fontWeight: 700, color: P.textSec, fontSize: 7.5 }]}>% Tiempo</Text>
                                <Text style={[s.fnEss, { fontWeight: 700, color: P.textSec, fontSize: 7.5 }]}>(E)</Text>
                            </View>
                            {safeArray(r.responsabilidadesClave).map((fn: any, i: number) => (
                                <View style={[s.fnRow, i % 2 === 1 ? s.rowAlt : {}]} key={i} wrap={false}>
                                    <Text style={s.fnNum}>{i + 1}</Text>
                                    <Text style={s.fnDesc}>
                                        {fn.titulo ? `${fn.titulo}: ` : ""}{fn.descripcion || "—"}
                                    </Text>
                                    <Text style={s.fnPct}>{fn.porcentajeTiempo || "—"}</Text>
                                    <Text style={s.fnEss}>{fn.esEsencial ? "★" : ""}</Text>
                                </View>
                            ))}
                        </View>
                        {hasEssential && (
                            <Text style={s.noteText}>
                                (E) Corresponde a las Funciones Esenciales del puesto cuya ejecución es indispensable para garantizar la continuidad operativa del área. Su incumplimiento genera impacto directo en resultados clave de la organización.
                            </Text>
                        )}
                    </View>
                )}

                {/* ═══ 3. INDICADORES ═══ */}
                {show("indicadores") && safeArray(r.indicadoresExito).length > 0 && (
                    <View wrap={false}>
                        <Text style={s.sectionTitle}>3. Indicadores de Éxito</Text>
                        <View style={s.table}>
                            <View style={[s.row, { backgroundColor: P.light }]}>
                                <Text style={[s.cellLabel, { width: "25%" }]}>KPI</Text>
                                <Text style={[s.cellHalf, { width: "35%", fontWeight: 600, fontSize: 8, color: P.textSec }]}>Descripción</Text>
                                <Text style={[s.cellHalf, { width: "20%", fontWeight: 600, fontSize: 8, color: P.textSec }]}>Frecuencia</Text>
                                <Text style={[s.cellHalf, { width: "20%", fontWeight: 600, fontSize: 8, color: P.textSec }]}>Meta</Text>
                            </View>
                            {safeArray(r.indicadoresExito).map((kpi: any, i: number) => (
                                <View style={[s.row, i % 2 === 1 ? s.rowAlt : {}]} key={i} wrap={false}>
                                    <Text style={[s.cellLabel, { width: "25%" }]}>{kpi.kpi || "—"}</Text>
                                    <Text style={[s.cellHalf, { width: "35%" }]}>{kpi.descripcion || "—"}</Text>
                                    <Text style={[s.cellHalf, { width: "20%", textAlign: "center" }]}>{kpi.frecuencia || "—"}</Text>
                                    <Text style={[s.cellHalf, { width: "20%", textAlign: "center" }]}>{kpi.meta || "—"}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ═══ 4. COMPETENCIAS Y REQUISITOS ═══ */}
                {show("competencias") && (
                    <View wrap={false}>
                        <Text style={s.sectionTitle}>4. Perfil del Cargo — Requisitos</Text>
                        <View style={s.table}>
                            {[
                                ["Nivel Académico", g(r, "perfilIdeal.educacion")],
                                ["Área de Conocimiento", safeArray(g(r, "perfilIdeal.conocimientosTecnicos", [])).join(", ") || "—"],
                                ["Experiencia", g(r, "perfilIdeal.experiencia")],
                                ["Conocimientos Específicos", safeArray(g(r, "perfilIdeal.conocimientosTecnicos", [])).slice(0, 3).join(", ") || "—"],
                                ["Certificaciones", "Según requerimiento del cargo"],
                                ["Idiomas", g(r, "perfilIdeal.idiomas")],
                            ].map(([label, value], i) => (
                                <View style={[s.row, i % 2 === 1 ? s.rowAlt : {}]} key={i}>
                                    <Text style={s.cellLabel}>{label}</Text>
                                    <Text style={s.cellValue}>{value}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Competencias con scale A-D */}
                        <Text style={[s.sectionTitle, { marginTop: 10 }]}>Competencias Conductuales</Text>
                        <View style={s.table}>
                            <View style={[s.compRow, { backgroundColor: P.light }]}>
                                <Text style={[s.compName, { fontSize: 8, color: P.textSec }]}>Competencia</Text>
                                {["A — Experto", "B — Avanzado", "C — Intermedio", "D — Básico"].map((lbl, i) => (
                                    <Text key={i} style={[s.compLevel, { fontWeight: 600, fontSize: 7, color: P.textSec }]}>{lbl}</Text>
                                ))}
                            </View>
                            {safeArray(g(r, "perfilIdeal.competenciasClave", [])).map((comp: any, i: number) => {
                                const level = (comp.nivel || "C").charAt(0).toUpperCase();
                                return (
                                    <View style={[s.compRow, i % 2 === 1 ? s.rowAlt : {}]} key={i}>
                                        <View style={s.compName}>
                                            <Text style={{ fontSize: 8.5, fontWeight: 600 }}>{comp.competencia || "—"}</Text>
                                            {comp.descripcion && <Text style={{ fontSize: 7, color: P.textSec, marginTop: 1 }}>{comp.descripcion}</Text>}
                                        </View>
                                        {["A", "B", "C", "D"].map(lv => (
                                            <View key={lv} style={[s.compLevel, { justifyContent: "center", alignItems: "center" }]}>
                                                {level === lv ? (
                                                    <View style={{ backgroundColor: P.primary, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 }}>
                                                        <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#FFF" }}>{lv}</Text>
                                                    </View>
                                                ) : (
                                                    <Text style={{ fontSize: 7.5, color: P.textMuted }}>○</Text>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* ═══ 5. DECISIONES Y DESEMPEÑO ═══ */}
                {show("decisiones") && (
                    <View wrap={false}>
                        <Text style={s.sectionTitle}>5. Alcance de Decisiones</Text>
                        <View style={s.twoCol}>
                            <View style={[s.col, s.table]}>
                                <View style={[s.row, { backgroundColor: P.light }]}>
                                    <Text style={[s.cellLabel, { width: "100%", textAlign: "center" }]}>Decisiones propias sin consultar</Text>
                                </View>
                                <View style={{ padding: "6px 8px" }}>
                                    <Text style={s.blockText}>{g(form, "decisionesToma", "Resoluciones operativas dentro del alcance del cargo.")}</Text>
                                </View>
                            </View>
                            <View style={[s.col, s.table]}>
                                <View style={[s.row, { backgroundColor: P.light }]}>
                                    <Text style={[s.cellLabel, { width: "100%", textAlign: "center" }]}>Decisiones con aprobación previa</Text>
                                </View>
                                <View style={{ padding: "6px 8px" }}>
                                    <Text style={s.blockText}>Aprobaciones de presupuesto, contrataciones, cambios estructurales y decisiones que superen la autoridad del cargo.</Text>
                                </View>
                            </View>
                        </View>

                        {/* KPIs as metrics block */}
                        {safeArray(r.indicadoresExito).length > 0 && (
                            <View style={{ marginTop: 8 }}>
                                <Text style={{ fontSize: 8, fontWeight: 700, color: P.textSec, marginBottom: 4 }}>Métricas de Desempeño</Text>
                                <View style={s.twoCol}>
                                    {safeArray(r.indicadoresExito).slice(0, 3).map((kpi: any, i: number) => (
                                        <View style={[s.col, s.kpiCard]} key={i}>
                                            <Text style={s.kpiTitle}>Métrica {i + 1}: {kpi.kpi || "—"}</Text>
                                            <Text style={s.kpiDesc}>{kpi.descripcion || "—"} — Meta: {kpi.meta || "—"}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* ═══ 6. CONDICIONES DE TRABAJO ═══ */}
                {show("condiciones") && (
                    <View wrap={false}>
                        <Text style={s.sectionTitle}>6. Condiciones de Trabajo</Text>
                        <View style={s.table}>
                            {[
                                ["Modalidad", g(r, "condicionesTrabajo.modalidad", g(form, "modalidad"))],
                                ["Disponibilidad de viajes", g(r, "condicionesTrabajo.disponibilidadViajes", g(form, "viajes"))],
                                ["Presupuesto a cargo", g(r, "condicionesTrabajo.presupuesto", g(form, "presupuesto"))],
                                ["Personal a cargo", g(r, "condicionesTrabajo.personalACargo", g(form, "personas"))],
                                ["Herramientas", safeArray(g(r, "condicionesTrabajo.herramientas", [])).join(", ") || g(form, "herramientas", "—")],
                            ].map(([label, value], i) => (
                                <View style={[s.row, i % 2 === 1 ? s.rowAlt : {}]} key={i}>
                                    <Text style={s.cellLabel}>{label}</Text>
                                    <Text style={s.cellValue}>{value}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={{ marginTop: 6 }}>
                            <Text style={{ fontSize: 8, fontWeight: 700, color: P.textSec, marginBottom: 4 }}>Demandas del Puesto</Text>
                            {[
                                { icon: "🏃", label: "Actividad Física", value: g(form, "condicionesFisicas", "Trabajo de oficina. Permanece sentado la mayor parte de la jornada.") },
                                { icon: "👁", label: "Demanda Visual", value: "Uso prolongado de pantalla de computador." },
                                { icon: "🏢", label: "Condiciones Laborales", value: g(form, "condicionesAmbientales", "Ambiente de oficina climatizado bajo condiciones normales.") },
                            ].map((item, i) => (
                                <View style={s.condRow} key={i}>
                                    <View style={s.condDot} />
                                    <Text style={s.condText}><Text style={{ fontWeight: 600 }}>{item.label}:</Text> {item.value}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ═══ 7. VALUACIÓN ═══ */}
                {show("valuacion") && r.valuacionCargo && (
                    <View wrap={false}>
                        <Text style={s.sectionTitle}>7. Valuación del Cargo</Text>
                        <View style={s.twoCol}>
                            <View style={[s.col, s.table]}>
                                <View style={[s.row, { backgroundColor: P.light }]}>
                                    <Text style={[s.cellLabel, { width: "50%" }]}>Factor</Text>
                                    <Text style={[s.cellHalf, { width: "25%", fontWeight: 600, fontSize: 8, color: P.textSec, textAlign: "center" }]}>Puntaje</Text>
                                    <Text style={[s.cellHalf, { width: "25%", fontWeight: 600, fontSize: 8, color: P.textSec, textAlign: "center" }]}>Máximo</Text>
                                </View>
                                {safeArray(r.valuacionCargo.factores).map((f: any, i: number) => (
                                    <View style={[s.row, i % 2 === 1 ? s.rowAlt : {}]} key={i}>
                                        <Text style={[s.cellLabel, { width: "50%" }]}>{f.factor}</Text>
                                        <Text style={[s.cellHalf, { width: "25%", textAlign: "center", fontWeight: 600 }]}>{f.puntaje}</Text>
                                        <Text style={[s.cellHalf, { width: "25%", textAlign: "center", color: P.textMuted }]}>{f.maximo}</Text>
                                    </View>
                                ))}
                                <View style={[s.row, { backgroundColor: P.headerBg }]}>
                                    <Text style={[s.cellLabel, { width: "50%", color: "#FFF", backgroundColor: P.headerBg }]}>TOTAL</Text>
                                    <Text style={[s.cellHalf, { width: "25%", textAlign: "center", fontWeight: 700, color: "#FFF" }]}>{r.valuacionCargo.puntajeTotal || 0}</Text>
                                    <Text style={[s.cellHalf, { width: "25%", textAlign: "center", color: "#94A3C8" }]}>{r.valuacionCargo.puntajeMaximo || 100}</Text>
                                </View>
                            </View>

                            <View style={[s.col, { alignItems: "center", justifyContent: "center" }]}>
                                <Text style={{ fontSize: 8, color: P.textSec, marginBottom: 2 }}>Grado del Cargo</Text>
                                <Text style={s.valGrade}>{r.valuacionCargo.gradoCargo || "—"}</Text>
                                <View style={[s.valBar, { width: "80%" }]}>
                                    <View style={[s.valFill, { width: `${r.valuacionCargo.puntajeTotal || 0}%` }]} />
                                </View>
                                <Text style={{ fontSize: 7.5, color: P.textSec, marginTop: 4 }}>
                                    {r.valuacionCargo.puntajeTotal || 0} / {r.valuacionCargo.puntajeMaximo || 100} puntos
                                </Text>

                                {r.valuacionCargo.bandaSalarial && (
                                    <View style={{ marginTop: 8, alignItems: "center" }}>
                                        <Text style={{ fontSize: 7.5, fontWeight: 600, color: P.textSec }}>Banda Salarial</Text>
                                        <Text style={{ fontSize: 9, fontWeight: 700, color: P.primary, marginTop: 2 }}>
                                            {r.valuacionCargo.bandaSalarial.minimo} — {r.valuacionCargo.bandaSalarial.maximo}
                                        </Text>
                                        <Text style={{ fontSize: 7, color: P.textMuted }}>{r.valuacionCargo.bandaSalarial.moneda || "USD"}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                )}

                {/* ═══ 8. RELACIONES ═══ */}
                {show("relaciones") && (
                    <View wrap={false}>
                        <Text style={s.sectionTitle}>8. Relaciones Organizacionales</Text>
                        <View style={s.twoCol}>
                            <View style={[s.col, s.table]}>
                                <View style={[s.row, { backgroundColor: P.light }]}>
                                    <Text style={[s.cellLabel, { width: "100%", textAlign: "center" }]}>Relaciones Internas</Text>
                                </View>
                                {safeArray(r.relacionesInternas).map((rel: any, i: number) => (
                                    <View style={[s.row, i % 2 === 1 ? s.rowAlt : {}]} key={i}>
                                        <Text style={[s.cellHalf, { fontWeight: 600 }]}>{rel.area || "—"}</Text>
                                        <Text style={s.cellHalf}>{rel.descripcion || rel.tipo || "—"}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={[s.col, s.table]}>
                                <View style={[s.row, { backgroundColor: P.light }]}>
                                    <Text style={[s.cellLabel, { width: "100%", textAlign: "center" }]}>Relaciones Externas</Text>
                                </View>
                                {safeArray(r.relacionesExternas).map((rel: any, i: number) => (
                                    <View style={[s.row, i % 2 === 1 ? s.rowAlt : {}]} key={i}>
                                        <Text style={[s.cellHalf, { fontWeight: 600 }]}>{rel.entidad || "—"}</Text>
                                        <Text style={s.cellHalf}>{rel.proposito || "—"}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {/* ═══ FOOTER ═══ */}
                <View style={s.footer} fixed>
                    <Text style={s.footerText}>
                        Generado por KultuRH · {company?.name || "—"} · {today}
                    </Text>
                    <Text style={s.footerText} render={({ pageNumber, totalPages }: any) => `Página ${pageNumber} de ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
};

/* ═══════════════ BLOB GENERATOR ═══════════════ */
export const generatePdfBlob = async (props: ProfileDocumentProps): Promise<string> => {
    const blob = await pdf(<ProfileDocument {...props} />).toBlob();
    return URL.createObjectURL(blob);
};

/* ═══════════════ SECTION LIST ═══════════════ */
export const PDF_SECTIONS = [
    { key: "identificacion", label: "Identificación", icon: "📋" },
    { key: "funciones", label: "Funciones", icon: "⚙️" },
    { key: "indicadores", label: "Indicadores", icon: "📊" },
    { key: "competencias", label: "Competencias", icon: "🎯" },
    { key: "decisiones", label: "Decisiones", icon: "⚖️" },
    { key: "condiciones", label: "Condiciones", icon: "🏢" },
    { key: "valuacion", label: "Valuación", icon: "💰" },
    { key: "relaciones", label: "Relaciones", icon: "🤝" },
];
