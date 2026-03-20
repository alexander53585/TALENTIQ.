'use client';

import { useState, useEffect, memo } from "react";
import { C, FF } from "@/lib/tokens";

/* ═══════════════ TAG / BADGE ═════════════════ */
interface TagProps {
    children: React.ReactNode;
    color?: string;
    variant?: "default" | "filled";
}
export function Tag({ children, color, variant = "default" }: TagProps) {
    const bg = color ? `${color}12` : C.primaryDim;
    const border = color ? `${color}30` : `${C.primary}25`;
    const c = color || C.primary;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: variant === "filled" ? c : bg,
            border: `1px solid ${variant === "filled" ? c : border}`,
            color: variant === "filled" ? "#fff" : c,
            borderRadius: 20, padding: "3px 12px", fontSize: 12,
            fontFamily: FF, fontWeight: 500, lineHeight: 1.4,
        }}>{children}</span>
    );
}

/* ═══════════════ STEPPER ═════════════════ */
interface Step {
    id: number;
    label: string;
}
interface StepperProps {
    current: number;
    steps: Step[];
    subStep?: string | null;
}
export function Stepper({ current, steps, subStep }: StepperProps) {
    return (
        <div style={{ display: "flex", alignItems: "center", marginBottom: 32, gap: 0 }}>
            {steps.map((s, i) => {
                const done = current > s.id;
                const active = current === s.id;
                return (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" as any }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                            <div style={{
                                width: 38, height: 38, borderRadius: "50%",
                                background: done ? C.primary : active ? C.primaryDim : "#fff",
                                border: `2px solid ${done || active ? C.primary : C.border}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: done ? 14 : 14, fontWeight: 600,
                                color: done ? "#fff" : active ? C.primary : C.textMuted,
                                fontFamily: FF, transition: "all 0.4s ease",
                                boxShadow: active ? `0 0 0 4px ${C.primaryGlow}` : "none",
                            }}>
                                {done ? "✓" : s.id}
                            </div>
                            <span style={{
                                fontSize: 11, color: done || active ? C.primary : C.textMuted,
                                fontFamily: FF, fontWeight: active ? 600 : 500,
                                whiteSpace: "nowrap", letterSpacing: "-0.01em",
                            }}>{s.label}</span>
                            {active && subStep && (
                                <span style={{
                                    fontSize: 10, color: C.secondary, fontWeight: 500,
                                    fontFamily: FF, marginTop: -2,
                                }}>{subStep}</span>
                            )}
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{
                                flex: 1, height: 2, margin: "0 8px", marginBottom: 22,
                                background: done ? C.primary : C.borderLight,
                                borderRadius: 1, transition: "background 0.4s",
                            }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ═══════════════ FIELD / INPUT ═════════════════ */
interface FieldDef {
    key: string;
    label: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
    helper?: string;
    options?: string[];
    aiKey?: string;
}
interface FieldProps {
    field: FieldDef;
    value: string;
    onChange: (key: string, value: string) => void;
    isAI?: boolean;
}
export const Field = memo(function Field({ field, value, onChange, isAI = false }: FieldProps) {
    const [focused, setFocused] = useState(false);
    const [localVal, setLocalVal] = useState(value || "");

    useEffect(() => {
        setLocalVal(value || "");
    }, [value]);

    const handleBlur = () => {
        setFocused(false);
        if (localVal !== (value || "")) {
            onChange(field.key, localVal);
        }
    };

    const base: React.CSSProperties = {
        width: "100%", boxSizing: "border-box",
        background: isAI ? C.secondaryDim : "#fff",
        border: `1.5px solid ${focused ? C.primary : isAI ? `${C.secondary}40` : C.border}`,
        boxShadow: focused ? `0 0 0 3px ${C.primaryGlow}` : C.shadow,
        borderRadius: 10, color: C.text, fontFamily: FF, fontSize: 15,
        padding: "13px 16px", outline: "none", transition: "all 0.2s", lineHeight: 1.6,
    };
    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <label style={{
                    fontSize: 13, color: C.text, fontFamily: FF, fontWeight: 600,
                }}>
                    {field.label}{field.required && <span style={{ color: C.error, marginLeft: 2 }}> *</span>}
                </label>
                {isAI && (
                    <span style={{
                        fontSize: 10, background: C.secondaryDim,
                        border: `1px solid ${C.secondary}30`, color: C.secondary,
                        borderRadius: 12, padding: "2px 8px", fontFamily: FF, fontWeight: 600,
                    }}>✦ IA</span>
                )}
            </div>
            {field.helper && (
                <div style={{
                    fontSize: 13, color: C.textSecondary, fontFamily: FF, lineHeight: 1.6,
                    marginBottom: 8, padding: "10px 14px",
                    background: C.primaryDim, borderLeft: `3px solid ${C.primary}`,
                    borderRadius: "0 8px 8px 0",
                }}>{field.helper}</div>
            )}
            {field.type === "textarea" ? (
                <textarea rows={4} value={localVal} placeholder={field.placeholder || ""}
                    onChange={e => setLocalVal(e.target.value)}
                    onFocus={() => setFocused(true)} onBlur={handleBlur}
                    style={{ ...base, resize: "vertical", minHeight: 100 }} />
            ) : field.type === "select" ? (
                // Selects se actualizan instantáneamente porque un click es intencional sin "tipeo constante"
                <select value={value || ""} onChange={e => { setLocalVal(e.target.value); onChange(field.key, e.target.value); }}
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    style={{
                        ...base, cursor: "pointer", appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235B6B7F' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center",
                    }}>
                    <option value="">— Seleccionar —</option>
                    {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            ) : (
                <input type="text" value={localVal} placeholder={field.placeholder || ""}
                    onChange={e => setLocalVal(e.target.value)}
                    onFocus={() => setFocused(true)} onBlur={handleBlur} style={base} />
            )}
        </div>
    );
});

/* ═══════════════ SPINNER ═════════════════ */
interface SpinnerProps {
    label: string;
    sub?: string;
}
export function Spinner({ label, sub }: SpinnerProps) {
    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", minHeight: 460, gap: 28,
        }}>
            <div style={{ position: "relative", width: 80, height: 80 }}>
                <div style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    border: `3px solid ${C.borderLight}`, borderTopColor: C.primary,
                    animation: "spin 1s linear infinite",
                }} />
                <div style={{
                    position: "absolute", inset: 12, borderRadius: "50%",
                    border: `2px solid ${C.borderLight}`, borderTopColor: C.secondary,
                    animation: "spin 1.5s linear infinite reverse",
                }} />
                <div style={{
                    position: "absolute", inset: 24, borderRadius: "50%",
                    background: C.primaryDim, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 18, color: C.primary,
                }}>✦</div>
            </div>
            <div style={{ textAlign: "center" }}>
                <div style={{
                    fontFamily: FF, fontSize: 20, color: C.text,
                    marginBottom: 8, fontWeight: 600,
                }}>{label}</div>
                <div style={{
                    fontSize: 14, color: C.textSecondary, lineHeight: 1.7,
                    fontFamily: FF, maxWidth: 400,
                }}>{sub}</div>
            </div>
        </div>
    );
}

/* ═══════════════ NAV ═════════════════ */
interface NavProps {
    screen: string;
    mode: string | null;
    step: number;
    onReset: () => void;
    company?: any;
    onSignOut?: () => void;
    onToggleAdmin?: () => void;
    userEmail?: string;
}
export function Nav({ screen, mode, step, onReset, company, onSignOut, onToggleAdmin, userEmail }: NavProps) {
    const isAdmin = company?.role === "admin" || userEmail === "stevenalexanderfreire@gmail.com";
    return (
        <div style={{
            borderBottom: `1px solid ${C.border}`, background: "#fff",
            padding: "14px 32px", display: "flex", alignItems: "center",
            justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                onClick={onReset} title="Ir al inicio">
                <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, color: "#fff", fontFamily: FF, fontWeight: 700,
                    transition: "transform 0.2s",
                }}
                    onMouseOver={e => (e.currentTarget as HTMLElement).style.transform = "scale(1.08)"}
                    onMouseOut={e => (e.currentTarget as HTMLElement).style.transform = "scale(1)"}
                >T</div>
                <div>
                    <div style={{ fontFamily: FF, fontSize: 17, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>
                        Talent<span style={{ color: C.primary }}>IQ</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FF, fontWeight: 400 }}>
                        {company?.name ? company.name : "Gestión inteligente de cargos"}
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {mode && screen === "form" && (
                        <div style={{
                            background: C.primaryDim, border: `1px solid ${C.primary}25`,
                            borderRadius: 8, padding: "5px 14px",
                        }}>
                            <span style={{
                                fontSize: 12, color: C.primary, fontFamily: FF, fontWeight: 600,
                            }}>
                                {mode === "crear" ? "Nuevo cargo" : "Levantamiento"}
                            </span>
                        </div>
                    )}
                    {screen === "form" && (
                        <div style={{
                            fontSize: 13, color: C.textMuted, fontFamily: FF, fontWeight: 500,
                        }}>Paso {step} de 4</div>
                    )}
                </div>

                {/* Company auth info & Sign out */}
                {company && (
                    <div style={{ display: "flex", alignItems: "center", gap: 16, borderLeft: `1px solid ${C.borderLight}`, paddingLeft: 16 }}>
                        {isAdmin && screen !== "admin" && (
                            <button onClick={onToggleAdmin} style={{
                                background: C.primaryDim, border: `1px solid ${C.primary}30`, color: C.primary,
                                borderRadius: 8, padding: "7px 12px", fontFamily: FF, fontSize: 12, fontWeight: 700,
                                cursor: "pointer", transition: "all 0.2s"
                            }}>
                                🛡 Admin Panel
                            </button>
                        )}
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 13, color: C.text, fontWeight: 600, fontFamily: FF, display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                                {company.name}
                                {isAdmin && <span style={{ color: C.primary, fontSize: 13, marginTop: -2 }}>★</span>}
                            </div>
                            <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: FF }}>{company.email}</div>
                        </div>
                        <button onClick={onSignOut} style={{
                            background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.textSecondary,
                            borderRadius: 8, padding: "7px 12px", fontFamily: FF, fontSize: 12, fontWeight: 600,
                            cursor: "pointer", transition: "all 0.2s"
                        }}>
                            Salir
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══════════════ RESULT CARD ═════════════════ */
interface ResultCardProps {
    title: string;
    icon: string;
    children: React.ReactNode;
}
export function ResultCard({ title, icon, children }: ResultCardProps) {
    return (
        <div style={{
            background: "#fff", border: `1px solid ${C.border}`,
            borderRadius: 14, padding: "24px 28px", marginBottom: 16,
            boxShadow: C.shadow,
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: C.primaryDim, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 16, color: C.primary,
                }}>{icon}</div>
                <h3 style={{
                    margin: 0, fontFamily: FF, fontSize: 17,
                    fontWeight: 700, color: C.text,
                }}>{title}</h3>
            </div>
            {children}
        </div>
    );
}
