'use client';

import { useState, useRef, useEffect } from "react";
import { C, FF } from "@/lib/tokens";
import Mascot from "@/components/kulturh/Mascot";

interface AiWidgetProps {
    context: {
        screen: string;
        mode: string | null;
        step: number;
        subPhase?: string | null;
        formC?: any;
        formL?: any;
    };
}

export default function AiWidget({ context }: AiWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: "assistant", content: "¡Hola! Soy KultuRH, tu criatura asistente. ¿En qué te ayudo hoy?" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [mascotState, setMascotState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const speakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Derivar estados inmediatos
    useEffect(() => {
        if (loading) {
            setMascotState("thinking");
        } else if (input.trim().length > 0) {
            setMascotState("listening");
        } else if (mascotState !== "speaking") {
            setMascotState("idle");
        }
    }, [loading, input]);

    // Auto-scroll al fondo de los mensajes
    useEffect(() => {
        if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen, loading]);

    // Foco en el input al abrir
    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus();
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const newMsg = { role: "user", content: input };
        setMessages(p => [...p, newMsg]);
        setInput("");
        setLoading(true);

        try {
            // ─── Construcción de Contexto en Tiempo Real ───
            let sys = `Eres el asistente experto en Recursos Humanos de KultuRH. Tu objetivo es guiar de forma clara, amable y profesional al usuario en la creación de descriptivos y perfiles de puesto. Responde brevemente (máx 2-3 párrafos) usando lenguaje natural. No des formato muy largo.`;

            if (context.screen === "form") {
                sys += `\n\nCONTEXTO ACTUAL: El usuario está usando la herramienta en modo "${context.mode}" en el paso ${context.step}.`;
                const form = context.mode === "crear" ? context.formC : context.formL;
                if (form?.puesto) sys += ` El título del cargo en curso es: "${form.puesto}".`;
                if (form?.area) sys += ` Pertenece al área de: "${form.area}".`;
                if (form?.mision) sys += ` Su misión es: "${form.mision}".`;
            } else if (context.screen === "result") {
                sys += `\n\nCONTEXTO ACTUAL: El usuario acaba de generar el resultado final de su descriptivo de puesto, incluyendo la valoración y los perfiles.`;
            } else if (context.screen === "landing") {
                sys += `\n\nCONTEXTO ACTUAL: El usuario está en la pantalla principal ("Landing") explorando el historial de cargos o decidiendo si "Crear un cargo nuevo" o "Levantar un cargo existente".`;
            }

            let history = messages.map(m => ({ role: m.role, content: m.content })).concat(newMsg);

            // Retenemos los últimos 5 para contexto rápido
            let finalMessages = history.slice(-5);

            // Anthropic requiere que el primer mensaje sea "user"
            if (finalMessages.length > 0 && finalMessages[0].role === "assistant") {
                finalMessages = finalMessages.slice(1);
            }

            const res = await fetch("/api/anthropic", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    system: sys,
                    messages: finalMessages
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                console.error("API Error Data:", data);
                throw new Error(data.error?.message || `Error ${res.status}: ${data.error || "Error en la IA"}`);
            }
            const text = data.content?.[0]?.text || "Lo siento, hubo un problema respondiendo.";

            setMessages(p => [...p, { role: "assistant", content: text }]);

            // Simular que habla durante un tiempo proporcional al texto
            setMascotState("speaking");
            if (speakTimer.current) clearTimeout(speakTimer.current);
            speakTimer.current = setTimeout(() => {
                setMascotState(inputRef.current?.value ? "listening" : "idle");
            }, Math.min(3000, text.length * 40));

        } catch (err: any) {
            console.error(err);
            const errorMsg = err.message === "Error en la API"
                ? "Hubo un error en la respuesta de la IA (400/500). Verifica los límites de tu plan."
                : `Error de conexión: ${err.message || "desconocido"}. Revisa tu conexión a internet o la API Key.`;

            setMessages(p => [...p, { role: "assistant", content: errorMsg }]);
            setMascotState("idle");
        }
        setLoading(false);
    };

    return (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, fontFamily: FF, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <style>
                {`
                .mascot-avatar {
                    transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
                }
                .mascot-avatar:hover {
                    transform: scale(1.08) !important;
                    filter: drop-shadow(0 0 25px rgba(255,255,255,0.9)) !important;
                }
                `}
            </style>

            {/* Ventana del Asistente */}
            {isOpen && (
                <div style={{
                    width: 360, height: 500, background: "#fff", border: `1px solid ${C.border}`,
                    borderRadius: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.15)", marginBottom: 16,
                    display: "flex", flexDirection: "column", overflow: "hidden",
                    animation: "fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                    transformOrigin: "bottom right"
                }}>
                    {/* Header */}
                    <div style={{
                        background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                        padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                        color: "#fff", position: "relative"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: "50%", background: "#fff",
                                border: "2px solid rgba(255,255,255,0.2)", overflow: "hidden", display: "flex",
                                alignItems: "center", justifyContent: "center", transform: 'scale(1.2)'
                            }}>
                                <Mascot state={mascotState} size={40} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1 }}>RAY</div>
                                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                                    {mascotState === "idle" ? "En línea" : mascotState === "listening" ? "Escuchando activo..." : mascotState === "thinking" ? "Procesando..." : "Respondiendo..."}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={{
                            background: "transparent", border: "none", color: "#fff", cursor: "pointer",
                            fontSize: 22, opacity: 0.8, padding: 0, display: "flex", alignItems: "center"
                        }}>
                            ×
                        </button>
                    </div>

                    {/* Messages Body */}
                    <div style={{
                        flex: 1, padding: "20px 16px", overflowY: "auto", background: C.bg, display: "flex", flexDirection: "column", gap: 14
                    }}>
                        {messages.map((m, i) => (
                            <div key={i} style={{
                                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                                background: m.role === "user" ? C.primary : "#fff",
                                color: m.role === "user" ? "#fff" : C.text,
                                padding: "12px 16px", borderRadius: 12,
                                border: m.role === "user" ? "none" : `1px solid ${C.border}`,
                                maxWidth: "88%", fontSize: 13.5, lineHeight: 1.6,
                                borderBottomRightRadius: m.role === "user" ? 4 : 12,
                                borderBottomLeftRadius: m.role === "user" ? 12 : 4,
                                boxShadow: "0 2px 5px rgba(0,0,0,0.03)"
                            }}>
                                {m.content}
                            </div>
                        ))}
                        {loading && (
                            <div style={{
                                alignSelf: "flex-start", background: "#fff", padding: "12px 16px",
                                borderRadius: 12, border: `1px solid ${C.border}`,
                                fontSize: 13, color: C.textSecondary, fontStyle: "italic",
                                borderBottomLeftRadius: 4, boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
                                display: "flex", gap: 6, alignItems: "center"
                            }}>
                                <span style={{ width: 6, height: 6, background: C.primary, borderRadius: "50%", animation: "pulse 1s infinite" }}></span>
                                <span style={{ width: 6, height: 6, background: C.primaryLight, borderRadius: "50%", animation: "pulse 1s infinite 0.2s" }}></span>
                                <span style={{ width: 6, height: 6, background: C.border, borderRadius: "50%", animation: "pulse 1s infinite 0.4s" }}></span>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input Footer */}
                    <div style={{
                        padding: "16px", borderTop: `1px solid ${C.border}`, background: "#fff",
                        display: "flex", alignItems: "center", gap: 10
                    }}>
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
                            placeholder="Escribe aquí tu pregunta..."
                            style={{
                                flex: 1, border: "none", background: C.bg, padding: "12px 16px",
                                borderRadius: 10, outline: "none", fontFamily: FF, fontSize: 14,
                                color: C.text
                            }}
                        />
                        <button onClick={handleSend} disabled={!input.trim() || loading} style={{
                            background: input.trim() && !loading ? C.primary : C.primaryDim,
                            color: input.trim() && !loading ? "#fff" : C.primary,
                            border: "none", borderRadius: 10, padding: "12px 16px",
                            cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                            fontFamily: FF, fontSize: 14, fontWeight: 700, transition: "0.2s"
                        }}>
                            ➤
                        </button>
                    </div>
                </div>
            )}

            {/* Bubble Launcher / Mascot 3D */}
            {!isOpen ? (
                <div
                    onClick={() => setIsOpen(true)}
                    className="mascot-avatar"
                    style={{
                        width: 86, height: 86, borderRadius: "50%",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        backgroundColor: "#fff", border: "2px solid rgba(0,0,0,0.05)",
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                    }}
                >
                    <Mascot state={mascotState} size={80} />
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(false)}
                    style={{
                        width: 56, height: 56, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                        border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: `0 4px 12px ${C.primary}50`,
                        transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                    }}
                >
                    <div style={{ color: "#fff", fontSize: 26 }}>↓</div>
                </button>
            )}
        </div>
    );
}
