/* ═══════════════ PDF VIEWER — KultuRH ═══════════════
   Visor embebido con toggles de secciones.
   Estética: consistente con el design system.
   ══════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback } from "react";
import { C, FF } from "./tokens";
import { generatePdfBlob, PDF_SECTIONS } from "./ProfilePDF";

export default function PDFViewer({ result, form, mode, company, onClose }) {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState([]); // empty = all
    const [error, setError] = useState(null);

    const buildPdf = useCallback(async (selectedSections) => {
        setLoading(true);
        setError(null);
        try {
            const url = await generatePdfBlob({ result, form, mode, company, sections: selectedSections });
            setBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
        } catch (err) {
            console.error("[PDFViewer]", err);
            setError("No se pudo generar el PDF. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    }, [result, form, mode, company]);

    useEffect(() => { buildPdf(sections); }, []);

    useEffect(() => {
        return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
    }, [blobUrl]);

    const toggleSection = (key) => {
        setSections(prev => {
            const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
            return next;
        });
    };

    const applyFilter = () => { buildPdf(sections); };
    const resetFilter = () => { setSections([]); buildPdf([]); };

    const allSelected = sections.length === 0;

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(15,23,42,0.8)", backdropFilter: "blur(8px)",
            display: "flex", flexDirection: "column",
            animation: "fadeIn 0.3s ease",
        }}
            onContextMenu={e => e.preventDefault()}
        >
            {/* ─── Toolbar ─── */}
            <div style={{
                background: "#1E293B", padding: "10px 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                flexShrink: 0,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#FFF", fontFamily: FF }}>
                        📄 Descriptivo de Cargo
                    </div>
                    <div style={{
                        fontSize: 11, color: "#94A3B8", fontFamily: FF,
                        padding: "2px 8px", background: "rgba(255,255,255,0.06)", borderRadius: 4,
                    }}>
                        {form?.puesto || "Sin título"} — {form?.area || ""}
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={onClose} style={{
                        background: "rgba(255,255,255,0.1)", border: "none", color: "#FFF",
                        borderRadius: 8, padding: "8px 18px", fontFamily: FF, fontSize: 13,
                        fontWeight: 600, cursor: "pointer", transition: "background 0.15s",
                    }}>✕ Cerrar</button>
                </div>
            </div>

            {/* ─── Content ─── */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

                {/* Sidebar - Section toggles */}
                <div style={{
                    width: 240, background: "#1E293B", padding: "16px 12px",
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                    overflowY: "auto", flexShrink: 0,
                }}>
                    <div style={{
                        fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase",
                        letterSpacing: "0.8px", marginBottom: 10, fontFamily: FF, padding: "0 6px",
                    }}>Secciones</div>

                    {/* All toggle */}
                    <button onClick={resetFilter} style={{
                        width: "100%", textAlign: "left", background: allSelected ? "rgba(51,102,255,0.15)" : "transparent",
                        border: allSelected ? "1px solid rgba(51,102,255,0.3)" : "1px solid transparent",
                        borderRadius: 6, padding: "7px 10px", marginBottom: 4,
                        fontFamily: FF, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        color: allSelected ? "#93B4FF" : "#94A3B8",
                        transition: "all 0.15s",
                    }}>
                        📑 Formato Completo
                    </button>

                    {PDF_SECTIONS.map(sec => {
                        const active = sections.includes(sec.key);
                        return (
                            <button key={sec.key} onClick={() => toggleSection(sec.key)} style={{
                                width: "100%", textAlign: "left",
                                background: active ? "rgba(51,102,255,0.15)" : "transparent",
                                border: active ? "1px solid rgba(51,102,255,0.3)" : "1px solid transparent",
                                borderRadius: 6, padding: "7px 10px", marginBottom: 3,
                                fontFamily: FF, fontSize: 12, cursor: "pointer",
                                color: active ? "#93B4FF" : "#94A3B8",
                                fontWeight: active ? 600 : 400,
                                transition: "all 0.15s",
                            }}>
                                {sec.icon} {sec.label}
                            </button>
                        );
                    })}

                    {sections.length > 0 && (
                        <button onClick={applyFilter} style={{
                            width: "100%", marginTop: 12,
                            background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                            border: "none", color: "#FFF", borderRadius: 8,
                            padding: "10px 14px", fontFamily: FF, fontSize: 13,
                            fontWeight: 700, cursor: "pointer",
                            boxShadow: `0 4px 12px ${C.primaryGlow}`,
                        }}>
                            Aplicar filtro ({sections.length})
                        </button>
                    )}
                </div>

                {/* PDF iframe */}
                <div style={{ flex: 1, position: "relative", background: "#0F172A" }}>
                    {loading ? (
                        <div style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            height: "100%", flexDirection: "column", gap: 12,
                        }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: "50%",
                                border: "3px solid rgba(255,255,255,0.1)", borderTopColor: C.primary,
                                animation: "spin 1s linear infinite",
                            }} />
                            <div style={{ fontSize: 13, color: "#94A3B8", fontFamily: FF }}>Generando PDF...</div>
                        </div>
                    ) : error ? (
                        <div style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            height: "100%", flexDirection: "column", gap: 12,
                        }}>
                            <div style={{ fontSize: 32 }}>⚠️</div>
                            <div style={{ fontSize: 14, color: "#FCA5A5", fontFamily: FF }}>{error}</div>
                            <button onClick={() => buildPdf(sections)} style={{
                                background: C.primary, border: "none", color: "#FFF",
                                borderRadius: 8, padding: "8px 20px", fontFamily: FF, fontSize: 13,
                                fontWeight: 600, cursor: "pointer",
                            }}>Reintentar</button>
                        </div>
                    ) : blobUrl ? (
                        <iframe
                            src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                            title="PDF Viewer"
                            style={{
                                width: "100%", height: "100%", border: "none",
                                pointerEvents: "auto",
                            }}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}
