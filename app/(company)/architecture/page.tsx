'use client';

import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { C, FF, KEYFRAMES, STEPS, calcScore } from "@/lib/tokens";
import { Stepper, Field, Spinner, Tag, ResultCard } from "@/components/kulturh/Atoms";
import { FunctionTable, EssentialPrioritization } from "@/components/kulturh/FunctionCard";
import {
  parseAiJson, buildPredictPrompt, buildConditionsPrompt, buildFinalPrompt,
  saveDesc, loadHistorial, deleteDesc,
  fieldsCrear, fieldsLevantar, initCrear, mkInitLevantar,
} from "@/lib/prompts";
import { aiComplete } from "@/lib/ai/claude";
import { useOrganization } from "@/hooks/useOrganization";
import AiWidget from "@/components/kulturh/AiWidget";

const PDFViewer = lazy(() => import("@/components/kulturh/PDFViewer"));
const AdminPanel = lazy(() => import("@/components/kulturh/AdminPanel"));

/* ═══════════════ HISTORIAL ══════════════ */
function HistorialGallery({ onViewProfile, organizationId }: { onViewProfile: (item: any) => void; organizationId?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { loadHistorial(organizationId).then(d => { setItems(d); setLoading(false); }); }, [organizationId]);

  const handleDelete = async (key: string) => {
    setDeleting(key);
    await deleteDesc(key, organizationId);
    setItems(p => p.filter(i => i.key !== key));
    setDeleting(null);
  };

  if (loading || items.length === 0) return null;

  return (
    <div style={{ marginTop: 56 }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h3 style={{ fontFamily: FF, fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          Descriptivos generados
        </h3>
        <p style={{ fontSize: 14, color: C.textSecondary, fontFamily: FF }}>
          {items.length} descriptivo{items.length !== 1 ? "s" : ""} en tu historial
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
        {items.map(item => {
          const isOpen = expanded === item.key;
          const date = new Date(item.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
          const gc = (g: string) => (({ A: C.secondary, B: C.success, C: C.primary, D: C.warn, E: C.error } as any)[g] || C.primary);
          return (
            <div key={item.key} style={{
              background: "#fff", border: `1px solid ${isOpen ? C.primary + "40" : C.border}`,
              borderRadius: 14, overflow: "hidden", transition: "all 0.3s",
              boxShadow: isOpen ? C.shadowMd : C.shadow,
            }}>
              <div style={{ padding: "18px 18px 14px", cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : item.key)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <Tag color={item.mode === "crear" ? C.primary : "#7C3AED"}>
                    {item.mode === "crear" ? "Nuevo" : "Levantado"}
                  </Tag>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%", border: `2px solid ${gc(item.grado)}`,
                    background: `${gc(item.grado)}12`, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: FF, fontSize: 14, fontWeight: 700, color: gc(item.grado),
                  }}>{item.grado}</div>
                </div>
                <div style={{ fontFamily: FF, fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>{item.puesto}</div>
                <div style={{ fontSize: 13, color: C.textSecondary, fontFamily: FF, marginBottom: 8 }}>{item.area}</div>
                {item.banda?.minimo && <div style={{ fontSize: 13, color: C.primary, fontFamily: FF, fontWeight: 600, marginBottom: 4 }}>{item.banda.minimo} – {item.banda.maximo}</div>}
                <div style={{ fontSize: 12, color: C.textMuted, fontFamily: FF }}>{date}</div>
              </div>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 18px", background: C.surfaceAlt }}>
                  <div style={{ fontSize: 13, color: C.textSecondary, fontFamily: FF, lineHeight: 1.75, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
                    {item.resumen}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onViewProfile(item)} style={{
                      flex: 1, background: C.primary, border: "none", color: "#fff",
                      borderRadius: 10, padding: "9px", fontFamily: FF, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}>Ver descriptivo →</button>
                    <button onClick={() => handleDelete(item.key)} disabled={deleting === item.key} style={{
                      background: "#fff", border: `1px solid ${C.border}`, color: C.textMuted,
                      borderRadius: 10, padding: "9px 12px", fontFamily: FF, fontSize: 12, cursor: "pointer",
                    }}>{deleting === item.key ? "..." : "🗑"}</button>

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
function Landing({ onSelect, onViewProfile, organizationId }: { onSelect: (id: string) => void; onViewProfile: (item: any) => void; organizationId?: string }) {
  const [hov, setHov] = useState<string | null>(null);
  const cards = [
    {
      id: "crear", badge: "CARGO NUEVO", title: "Crear un cargo",
      desc: "El puesto no existe. Describe el propósito y el sistema diseñará funciones, condiciones, perfil y valoración completa.",
      bullets: ["Solo necesitas describir el propósito del cargo", "El sistema genera funciones, condiciones y perfil", "Revisas y ajustas paso a paso"],
      cta: "Diseñar cargo →", color: C.primary,
    },
    {
      id: "levantar", badge: "CARGO EXISTENTE", title: "Levantar un cargo",
      desc: "La persona ya trabaja pero sin descriptivo formal. El sistema formaliza funciones y genera el perfil completo.",
      bullets: ["Describe cada función en tus palabras", "El sistema convierte a redacción formal", "Condiciones pre-completadas automáticamente"],
      cta: "Levantar cargo →", color: "#7C3AED",
    },
  ];

  return (
    <div style={{ animation: "fadeIn 0.6s ease" }}>
      <div style={{ textAlign: "center", marginBottom: 52, paddingTop: 20 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, background: C.primaryDim,
          border: `1px solid ${C.primary}20`, borderRadius: 24, padding: "6px 18px", marginBottom: 24,
        }}>
          <span style={{ fontSize: 12, color: C.primary, fontWeight: 600, fontFamily: FF }}>
            ✦ KultuRH · Gestión inteligente de cargos
          </span>
        </div>
        <h1 style={{ fontFamily: FF, fontSize: 42, fontWeight: 700, lineHeight: 1.15, margin: "0 0 16px", color: C.text, letterSpacing: "-0.02em" }}>
          Descriptivos de puesto<br />
          <span style={{ color: C.primary }}>con inteligencia artificial</span>
        </h1>
        <p style={{ fontSize: 16, color: C.textSecondary, maxWidth: 520, margin: "0 auto", lineHeight: 1.8, fontFamily: FF }}>
          Construye descriptivos formales completos con valoración y banda salarial.
          El sistema te guía en cada paso.
        </p>
      </div>

      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontFamily: FF, fontSize: 18, color: C.textSecondary, fontWeight: 500 }}>¿Por dónde empezamos?</div>
        <div style={{ width: 40, height: 3, background: C.primary, margin: "12px auto 0", borderRadius: 2 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 780, margin: "0 auto" }}>
        {cards.map(c => (
          <div key={c.id} onClick={() => onSelect(c.id)}
            onMouseEnter={() => setHov(c.id)} onMouseLeave={() => setHov(null)}
            style={{
              background: "#fff", border: `2px solid ${hov === c.id ? c.color : C.border}`,
              borderRadius: 16, padding: "30px 26px", cursor: "pointer", transition: "all 0.3s",
              transform: hov === c.id ? "translateY(-4px)" : "translateY(0)",
              boxShadow: hov === c.id ? C.shadowLg : C.shadow,
            }}>
            <div style={{
              display: "inline-block", background: `${c.color}10`, border: `1px solid ${c.color}30`,
              borderRadius: 8, padding: "4px 12px", marginBottom: 18,
            }}>
              <span style={{ fontSize: 11, color: c.color, fontFamily: FF, fontWeight: 700, letterSpacing: "0.05em" }}>{c.badge}</span>
            </div>
            <h2 style={{ fontFamily: FF, fontSize: 22, fontWeight: 700, margin: "0 0 10px", color: C.text }}>{c.title}</h2>
            <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, margin: "0 0 20px", fontFamily: FF }}>{c.desc}</p>
            <div style={{ marginBottom: 24 }}>
              {c.bullets.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                  <span style={{ color: c.color, fontSize: 16, lineHeight: 1, flexShrink: 0 }}>›</span>
                  <span style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.7, fontFamily: FF }}>{b}</span>
                </div>
              ))}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center",
              background: hov === c.id ? c.color : "transparent",
              border: `2px solid ${c.color}`, borderRadius: 10,
              padding: "10px 20px", fontSize: 14, fontWeight: 600,
              color: hov === c.id ? "#fff" : c.color, fontFamily: FF,
              transition: "all 0.2s",
            }}>{c.cta}</div>
          </div>
        ))}
      </div>
      <HistorialGallery onViewProfile={onViewProfile} organizationId={organizationId as string | undefined} />
    </div>
  );
}

/* ═══════════════ RESULTS ════════════════ */
interface ResultsProps {
  result: any;
  form: any;
  mode: string;
  organizationId?: string;
  onReset: () => void;
  onOpenPdf?: () => void;
}
function Results({ result, form, mode, organizationId, onReset, onOpenPdf }: ResultsProps) {
  const [saved, setSaved] = useState(false);
  useEffect(() => { saveDesc(result, form, mode, organizationId).then(ok => { if (ok) setSaved(true); }); }, []);
  const gc = (g: string) => (({ A: C.secondary, B: C.success, C: C.primary, D: C.warn, E: C.error } as any)[g] || C.primary);
  const vc = result.valuacionCargo;

  return (
    <div style={{ animation: "fadeIn 0.5s ease" }}>
      <div style={{
        marginBottom: 14, padding: "12px 18px",
        background: saved ? C.successDim : C.primaryDim,
        border: `1px solid ${saved ? C.success + "30" : C.primary + "20"}`,
        borderRadius: 12, display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 14 }}>{saved ? "✓" : "⟳"}</span>
        <span style={{ fontSize: 13, color: saved ? C.success : C.textSecondary, fontFamily: FF }}>
          {saved ? "Descriptivo guardado en historial" : "Guardando..."}
        </span>
      </div>

      {/* Hero header */}
      <div style={{
        background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16,
        padding: "30px 34px", marginBottom: 18, boxShadow: C.shadow,
      }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <Tag color={mode === "crear" ? C.primary : "#7C3AED"}>{mode === "crear" ? "Cargo diseñado" : "Cargo levantado"}</Tag>
          <Tag color={C.secondary}>Descriptivo formal</Tag>
        </div>
        <h1 style={{ margin: "0 0 4px", fontFamily: FF, fontSize: 28, fontWeight: 700, color: C.text }}>{form.puesto}</h1>
        <div style={{ color: C.textSecondary, fontSize: 15, marginBottom: 24, fontFamily: FF }}>{form.area} · Reporta a: {form.reportaA}</div>
        {vc && (
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
            {[
              { v: vc.puntajeTotal, lbl: "Puntaje", clr: vc.puntajeTotal / vc.puntajeMaximo >= .75 ? C.success : vc.puntajeTotal / vc.puntajeMaximo >= .5 ? C.primary : C.error, sz: 18 },
              { v: vc.gradoCargo, lbl: "Grado", clr: gc(vc.gradoCargo), sz: 22 },
            ].map((b, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%", border: `3px solid ${b.clr}`,
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px",
                  background: `${b.clr}10`, fontFamily: FF, fontSize: b.sz, fontWeight: 700, color: b.clr,
                }}>{b.v}</div>
                <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: FF, fontWeight: 500 }}>{b.lbl}</div>
              </div>
            ))}
            <div style={{ flex: 1, minWidth: 175 }}>
              <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: FF, fontWeight: 500, marginBottom: 6 }}>Banda salarial</div>
              <div style={{ fontFamily: FF, fontSize: 18, color: C.primary, fontWeight: 700 }}>{vc.bandaSalarial?.minimo} – {vc.bandaSalarial?.maximo}</div>
              <div style={{ fontSize: 13, color: C.textSecondary, fontFamily: FF }}>Punto medio: {vc.bandaSalarial?.medio} · {vc.posicionMercado}</div>
            </div>
          </div>
        )}
      </div>

      <ResultCard title="Resumen ejecutivo" icon="📄">
        <div style={{ fontSize: 15, lineHeight: 1.85, color: C.textSecondary, fontFamily: FF }}>{result.resumenEjecutivo}</div>
        {result.misionPuesto && (
          <div style={{ marginTop: 14, padding: "14px 18px", background: C.primaryDim, borderLeft: `3px solid ${C.primary}`, borderRadius: "0 8px 8px 0" }}>
            <div style={{ fontSize: 11, color: C.primary, fontWeight: 600, marginBottom: 5, fontFamily: FF }}>MISIÓN DEL PUESTO</div>
            <div style={{ fontFamily: FF, fontSize: 15, color: C.text, lineHeight: 1.7, fontStyle: "italic" }}>&quot;{result.misionPuesto}&quot;</div>
          </div>
        )}
      </ResultCard>

      {result.responsabilidadesClave?.length > 0 && (
        <ResultCard title="Funciones principales" icon="📋">
          {result.responsabilidadesClave.map((r: any) => (
            <div key={r.numero} style={{ display: "flex", gap: 14, marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${C.borderLight}` }}>
              <div style={{
                minWidth: 30, height: 30, borderRadius: 8,
                background: r.esEsencial ? C.successDim : C.primaryDim,
                border: `1px solid ${r.esEsencial ? C.success + "40" : C.primary + "30"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FF, fontSize: 13, color: r.esEsencial ? C.success : C.primary, fontWeight: 700,
              }}>{r.numero}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: FF }}>{r.titulo}</span>
                  {r.porcentajeTiempo && <span style={{ fontSize: 12, color: C.textMuted, fontFamily: FF }}>{r.porcentajeTiempo}</span>}
                  {r.esEsencial && <Tag color={C.success}>Esencial</Tag>}
                </div>
                <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, fontFamily: FF }}>{r.descripcion}</div>
              </div>
            </div>
          ))}
        </ResultCard>
      )}

      {result.perfilIdeal && (
        <ResultCard title="Perfil del candidato ideal" icon="👤">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {[["Formación académica", "educacion"], ["Experiencia profesional", "experiencia"]].map(([lbl, k]) => (
              <div key={k}>
                <div style={{ fontSize: 11, color: C.primary, fontWeight: 600, marginBottom: 6, fontFamily: FF }}>{lbl.toUpperCase()}</div>
                <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.75, fontFamily: FF }}>{result.perfilIdeal[k]}</div>
              </div>
            ))}
          </div>
          {result.perfilIdeal.conocimientosTecnicos?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: C.primary, fontWeight: 600, marginBottom: 8, fontFamily: FF }}>CONOCIMIENTOS TÉCNICOS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{result.perfilIdeal.conocimientosTecnicos.map((k: string, i: number) => <Tag key={i}>{k}</Tag>)}</div>
            </div>
          )}
          {result.perfilIdeal.competenciasClave?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: C.primary, fontWeight: 600, marginBottom: 10, fontFamily: FF }}>COMPETENCIAS CONDUCTUALES</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                {result.perfilIdeal.competenciasClave.map((comp: any, i: number) => (
                  <div key={i} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FF }}>{comp.competencia}</span>
                      <Tag color={comp.nivel === "Alto" ? C.success : comp.nivel === "Medio" ? C.primary : C.textMuted}>{comp.nivel}</Tag>
                    </div>
                    <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.55, fontFamily: FF }}>{comp.descripcion}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ResultCard>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
        <button onClick={onReset} style={{
          background: "#fff", border: `2px solid ${C.border}`, color: C.textSecondary,
          borderRadius: 10, padding: "12px 28px", fontFamily: FF, fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>← Volver al inicio</button>
        {onOpenPdf && (
          <button onClick={onOpenPdf} style={{
            background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
            border: "none", color: "#fff",
            borderRadius: 10, padding: "12px 28px", fontFamily: FF, fontSize: 14, fontWeight: 700, cursor: "pointer",
            boxShadow: `0 4px 12px ${C.primaryGlow}`,
          }}>📄 Ver descriptivo PDF</button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ PROFILE VIEWER ═════════════════ */
function ProfileViewer({ item, onBack }: { item: any; onBack: () => void }) {
  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{
          background: "#fff", border: `1px solid ${C.border}`, color: C.textSecondary,
          borderRadius: 10, padding: "9px 18px", fontFamily: FF, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>← Volver al historial</button>
        <div style={{ fontSize: 13, color: C.textMuted, fontFamily: FF }}>
          {new Date(item.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
        </div>
      </div>
      {item.result && (
        <Results result={item.result} form={{ puesto: item.puesto, area: item.area, reportaA: item.reportaA }}
          mode={item.mode} onReset={onBack} />
      )}
    </div>
  );
}

/* ═══════════════ FUNCIONES BLOQUES (Crear cargo) ═════════════════ */
function FuncionesBloques({ funciones, onChange }: { funciones: any[]; onChange: (key: string, value: any) => void }) {
  const SCORE_THRESHOLD = 10;
  const calcFnScore = (f: any) => (f.freq * f.impact) + f.complexity;

  const E2E_LABELS = ["Planificación", "Análisis", "Diseño / Desarrollo", "Ejecución", "Supervisión", "Comunicación", "Mejora continua"];

  const updateFn = (idx: number, patch: any) => {
    const updated = funciones.map((f, i) => i !== idx ? f : { ...f, ...patch });
    onChange("funcionesEstructuradas", updated);
    onChange("responsabilidades", updated.map((f: any) => f.desc).join(" | "));
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 13, color: C.textSecondary, fontFamily: FF }}>
          Funciones generadas en orden End-to-End. Revisa, edita y confirma cada una.
        </div>
      </div>
      {funciones.map((fn, idx) => {
        const score = calcFnScore(fn);
        const isEssential = fn.esEsencial || score >= SCORE_THRESHOLD;
        const e2eLabel = E2E_LABELS[Math.min(idx, E2E_LABELS.length - 1)];
        return (
          <div key={idx} style={{
            border: `1px solid ${isEssential ? C.primary + "40" : C.border}`,
            borderRadius: 12, padding: "16px 18px", marginBottom: 12,
            background: isEssential ? C.primary + "06" : "#fff",
            position: "relative", transition: "all 0.2s",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
              <div style={{
                minWidth: 22, height: 22, borderRadius: "50%",
                background: C.surfaceAlt, border: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: C.textMuted, fontFamily: FF, flexShrink: 0,
              }}>{idx + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    color: C.textMuted, fontFamily: FF, letterSpacing: "0.5px",
                    background: C.surfaceAlt, borderRadius: 4, padding: "2px 6px",
                  }}>{e2eLabel}</span>
                  {isEssential && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: "#F59E0B",
                      fontFamily: FF, display: "flex", alignItems: "center", gap: 3,
                    }}>⭐ Esencial</span>
                  )}
                  <span style={{
                    fontSize: 10, color: C.textMuted, fontFamily: FF,
                    background: C.surfaceAlt, borderRadius: 4, padding: "2px 6px",
                  }}>Score: {score}</span>
                </div>
                <textarea
                  value={fn.desc}
                  onChange={e => updateFn(idx, { desc: e.target.value })}
                  rows={2}
                  style={{
                    width: "100%", boxSizing: "border-box", border: `1px solid ${C.borderLight}`,
                    borderRadius: 8, padding: "8px 10px", fontFamily: FF, fontSize: 13,
                    color: C.text, lineHeight: 1.6, resize: "vertical",
                    background: "transparent", outline: "none",
                  }}
                />
              </div>
            </div>
            {/* Factores */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", paddingLeft: 32 }}>
              {[
                { label: "Frecuencia", key: "freq" },
                { label: "Impacto", key: "impact" },
                { label: "Complejidad", key: "complexity" },
              ].map(({ label, key }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: C.textMuted, fontFamily: FF }}>{label}</span>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[1, 2, 3, 4, 5].map(v => (
                      <button key={v} onClick={() => updateFn(idx, { [key]: v })} style={{
                        width: 20, height: 20, borderRadius: 4, border: "none",
                        background: fn[key] >= v ? C.primary : C.surfaceAlt,
                        cursor: "pointer", transition: "background 0.15s",
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, fontFamily: FF }}>{fn[key]}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════ Humanizar tiempo ═══════ */
function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "hace unos segundos";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} días`;
}

/* ═══════ Toast de recuperación de borrador ═══════ */
function DraftRecoveryToast({ draft, onRestore, onDiscard }: { draft: any; onRestore: () => void; onDiscard: () => void }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, background: "#fff", borderRadius: 14, padding: "18px 24px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.15)", border: `1px solid ${C.primary}30`,
      display: "flex", alignItems: "center", gap: 16, maxWidth: 520, width: "90%",
      fontFamily: FF, animation: "slideUp 0.4s ease",
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: C.primaryDim, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20,
      }}>📋</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>
          Tienes un borrador sin terminar
        </div>
        <div style={{ fontSize: 12, color: C.textMuted }}>
          {draft.mode === "crear" ? "Crear cargo" : "Levantar cargo"}
          {" — "}
          <strong>{draft.formC?.puesto || draft.formL?.puesto || "Sin nombre"}</strong>
          {" · Paso "}{draft.step}/4
          {" · "}{timeAgo(draft.savedAt)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={onDiscard} style={{
          background: "transparent", border: `1px solid ${C.border}`, color: C.textMuted,
          borderRadius: 8, padding: "7px 14px", fontFamily: FF, fontSize: 12, fontWeight: 600,
          cursor: "pointer",
        }}>Descartar</button>
        <button onClick={onRestore} style={{
          background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
          border: "none", color: "#fff",
          borderRadius: 8, padding: "7px 14px", fontFamily: FF, fontSize: 12, fontWeight: 700,
          cursor: "pointer", boxShadow: `0 2px 8px ${C.primaryGlow}`,
        }}>Continuar</button>
      </div>
    </div>
  );
}

/* ═══════════════ MAIN APP ═══════════════ */
export default function ArchitecturePage() {
  const { organizationId, userId } = useOrganization();

  const [screen, setScreen] = useState("landing");
  const [mode, setMode] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [subPhase, setSubPhase] = useState<string | null>(null);
  const [formC, setFormC] = useState<any>(initCrear);
  const [formL, setFormL] = useState<any>(mkInitLevantar());
  const [aiPredictions, setAiPredictions] = useState<any>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [viewingProfile, setViewingProfile] = useState<any>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<any>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const resRef = useRef<HTMLDivElement>(null);

  const form = mode === "crear" ? formC : formL;
  const setForm = mode === "crear" ? setFormC : setFormL;
  const allFields = mode === "crear" ? fieldsCrear : fieldsLevantar;
  const grp = allFields.find(g => g.step === step);

  // ─── Draft key por organización ───────────────────────────────────────
  const DRAFT_KEY = `kulturh_draft_${organizationId || userId || "guest"}`;

  // ─── Auto-guardado (incluye aiPredictions para no perder IA) ──────────
  useEffect(() => {
    if (screen !== "form" || !mode) return;
    const draft = {
      mode, step, subPhase, formC, formL,
      aiPredictions,
      savedAt: Date.now(),
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { }
  }, [formC, formL, step, subPhase, mode, screen, aiPredictions]);

  // ─── Restaurar borrador al montar ─────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.savedAt && Date.now() - draft.savedAt < 86400000) {
        setPendingDraft(draft);
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch { }
  }, []);

  const restoreDraft = () => {
    if (!pendingDraft) return;
    const d = pendingDraft;
    setMode(d.mode);
    setStep(d.step || 1);
    setSubPhase(d.subPhase || null);
    if (d.formC) setFormC((prev: any) => ({ ...prev, ...d.formC }));
    if (d.formL) setFormL((prev: any) => ({ ...prev, ...d.formL }));
    if (d.aiPredictions) setAiPredictions(d.aiPredictions);
    setScreen("form");
    setPendingDraft(null);
  };

  const discardDraft = () => {
    setPendingDraft(null);
    try { localStorage.removeItem(DRAFT_KEY); } catch { }
  };

  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { } };


  useEffect(() => { topRef.current?.scrollIntoView({ behavior: "smooth" }); }, [step, screen, subPhase]);
  useEffect(() => { if (result) resRef.current?.scrollIntoView({ behavior: "smooth" }); }, [result]);

  const chg = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const canNext = () => {
    if (mode === "levantar" && step === 2) {
      if (subPhase === "prioritize") return formL.essentialFunctions.length > 0;
      return formL.funciones.some((fn: any) => (fn.raw || fn.desc || "").trim().length > 0);
    }
    if (!grp) return false;
    return grp.fields.filter((f: any) => f.required).every((f: any) => (form[f.key] || "").trim().length > 0);
  };

  const handleSelect = (m: string) => { setMode(m); setScreen("form"); setStep(1); setSubPhase(null); setPendingDraft(null); };
  const handleReset = () => {
    clearDraft();
    setPendingDraft(null);
    setScreen("landing"); setMode(null); setStep(1); setSubPhase(null);
    setFormC(initCrear); setFormL(mkInitLevantar());
    setAiPredictions({}); setResult(null); setError(""); setViewingProfile(null);
  };

  // ─── AI helpers — proxy via /api/ai, never calls Anthropic directly ──────
  const predictFields = async () => {
    setScreen("predicting"); setError("");
    try {
      const raw = await aiComplete({
        messages: [{ role: "user", content: buildPredictPrompt(formC) }],
        model: "claude-sonnet-4-5",
        feature: "predict_fields",
      });
      const parsed = parseAiJson(raw);
      setAiPredictions(parsed);
      const fnArray = Array.isArray(parsed.funciones) ? parsed.funciones : [];
      const fnTexto = fnArray.map((f: any) => f.desc).join(" | ");
      setFormC((f: any) => ({
        ...f, ...parsed,
        funcionesEstructuradas: fnArray,
        responsabilidades: fnTexto || parsed.responsabilidades || "",
      }));
    } catch (err: any) {
      console.error("[Architecture] predictFields:", err.message);
      setError(err.message || "No pudimos conectar con la IA. Puedes continuar manualmente.");
    } finally {
      setScreen("form"); setStep(2);
    }
  };

  const predictConditions = async () => {
    setScreen("predicting"); setError("");
    try {
      const raw = await aiComplete({
        messages: [{ role: "user", content: buildConditionsPrompt(formL) }],
        model: "claude-sonnet-4-5",
        feature: "predict_conditions",
      });
      const parsed = parseAiJson(raw);
      setFormL((f: any) => ({
        ...f,
        modalidad: f.modalidad || parsed.modalidad || "",
        horario: f.horario || parsed.horario || "",
        viajes: f.viajes || parsed.viajes || "",
        presupuesto: f.presupuesto || parsed.presupuesto || "",
        personas: f.personas || parsed.personas || "",
        impactoOrg: f.impactoOrg || parsed.impactoOrg || "",
      }));
      setAiPredictions((p: any) => ({ ...p, ...parsed }));
    } catch (err: any) {
      console.error("[Architecture] predictConditions:", err.message);
      setError(err.message || "No pudimos conectar con la IA. Puedes continuar manualmente.");
    } finally {
      setScreen("form"); setStep(3); setSubPhase(null);
    }
  };

  const generate = async () => {
    setScreen("generating"); setError("");
    try {
      const fnData = mode === "levantar"
        ? formL.funciones
          .filter((fn: any) => (fn.desc || fn.raw || "").trim())
          .map((fn: any, i: number) => ({
            ...fn, desc: fn.desc || fn.raw,
            score: calcScore(fn),
            isEssential: formL.essentialFunctions.includes(i),
          }))
        : null;

      const raw = await aiComplete({
        messages: [{ role: "user", content: buildFinalPrompt(form, mode!, fnData) }],
        model: "claude-sonnet-4-5",
        feature: "generate_description",
      });
      setResult(parseAiJson(raw));
      setScreen("result");
      clearDraft();
    } catch (err: any) {
      console.error("[Architecture] generate:", err.message);
      setError(err.message || "No pudimos conectar con la IA. Puedes continuar manualmente.");
      setScreen("form");
    }
  };

  const handleNext = () => {
    if (mode === "crear" && step === 1) {
      if (Object.keys(aiPredictions).length === 0) {
        predictFields();
      } else {
        setStep(2);
      }
      return;
    }
    if (mode === "levantar" && step === 2 && subPhase !== "prioritize") {
      setSubPhase("prioritize"); return;
    }
    if (mode === "levantar" && step === 2 && subPhase === "prioritize") {
      predictConditions(); return;
    }
    if (step < 4) { setStep(s => s + 1); setSubPhase(null); } else { generate(); }
  };

  const handlePrev = () => {
    if (mode === "levantar" && step === 2 && subPhase === "prioritize") {
      setSubPhase(null); return;
    }
    if (step === 1) { handleReset(); } else { setStep(s => s - 1); setSubPhase(null); }
  };

  if (screen === "profile" && viewingProfile) {
    return (
      <div style={{ fontFamily: FF }} ref={topRef}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px" }}>
          <ProfileViewer item={viewingProfile} onBack={handleReset} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FF }} ref={topRef}>
      <style>{KEYFRAMES}</style>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px" }}>
        {screen === "admin" && (
          <Suspense fallback={<Spinner label="Cargando panel" sub="Preparando módulo seguro..." />}>
            <AdminPanel onBack={handleReset} />
          </Suspense>
        )}

        {screen === "landing" && <Landing onSelect={handleSelect} onViewProfile={(item: any) => { setViewingProfile(item); setScreen("profile"); }} organizationId={organizationId ?? undefined} />}
        {screen === "landing" && pendingDraft && (
          <DraftRecoveryToast draft={pendingDraft} onRestore={restoreDraft} onDiscard={discardDraft} />
        )}
        {screen === "predicting" && <Spinner label="Analizando con IA" sub={`Procesando información del cargo "${(mode === "crear" ? formC : formL).puesto || "..."}"...`} />}
        {screen === "generating" && <Spinner label="Generando descriptivo formal" sub="Estructurando el descriptivo completo con valoración y banda salarial..." />}

        {screen === "form" && grp && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <Stepper current={step} steps={STEPS} subStep={
              mode === "levantar" && step === 2
                ? (subPhase === "prioritize" ? "Priorización" : "Captura")
                : null
            } />

            {/* AI banner */}
            {Object.keys(aiPredictions).length > 0 && step > 1 && (
              <div style={{
                background: C.secondaryDim, border: `1px solid ${C.secondary}20`,
                borderRadius: 12, padding: "13px 18px", marginBottom: 20,
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: `${C.secondary}15`,
                    border: `1px solid ${C.secondary}30`, display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: 13, color: C.secondary,
                  }}>✦</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.secondary, marginBottom: 2, fontFamily: FF }}>Contenido pre-completado por IA</div>
                    <div style={{ fontSize: 13, color: C.textSecondary, fontFamily: FF }}>
                      Los campos <strong style={{ color: C.secondary }}>✦ IA</strong> fueron generados automáticamente. Edita lo que necesites.
                    </div>
                  </div>
                </div>
                {mode === "crear" && step === 2 && (
                  <button
                    onClick={() => { setAiPredictions({}); predictFields(); }}
                    style={{
                      background: "none", border: `1px solid ${C.secondary}40`,
                      borderRadius: 8, padding: "6px 14px", fontFamily: FF,
                      fontSize: 12, fontWeight: 600, color: C.secondary,
                      cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                    }}>
                    🔄 Re-analizar
                  </button>
                )}
              </div>
            )}

            <div style={{
              background: "#fff", border: `1px solid ${C.border}`,
              borderRadius: 16, padding: "30px 34px", boxShadow: C.shadow,
            }}>
              <div style={{ marginBottom: 26 }}>
                <h2 style={{ margin: "0 0 6px", fontFamily: FF, fontSize: 22, fontWeight: 700, color: C.text }}>
                  {subPhase === "prioritize" ? "Selecciona las funciones esenciales" : grp.title}
                </h2>
                <div style={{ fontSize: 14, color: C.textSecondary, fontFamily: FF, lineHeight: 1.7 }}>
                  {subPhase === "prioritize" ? null : grp.subtitle}
                </div>
              </div>

              {mode === "levantar" && step === 2 ? (
                subPhase === "prioritize" ? (
                  <EssentialPrioritization
                    funciones={formL.funciones}
                    essentialFunctions={formL.essentialFunctions}
                    onChange={(k, v) => setFormL((f: any) => ({ ...f, [k]: v }))}
                  />
                ) : (
                  <FunctionTable
                    funciones={formL.funciones}
                    puesto={formL.puesto} area={formL.area}
                    onChange={(k, v) => setFormL((f: any) => ({ ...f, [k]: v }))}
                  />
                )
              ) : mode === "crear" && step === 2 && Array.isArray(formC.funcionesEstructuradas) && formC.funcionesEstructuradas.length > 0 ? (
                <FuncionesBloques
                  funciones={formC.funcionesEstructuradas}
                  onChange={(k, v) => setFormC((f: any) => ({ ...f, [k]: v }))}
                />
              ) : (
                grp.fields.map((field: any) => {
                  const isAI = grp.aiStep && !!field.aiKey && Object.keys(aiPredictions).length > 0;
                  return <Field key={field.key} field={field} value={form[field.key]} onChange={chg} isAI={isAI} />;
                })
              )}

              {error && (
                <div style={{
                  color: C.error, fontSize: 14, marginBottom: 14, padding: "14px 18px",
                  background: C.errorDim, borderRadius: 12, border: `1px solid ${C.error}25`,
                  lineHeight: 1.6, fontFamily: FF,
                }}>
                  {error}
                  <button onClick={() => { setError(""); if (mode === "crear" && step === 1) predictFields(); }}
                    style={{
                      display: "block", marginTop: 8, background: "none", border: "none",
                      color: C.primary, fontFamily: FF, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", textDecoration: "underline",
                    }}>Reintentar asistencia</button>
                </div>
              )}

              <div style={{
                display: "flex", justifyContent: "space-between", marginTop: 28,
                paddingTop: 22, borderTop: `1px solid ${C.borderLight}`,
              }}>
                <button onClick={handlePrev} style={{
                  background: "#fff", border: `2px solid ${C.border}`, color: C.textSecondary,
                  borderRadius: 10, padding: "11px 22px", fontFamily: FF, fontSize: 14,
                  fontWeight: 600, cursor: "pointer",
                }}>
                  ← {step === 1 ? "Volver" : subPhase === "prioritize" ? "Volver a funciones" : "Anterior"}
                </button>
                <button onClick={handleNext} disabled={!canNext()} style={{
                  background: canNext() ? `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})` : C.surfaceAlt,
                  border: "none", color: canNext() ? "#fff" : C.textMuted,
                  borderRadius: 10, padding: "11px 28px", fontFamily: FF, fontSize: 14,
                  fontWeight: 700, cursor: canNext() ? "pointer" : "not-allowed",
                  transition: "all 0.2s", boxShadow: canNext() ? `0 4px 12px ${C.primaryGlow}` : "none",
                }}>
                  {mode === "crear" && step === 1
                    ? (Object.keys(aiPredictions).length > 0 ? "Continuar →" : "✦ Analizar con IA →")
                    : step === 2 && mode === "levantar" && subPhase !== "prioritize" ? "Priorizar funciones →"
                      : step === 2 && mode === "levantar" && subPhase === "prioritize" ? "✦ Continuar con condiciones →"
                        : step < 4 ? "Siguiente →" : "✦ Generar descriptivo"}
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === "result" && result && (
          <div ref={resRef}>
            <Results result={result} form={form} mode={mode!} organizationId={organizationId ?? undefined} onReset={handleReset}
              onOpenPdf={() => setShowPdf(true)} />
          </div>
        )}
      </div>

      {/* PDF Viewer Overlay */}
      {showPdf && result && (
        <Suspense fallback={<Spinner label="Cargando motor PDF" sub="Preparando visualización de alta calidad..." />}>
          <PDFViewer
            result={result}
            form={form}
            mode={mode!}
            onClose={() => setShowPdf(false)}
          />
        </Suspense>
      )}

      {/* AI Assistant Widget */}
      <AiWidget context={{ screen, mode, step, subPhase, formC, formL }} />
    </div>
  );
}
