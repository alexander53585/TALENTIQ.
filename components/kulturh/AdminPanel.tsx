'use client';

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { C, FF } from "@/lib/tokens";

// Email del superadministrador del sistema
const SUPER_ADMIN_EMAIL = "stevenalexanderfreire@gmail.com";

interface AdminPanelProps {
    onBack: () => void;
    company?: any;
    user?: any;
}

export default function AdminPanel({ onBack, company, user }: AdminPanelProps) {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [promoting, setPromoting] = useState<string | null>(null);
    const [msg, setMsg] = useState("");

    const isAdmin = company?.role === "admin" || user?.email === SUPER_ADMIN_EMAIL;

    useEffect(() => {
        if (!isAdmin) { setLoading(false); return; }
        async function fetchCompanies() {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .order('created_at', { ascending: false });
            if (data) setCompanies(data);
            if (error) console.error("Admin Fetch Error:", error);
            setLoading(false);
        }
        fetchCompanies();
    }, [isAdmin]);

    // Promover un rol (solo superadmin puede hacerlo)
    const toggleRole = async (comp: any) => {
        setPromoting(comp.id);
        const newRole = comp.role === "admin" ? "user" : "admin";
        const supabase = createClient();
        const { error } = await supabase
            .from('companies')
            .update({ role: newRole })
            .eq('id', comp.id);
        if (error) {
            setMsg(`Error: ${error.message}. Ve a Supabase Dashboard > SQL Editor y ejecuta: UPDATE companies SET role='admin' WHERE id='${comp.id}';`);
        } else {
            setCompanies(prev => prev.map(c => c.id === comp.id ? { ...c, role: newRole } : c));
            setMsg(`✓ ${comp.name} ahora es ${newRole}`);
        }
        setPromoting(null);
        setTimeout(() => setMsg(""), 4000);
    };

    if (!isAdmin) {
        return (
            <div style={{ animation: "fadeIn 0.5s ease", padding: "60px 0", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                <h2 style={{ fontFamily: FF, color: C.text, marginBottom: 8 }}>Acceso restringido</h2>
                <p style={{ color: C.textSecondary, fontFamily: FF, marginBottom: 24 }}>
                    Solo los administradores del sistema pueden acceder a este panel.
                </p>
                <button onClick={onBack} style={{
                    background: C.primary, border: "none", color: "#fff",
                    borderRadius: 10, padding: "12px 28px", fontFamily: FF, fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}>← Volver</button>
            </div>
        );
    }

    return (
        <div style={{ animation: "fadeIn 0.5s ease", padding: "10px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
                <div>
                    <h2 style={{ margin: "0 0 4px", fontFamily: FF, fontSize: 26, fontWeight: 700, color: C.text }}>Centro de Control</h2>
                    <p style={{ margin: 0, fontSize: 14, color: C.textSecondary, fontFamily: FF }}>
                        Administrador: <strong>{user?.email}</strong> · Empresas registradas: {companies.length}
                    </p>
                </div>
                <button onClick={onBack} style={{
                    background: "#fff", border: `2px solid ${C.border}`, color: C.textSecondary,
                    borderRadius: 10, padding: "11px 22px", fontFamily: FF, fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}>← Volver a la App</button>
            </div>

            {msg && (
                <div style={{
                    padding: "11px 18px", borderRadius: 10, marginBottom: 16,
                    background: msg.startsWith("Error") ? C.errorDim : C.successDim,
                    border: `1px solid ${msg.startsWith("Error") ? C.error + "30" : C.success + "30"}`,
                    color: msg.startsWith("Error") ? C.error : C.success,
                    fontSize: 13, fontFamily: FF,
                }}>{msg}</div>
            )}

            {loading ? (
                <div style={{ textAlign: "center", padding: 60, fontFamily: FF, color: C.textSecondary }}>Cargando...</div>
            ) : (
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", boxShadow: C.shadowMd }}>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF, textAlign: "left", minWidth: 640 }}>
                            <thead>
                                <tr style={{ background: C.surfaceAlt, borderBottom: `2px solid ${C.border}` }}>
                                    {["Empresa", "Sector", "Correo", "Acceso", "Acción"].map(h => (
                                        <th key={h} style={{ padding: "16px 20px", fontSize: 11, color: C.textSecondary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {companies.map((c) => {
                                    const isAdminRow = c.role === "admin";
                                    const isSelf = c.id === company?.id;
                                    return (
                                        <tr key={c.id}
                                            style={{ borderBottom: `1px solid ${C.borderLight}`, transition: "background 0.2s" }}
                                            onMouseOver={e => (e.currentTarget as HTMLElement).style.background = C.surfaceAlt}
                                            onMouseOut={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                                            <td style={{ padding: "16px 20px" }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{c.name}{isSelf && <span style={{ fontSize: 10, color: C.primary, marginLeft: 6, fontWeight: 700 }}>TÚ</span>}</div>
                                                <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace", marginTop: 2 }}>{c.id}</div>
                                            </td>
                                            <td style={{ padding: "16px 20px", fontSize: 13, color: C.textSecondary }}>{c.sector}</td>
                                            <td style={{ padding: "16px 20px", fontSize: 13, color: C.textSecondary }}>{c.email}</td>
                                            <td style={{ padding: "16px 20px" }}>
                                                <span style={{
                                                    background: isAdminRow ? C.primaryDim : C.surfaceAlt,
                                                    color: isAdminRow ? C.primary : C.textSecondary,
                                                    padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                                                    border: `1px solid ${isAdminRow ? C.primary + "30" : C.border}`
                                                }}>
                                                    {isAdminRow ? "★ Admin" : "Usuario"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "16px 20px" }}>
                                                <button
                                                    onClick={() => toggleRole(c)}
                                                    disabled={promoting === c.id}
                                                    style={{
                                                        background: isAdminRow ? C.errorDim : C.primaryDim,
                                                        border: `1px solid ${isAdminRow ? C.error + "30" : C.primary + "30"}`,
                                                        color: isAdminRow ? C.error : C.primary,
                                                        borderRadius: 8, padding: "6px 14px",
                                                        fontFamily: FF, fontSize: 12, fontWeight: 600, cursor: "pointer",
                                                    }}>
                                                    {promoting === c.id ? "..." : isAdminRow ? "Quitar admin" : "Hacer admin"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {companies.length === 0 && (
                                    <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 14 }}>No hay empresas registradas</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div style={{ marginTop: 16, padding: "14px 18px", background: C.surfaceAlt, borderRadius: 10, fontSize: 12, color: C.textMuted, fontFamily: FF }}>
                <strong>Nota:</strong> Si el toggle de rol falla por permisos RLS, ve a <strong>Supabase Dashboard › SQL Editor</strong> y ejecuta manualmente:<br />
                <code style={{ fontFamily: "monospace", color: C.primary }}>{`UPDATE companies SET role = 'admin' WHERE email = '${SUPER_ADMIN_EMAIL}';`}</code>
            </div>
        </div>
    );
}
