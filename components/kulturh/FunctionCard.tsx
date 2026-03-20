'use client';

import { useState } from "react";
import { C, FF, FREQ_OPTS, IMPACT_OPTS, COMPLEXITY_OPTS, emptyFn, calcScore } from "@/lib/tokens";
import { Tag } from "@/components/kulturh/Atoms";
import { buildFnAssistPrompt, parseAiJson } from "@/lib/prompts";

/* ═══════════════ FUNCTION TABLE ═════════════════ */
interface FunctionItem {
    raw: string;
    desc: string;
    freq: number;
    impact: number;
    complexity: number;
    aiStatus: string | null;
    aiSuggestion: any;
    confirmed: boolean;
    aiErrorMsg?: string | null;
    [key: string]: any;
}

interface FunctionTableProps {
    funciones: FunctionItem[];
    onChange: (key: string, value: any) => void;
    puesto?: string;
    area?: string;
}

export function FunctionTable({ funciones, onChange, puesto, area }: FunctionTableProps) {
    const addFn = () => { if (funciones.length >= 10) return; onChange("funciones", [...funciones, emptyFn()]); };
    const removeFn = (idx: number) => {
        if (funciones.length <= 1) return;
        onChange("funciones", funciones.filter((_, i) => i !== idx));
    };
    const updFn = (idx: number, patch: Partial<FunctionItem>) => {
        onChange("funciones", funciones.map((fn, i) => i !== idx ? fn : { ...fn, ...patch }));
    };

    const callAiAssist = async (idx: number) => {
        const fn = funciones[idx];
        if (!(fn.raw || "").trim()) return;
        updFn(idx, { aiStatus: "loading", aiErrorMsg: null });
        try {
            const res = await fetch("/api/anthropic", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [{ role: "user", content: buildFnAssistPrompt(fn.raw, puesto || "el cargo", area || "el area") }],
                }),
            });
            if (!res.ok) {
                if (res.status === 404) throw new Error("MODEL_UNAVAILABLE");
                if (res.status === 401) throw new Error("AUTH_ERROR");
                if (res.status === 429) throw new Error("RATE_LIMIT");
                throw new Error("API_ERROR");
            }
            const data = await res.json();
            const text = data.content?.map((b: any) => b.text || "").join("").trim() || "";
            const parsed = parseAiJson(text);
            updFn(idx, { aiStatus: "done", aiSuggestion: parsed, confirmed: false, aiErrorMsg: null });
        } catch (err: any) {
            console.error("[FunctionCard] callAiAssist:", err.message);
            const msgs: Record<string, string> = {
                NO_KEY: "Falta la clave de API.",
                AUTH_ERROR: "Clave de API inválida o sin acceso.",
                MODEL_UNAVAILABLE: "Modelo no disponible. Verifica créditos en console.anthropic.com.",
                RATE_LIMIT: "Demasiadas solicitudes. Espera unos segundos.",
            };
            updFn(idx, { aiStatus: "error", aiErrorMsg: msgs[err.message] || "Error de IA. Puedes escribir la descripción manualmente." });
        }
    };

    const approveAi = (idx: number) => {
        const fn = funciones[idx];
        if (!fn.aiSuggestion) return;
        updFn(idx, {
            desc: fn.aiSuggestion.desc,
            freq: fn.aiSuggestion.freq,
            impact: fn.aiSuggestion.impact,
            complexity: fn.aiSuggestion.complexity,
            confirmed: true, aiStatus: "approved",
        });
    };

    const confirmFn = (idx: number) => {
        const fn = funciones[idx];
        if (!(fn.desc || fn.raw || "").trim()) return;
        updFn(idx, { confirmed: true });
    };

    const selStyle: React.CSSProperties = {
        background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 10,
        color: C.text, fontFamily: FF, fontSize: 14, padding: "10px 14px",
        outline: "none", appearance: "none", cursor: "pointer", width: "100%",
        boxShadow: C.shadow, transition: "all 0.2s",
    };

    return (
        <div>
            <div style={{
                background: C.primaryDim, border: `1px solid ${C.primary}20`,
                borderRadius: 12, padding: "14px 18px", marginBottom: 24,
            }}>
                <div style={{
                    fontSize: 13, color: C.textSecondary, fontFamily: FF, lineHeight: 1.7,
                }}>
                    Describe cada función en tus palabras y usa <strong style={{ color: C.primary }}>✦ Asistencia IA</strong> para
                    convertirla en una redacción formal.
                </div>
            </div>

            {funciones.map((fn, idx) => {
                const hasRaw = (fn.raw || "").trim().length > 0;
                const isConfirmed = fn.confirmed;

                return (
                    <div key={idx} style={{
                        background: isConfirmed ? C.successDim : "#fff",
                        border: `2px solid ${isConfirmed ? C.success : C.border}`,
                        borderRadius: 14, padding: "22px 24px", marginBottom: 18,
                        transition: "all 0.4s ease",
                        boxShadow: isConfirmed ? `0 0 0 0 transparent` : C.shadow,
                        animation: isConfirmed ? "successGlow 1s ease-out" : "none",
                        position: "relative", overflow: "hidden",
                    }}>
                        {/* Holographic sweep on confirm */}
                        {isConfirmed && (
                            <div style={{
                                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                                background: C.holo, backgroundSize: "200% 100%",
                                animation: "holoSweep 2s ease-out forwards",
                            }} />
                        )}

                        {/* Header */}
                        <div style={{
                            display: "flex", alignItems: "center", gap: 10,
                            marginBottom: 16, flexWrap: "wrap",
                        }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: "50%",
                                background: isConfirmed ? C.success : C.primaryDim,
                                border: `2px solid ${isConfirmed ? C.success : C.primary}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontFamily: FF, fontSize: 13, fontWeight: 700,
                                color: isConfirmed ? "#fff" : C.primary,
                                transition: "all 0.3s",
                            }}>
                                {isConfirmed ? "✓" : idx + 1}
                            </div>
                            <span style={{
                                fontSize: 15, fontWeight: 600, color: C.text, fontFamily: FF,
                            }}>Función {idx + 1}</span>
                            {isConfirmed && <Tag color={C.success}>Confirmada</Tag>}
                            {funciones.length > 1 && (
                                <button onClick={() => removeFn(idx)} style={{
                                    marginLeft: "auto", fontSize: 12, background: "transparent",
                                    border: `1px solid ${C.border}`, color: C.textMuted,
                                    borderRadius: 8, padding: "5px 10px", cursor: "pointer",
                                    fontFamily: FF, transition: "all 0.2s",
                                }}>✕</button>
                            )}
                        </div>

                        {/* Raw input */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={{
                                fontSize: 13, color: C.text, fontFamily: FF,
                                fontWeight: 600, display: "block", marginBottom: 6,
                            }}>Describe la función en tus palabras</label>
                            <textarea rows={3} value={fn.raw || ""}
                                placeholder='Ej. Desarrollo nuevas aplicaciones y mejoro las existentes'
                                onChange={e => updFn(idx, { raw: e.target.value, confirmed: false, aiStatus: null, aiSuggestion: null })}
                                style={{
                                    width: "100%", boxSizing: "border-box", background: "#fff",
                                    border: `1.5px solid ${C.border}`, borderRadius: 10,
                                    color: C.text, fontFamily: FF, fontSize: 15, padding: "13px 16px",
                                    outline: "none", lineHeight: 1.6, resize: "vertical",
                                    boxShadow: C.shadow,
                                }} />
                            <div style={{
                                marginTop: 4, fontSize: 12, color: C.textMuted, fontFamily: FF,
                            }}>
                                Estructura sugerida: verbo de acción + objeto de la acción + verbo de resultado + finalidad o impacto
                            </div>
                            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <button onClick={() => callAiAssist(idx)} disabled={!hasRaw || fn.aiStatus === "loading"}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 7,
                                        background: hasRaw && fn.aiStatus !== "loading" ? C.primaryDim : C.surfaceAlt,
                                        border: `1.5px solid ${hasRaw && fn.aiStatus !== "loading" ? C.primary + "40" : C.border}`,
                                        color: hasRaw && fn.aiStatus !== "loading" ? C.primary : C.textMuted,
                                        borderRadius: 10, padding: "9px 18px", fontFamily: FF, fontSize: 13,
                                        fontWeight: 600, cursor: hasRaw && fn.aiStatus !== "loading" ? "pointer" : "not-allowed",
                                        transition: "all 0.2s",
                                    }}>
                                    {fn.aiStatus === "loading"
                                        ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Analizando...</>
                                        : <><span style={{ fontSize: 14 }}>✦</span> Asistencia IA</>}
                                </button>
                                {fn.aiStatus === "error" && (
                                    <span style={{ fontSize: 13, color: C.textSecondary, fontFamily: FF }}>
                                        La ayuda automática no está disponible en este momento.
                                        <button onClick={() => callAiAssist(idx)} style={{
                                            background: "none", border: "none", color: C.primary,
                                            cursor: "pointer", fontFamily: FF, fontSize: 13, fontWeight: 600,
                                            marginLeft: 6, textDecoration: "underline",
                                        }}>Reintentar asistencia</button>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* AI suggestion box */}
                        {fn.aiSuggestion && fn.aiStatus !== "loading" && (
                            <div style={{
                                marginBottom: 16, background: fn.confirmed ? `${C.success}06` : C.primaryDim,
                                border: `1.5px solid ${fn.confirmed ? C.success + "30" : C.primary + "25"}`,
                                borderRadius: 12, padding: "16px 20px",
                            }}>
                                <div style={{
                                    fontSize: 11, color: fn.confirmed ? C.success : C.primary,
                                    fontFamily: FF, fontWeight: 700, letterSpacing: "0.03em",
                                    textTransform: "uppercase", marginBottom: 10,
                                }}>
                                    {fn.confirmed ? "✓ Función confirmada" : "✦ Redacción formal sugerida — revisa y confirma"}
                                </div>
                                <div style={{
                                    fontSize: 15, color: C.text, fontFamily: FF, lineHeight: 1.75,
                                    marginBottom: 12, fontStyle: "italic",
                                    padding: "10px 16px", background: "#fff", borderRadius: 8,
                                    border: `1px solid ${C.borderLight}`,
                                }}>
                                    &quot;{fn.aiSuggestion.desc}&quot;
                                </div>
                                {!fn.confirmed && (
                                    <button onClick={() => approveAi(idx)} style={{
                                        display: "flex", alignItems: "center", gap: 8,
                                        background: C.success, border: "none", color: "#fff",
                                        borderRadius: 10, padding: "10px 22px", fontFamily: FF,
                                        fontSize: 14, fontWeight: 600, cursor: "pointer",
                                        transition: "all 0.2s", animation: "none",
                                    }}>✓ Aplicar redacción formal</button>
                                )}
                            </div>
                        )}

                        {/* Manual desc when no AI */}
                        {!fn.aiSuggestion && (
                            <div style={{ marginBottom: 14 }}>
                                <label style={{
                                    fontSize: 13, color: C.text, fontFamily: FF, fontWeight: 600,
                                    display: "block", marginBottom: 6,
                                }}>Redacción formal</label>
                                <textarea rows={2} value={fn.desc || ""}
                                    placeholder="Verbo de acción + objeto + verbo de resultado + finalidad"
                                    onChange={e => updFn(idx, { desc: e.target.value })}
                                    style={{
                                        width: "100%", boxSizing: "border-box", background: "#fff",
                                        border: `1.5px solid ${C.border}`, borderRadius: 10,
                                        color: C.text, fontFamily: FF, fontSize: 15,
                                        padding: "13px 16px", outline: "none", lineHeight: 1.6,
                                        resize: "vertical", boxShadow: C.shadow,
                                    }} />
                            </div>
                        )}

                        {/* Factor selects — clean, no codes */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                            {[
                                { key: "freq", label: "Frecuencia", opts: FREQ_OPTS },
                                { key: "impact", label: "Impacto", opts: IMPACT_OPTS },
                                { key: "complexity", label: "Complejidad", opts: COMPLEXITY_OPTS },
                            ].map(col => (
                                <div key={col.key}>
                                    <label style={{
                                        fontSize: 12, color: C.textSecondary, fontFamily: FF,
                                        fontWeight: 600, display: "block", marginBottom: 5,
                                    }}>{col.label}</label>
                                    <select
                                        value={fn[col.key]}
                                        onChange={e => updFn(idx, { [col.key]: parseInt(e.target.value) })}
                                        style={selStyle}
                                    >
                                        {col.opts.map(o => (
                                            <option key={o.v} value={o.v}>{o.l} ({o.hint})</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        {/* Confirm button */}
                        {!isConfirmed && (fn.desc || fn.raw || "").trim() && (
                            <button onClick={() => confirmFn(idx)} style={{
                                width: "100%", background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                                border: "none", color: "#fff", borderRadius: 10,
                                padding: "12px", fontFamily: FF, fontSize: 14, fontWeight: 600,
                                cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.01em",
                            }}>
                                Confirmar función
                            </button>
                        )}
                    </div>
                );
            })}

            {funciones.length < 10 && (
                <button onClick={addFn} style={{
                    width: "100%", background: "#fff", border: `2px dashed ${C.border}`,
                    borderRadius: 14, padding: "16px", fontFamily: FF, fontSize: 14,
                    color: C.textSecondary, cursor: "pointer", transition: "all 0.2s",
                    fontWeight: 500,
                }}>
                    + Agregar función
                </button>
            )}

            {/* Summary bar */}
            <div style={{
                marginTop: 18, padding: "14px 18px", background: "#fff",
                border: `1px solid ${C.border}`, borderRadius: 12,
                display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center",
                boxShadow: C.shadow,
            }}>
                <div style={{ fontSize: 13, color: C.textSecondary, fontFamily: FF }}>
                    <strong style={{ color: C.success }}>{funciones.filter(fn => fn.confirmed).length}</strong> confirmada(s)
                    &nbsp;·&nbsp;
                    <strong style={{ color: C.text }}>{funciones.length}</strong> total
                </div>
            </div>
        </div>
    );
}

/* ═══════════════ ESSENTIAL FUNCTIONS PRIORITIZATION ═════════════════ */
interface EssentialPrioritizationProps {
    funciones: FunctionItem[];
    essentialFunctions: number[];
    onChange: (key: string, value: any) => void;
}

export function EssentialPrioritization({ funciones, essentialFunctions, onChange }: EssentialPrioritizationProps) {
    // Sort by internal score (descending) — never show the score
    const scored = funciones
        .map((fn, i) => ({ ...fn, idx: i, score: calcScore(fn) }))
        .filter(fn => (fn.desc || fn.raw || "").trim())
        .sort((a, b) => b.score - a.score);

    const minEssential = Math.max(1, Math.ceil(scored.length * 0.2));
    const isEssential = (idx: number) => essentialFunctions.includes(idx);

    const toggleEssential = (idx: number) => {
        const next = isEssential(idx)
            ? essentialFunctions.filter(i => i !== idx)
            : [...essentialFunctions, idx];
        onChange("essentialFunctions", next);
    };

    // Auto-suggest top 20% based on internal score
    const autoSuggest = () => {
        const top = scored.slice(0, minEssential).map(f => f.idx);
        onChange("essentialFunctions", top);
    };

    // Determine if a function is "recommended" (top percentile by score)
    const recommended = new Set(scored.slice(0, minEssential).map(f => f.idx));

    return (
        <div style={{ animation: "fadeIn 0.5s ease" }}>
            <div style={{
                background: C.primaryDim, border: `1px solid ${C.primary}20`,
                borderRadius: 12, padding: "18px 22px", marginBottom: 24,
            }}>
                <div style={{
                    fontSize: 14, color: C.textSecondary, fontFamily: FF, lineHeight: 1.7,
                }}>
                    Ahora revisa las funciones con mayor peso dentro del cargo. El sistema te mostrará una
                    <strong style={{ color: C.primary }}> guía automática</strong> para ayudarte a identificar las funciones
                    esenciales que orientarán las competencias y el perfil posterior.
                </div>
            </div>

            {/* Counter */}
            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 20, flexWrap: "wrap", gap: 12,
            }}>
                <div style={{ fontFamily: FF, fontSize: 15, color: C.text, fontWeight: 600 }}>
                    <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        background: essentialFunctions.length > 0 ? C.primary : C.surfaceAlt,
                        color: essentialFunctions.length > 0 ? "#fff" : C.textMuted,
                        borderRadius: 8, padding: "2px 10px", fontWeight: 700, marginRight: 6,
                    }}>{essentialFunctions.length}</span>
                    de {scored.length} funciones esenciales seleccionadas
                </div>
                <button onClick={autoSuggest} style={{
                    background: C.secondaryDim, border: `1.5px solid ${C.secondary}40`,
                    color: C.secondary, borderRadius: 10, padding: "9px 18px",
                    fontFamily: FF, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
                }}>
                    ✦ Sugerencia automática
                </button>
            </div>

            {/* Function list */}
            {scored.map(fn => {
                const essential = isEssential(fn.idx);
                const rec = recommended.has(fn.idx);
                return (
                    <div key={fn.idx} onClick={() => toggleEssential(fn.idx)} style={{
                        background: essential ? C.successDim : "#fff",
                        border: `2px solid ${essential ? C.success : C.border}`,
                        borderRadius: 14, padding: "18px 22px", marginBottom: 12,
                        cursor: "pointer", transition: "all 0.3s ease",
                        display: "flex", alignItems: "flex-start", gap: 16,
                        boxShadow: essential ? `0 2px 8px ${C.successGlow}` : C.shadow,
                    }}>
                        {/* Checkbox */}
                        <div style={{
                            width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                            background: essential ? C.success : "#fff",
                            border: `2px solid ${essential ? C.success : C.border}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.2s",
                        }}>
                            {essential && <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>✓</span>}
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                                <span style={{
                                    fontSize: 15, fontWeight: 600, color: C.text, fontFamily: FF,
                                }}>Función {fn.idx + 1}</span>
                                {rec && !essential && (
                                    <Tag color={C.secondary}>Sugerida por el sistema</Tag>
                                )}
                                {essential && <Tag color={C.success}>Esencial</Tag>}
                                {rec && <Tag color="#7C3AED">Alta relevancia</Tag>}
                            </div>
                            <div style={{
                                fontSize: 14, color: C.textSecondary, fontFamily: FF,
                                lineHeight: 1.7,
                            }}>
                                {fn.desc || fn.raw}
                            </div>
                        </div>
                    </div>
                );
            })}

            {essentialFunctions.length < minEssential && (
                <div style={{
                    marginTop: 16, padding: "12px 18px",
                    background: C.warnDim, border: `1px solid ${C.warn}30`,
                    borderRadius: 12, fontSize: 13, color: C.textSecondary,
                    fontFamily: FF, lineHeight: 1.6,
                }}>
                    💡 Te recomendamos seleccionar al menos <strong>{minEssential}</strong> función(es) esencial(es)
                    para orientar correctamente las competencias y el perfil.
                </div>
            )}
        </div>
    );
}
