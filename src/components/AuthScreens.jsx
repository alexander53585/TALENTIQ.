import { useState } from "react";
import { C, FF, KEYFRAMES } from "./tokens";
import ParticleBackground from "./ParticleBackground";

/* ═══════════════ AUTH SCREENS — Premium Light ═══════════════ */

function AuthInput({ label, type, value, onChange, placeholder, required, icon }) {
    const [focused, setFocused] = useState(false);
    return (
        <div style={{ marginBottom: 18 }}>
            <label style={{
                fontSize: 13, color: C.text, fontFamily: FF, fontWeight: 600,
                display: "block", marginBottom: 6,
            }}>
                {label}{required && <span style={{ color: C.error, marginLeft: 2 }}> *</span>}
            </label>
            <div style={{ position: "relative" }}>
                {icon && (
                    <span style={{
                        position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                        fontSize: 16, color: focused ? C.primary : C.textMuted, transition: "color 0.2s",
                    }}>{icon}</span>
                )}
                <input
                    type={type || "text"} value={value} onChange={e => onChange(e.target.value)}
                    placeholder={placeholder} required={required}
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    style={{
                        width: "100%", boxSizing: "border-box",
                        background: "#fff",
                        border: `1.5px solid ${focused ? C.primary : C.border} `,
                        boxShadow: focused ? `0 0 0 3px ${C.primaryGlow} ` : C.shadow,
                        borderRadius: 10, color: C.text, fontFamily: FF, fontSize: 15,
                        padding: icon ? "13px 16px 13px 42px" : "13px 16px",
                        outline: "none", transition: "all 0.2s", lineHeight: 1.5,
                    }}
                />
            </div>
        </div>
    );
}

function AuthButton({ children, onClick, loading, variant = "primary" }) {
    const isPrimary = variant === "primary";
    return (
        <button onClick={onClick} disabled={loading}
            style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                background: isPrimary
                    ? (loading ? C.surfaceAlt : `linear - gradient(135deg, ${C.primary}, ${C.primaryLight})`)
                    : "#fff",
                border: isPrimary ? "none" : `1px solid ${C.border} `,
                color: isPrimary ? (loading ? C.textMuted : "#fff") : C.text,
                borderRadius: 10, padding: "12px", fontFamily: FF, fontSize: 15,
                fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s", letterSpacing: "-0.01em",
                boxShadow: isPrimary && !loading ? `0 4px 14px ${C.primaryGlow} ` : "none",
                marginBottom: 10,
            }}>
            {loading ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                </span>
            ) : children}
        </button>
    );
}

const Divider = () => (
    <div style={{ display: "flex", alignItems: "center", margin: "24px 0" }}>
        <div style={{ flex: 1, height: 1, background: C.borderLight }}></div>
        <div style={{ padding: "0 14px", fontSize: 13, color: C.textMuted, fontFamily: FF }}>O continuar con</div>
        <div style={{ flex: 1, height: 1, background: C.borderLight }}></div>
    </div>
);

/* ─── Logo clickable reutilizable ─── */
function BrandLogo({ onClick, subtitle }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title="Ir al inicio"
            style={{
                textAlign: "center", marginBottom: 28, cursor: "pointer",
                transform: hovered ? "scale(1.03)" : "scale(1)",
                transition: "transform 0.2s ease",
            }}
        >
            <div style={{
                width: 52, height: 52, borderRadius: 14, margin: "0 auto 14px",
                background: `linear - gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, color: "#fff", fontWeight: 700,
                boxShadow: `0 6px 20px ${C.primaryGlow} `,
            }}>T</div>
            <div style={{ fontFamily: FF, fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>
                Talent<span style={{ color: C.primary }}>IQ</span>
            </div>
            {subtitle && (
                <div style={{ fontSize: 13, color: C.textMuted, fontFamily: FF, marginTop: 4 }}>{subtitle}</div>
            )}
        </div>
    );
}

/* ═══════════════ LOGIN ═══════════════ */
export function LoginScreen({ onSwitch, onLogin, onOAuth }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e?.preventDefault();
        setError(""); setLoading(true);
        try {
            if (!remember) {
                // Indicamos modo no persistente
                sessionStorage.setItem("ephemeral", "true");
            } else {
                sessionStorage.removeItem("ephemeral");
                localStorage.setItem("rememberUser_v1", email); // Opcional, guardar email recordado
            }
            await onLogin(email, password);
        } catch (err) {
            console.error("Login Error: ", err);
            const msg = (err.message || "").toLowerCase();
            if (msg.includes("invalid login") || msg.includes("credentials")) setError("Correo o contraseña incorrectos.");
            else if (msg.includes("email not confirmed")) setError("Por favor confirma tu correo. Revisa tu bandeja de entrada.");
            else setError(err.message || "Error al iniciar sesión. Intenta de nuevo.");
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: "100vh", background: C.bg, display: "flex",
            alignItems: "center", justifyContent: "center", fontFamily: FF, padding: "40px 0",
            position: "relative", overflow: "hidden"
        }}>
            <style>{KEYFRAMES}</style>
            <ParticleBackground />

            <div style={{ width: "100%", maxWidth: 420, padding: "0 20px", animation: "fadeIn 0.5s ease", position: "relative", zIndex: 1 }}>
                <BrandLogo onClick={() => window.location.reload()} />

                {/* Card */}
                <div style={{
                    background: "#fff", border: `1px solid ${C.border} `,
                    borderRadius: 16, padding: "30px 28px", boxShadow: C.shadowMd,
                }}>
                    <h2 style={{ margin: "0 0 4px", fontFamily: FF, fontSize: 20, fontWeight: 700, color: C.text }}>
                        Inicia sesión
                    </h2>
                    <p style={{ fontSize: 14, color: C.textSecondary, margin: "0 0 24px", lineHeight: 1.6 }}>
                        Te damos la bienvenida de nuevo a tu plataforma.
                    </p>

                    <AuthButton variant="secondary" onClick={() => {
                        if (!remember) sessionStorage.setItem("ephemeral", "true");
                        else sessionStorage.removeItem("ephemeral");
                        onOAuth("google");
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /><path fill="none" d="M1 1h22v22H1z" /></svg>
                        Google
                    </AuthButton>

                    <AuthButton variant="secondary" onClick={() => {
                        if (!remember) sessionStorage.setItem("ephemeral", "true");
                        else sessionStorage.removeItem("ephemeral");
                        onOAuth("linkedin_oidc");
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                        LinkedIn
                    </AuthButton>

                    <Divider />

                    {error && (
                        <div style={{
                            background: C.errorDim, border: `1px solid ${C.error} 25`,
                            borderRadius: 10, padding: "12px 16px", marginBottom: 18,
                            fontSize: 13, color: C.error, fontFamily: FF, lineHeight: 1.5,
                        }}>{error}</div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <AuthInput label="Correo electrónico" type="email" value={email}
                            onChange={setEmail} placeholder="tu@empresa.com" required icon="✉" />
                        <AuthInput label="Contraseña" type="password" value={password}
                            onChange={setPassword} placeholder="••••••••" required icon="🔒" />

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: FF, fontSize: 13, color: C.textSecondary, userSelect: "none" }}>
                                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                                    style={{ accentColor: C.primary, width: 16, height: 16, cursor: "pointer", margin: 0 }} />
                                Mantener sesión activa
                            </label>
                            <button type="button" onClick={() => onSwitch("forgot")} style={{
                                background: "none", border: "none", color: C.primary,
                                fontFamily: FF, fontSize: 13, fontWeight: 600, cursor: "pointer",
                            }}>¿Olvido de clave?</button>
                        </div>

                        <AuthButton onClick={handleSubmit} loading={loading}>
                            Iniciar con email
                        </AuthButton>
                    </form>

                    <div style={{
                        textAlign: "center", marginTop: 20, paddingTop: 20,
                        borderTop: `1px solid ${C.borderLight} `,
                    }}>
                        <span style={{ fontSize: 14, color: C.textSecondary, fontFamily: FF }}>
                            ¿No tienes cuenta?{" "}
                            <button onClick={() => onSwitch("register")} style={{
                                background: "none", border: "none", color: C.primary,
                                fontFamily: FF, fontSize: 14, fontWeight: 700, cursor: "pointer",
                            }}>Regístrate gratis</button>
                        </span>
                    </div>
                </div>

                <div style={{
                    textAlign: "center", marginTop: 24, fontSize: 12,
                    color: C.textMuted, fontFamily: FF, lineHeight: 1.6,
                }}>
                    Tus datos están protegidos con cifrado de extremo a extremo.
                </div>
            </div>
        </div>
    );
}

/* ═══════════════ REGISTER ═══════════════ */
export function RegisterScreen({ onSwitch, onRegister, onOAuth }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e?.preventDefault();
        setError("");
        if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
        if (password !== confirmPass) { setError("Las contraseñas no coinciden."); return; }
        setLoading(true);
        try {
            const result = await onRegister(email, password);
            // Si Supabase devuelve configuración sin error pero sin usuario, puede ser que el correo ya exista.
            if (result && result.user && result.user.identities && result.user.identities.length === 0) {
                setError("Este correo ya está registrado. Intenta iniciar sesión.");
                setLoading(false);
                return;
            }
            setSuccess(true);
        } catch (err) {
            console.error("Registration error:", err);
            const msg = (err.message || "").toLowerCase();
            if (msg.includes("already registered") || msg.includes("taken") || msg.includes("already")) {
                setError("Este correo ya está registrado. Intenta iniciar sesión.");
            } else if (msg.includes("password")) {
                setError("La contraseña es muy débil o inválida. Intenta con otra.");
            } else {
                setError(err.message || "Error al crear la cuenta. Intenta de nuevo.");
            }
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div style={{
                minHeight: "100vh", background: C.bg, display: "flex",
                alignItems: "center", justifyContent: "center", fontFamily: FF,
            }}>
                <style>{KEYFRAMES}</style>
                <div style={{
                    maxWidth: 440, padding: "0 20px", textAlign: "center",
                    animation: "fadeIn 0.5s ease",
                }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: "50%", margin: "0 auto 24px",
                        background: C.successDim, border: `2px solid ${C.success} `,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 28,
                    }}>✓</div>
                    <h2 style={{ fontFamily: FF, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>
                        Verifica tu correo
                    </h2>
                    <p style={{
                        fontSize: 15, color: C.textSecondary, lineHeight: 1.8,
                        marginBottom: 28, maxWidth: 360, margin: "0 auto 28px",
                    }}>
                        Hemos enviado un enlace a <strong style={{ color: C.primary }}>{email}</strong>.
                        Si no confirmas tu correo, se mostrará un error al intentar configurar tu empresa.
                    </p>
                    <AuthButton onClick={() => onSwitch("login")}>
                        Ya lo confirmé, Iniciar Sesión →
                    </AuthButton>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: "100vh", background: C.bg, display: "flex",
            alignItems: "center", justifyContent: "center", fontFamily: FF, padding: "40px 0",
        }}>
            <style>{KEYFRAMES}</style>
            <div style={{ width: "100%", maxWidth: 420, padding: "0 20px", animation: "fadeIn 0.5s ease" }}>
                <BrandLogo onClick={() => onSwitch("login")} subtitle="Crea tu cuenta gratis" />

                {/* Card */}
                <div style={{
                    background: "#fff", border: `1px solid ${C.border} `,
                    borderRadius: 16, padding: "28px 28px", boxShadow: C.shadowMd,
                }}>
                    <AuthButton variant="secondary" onClick={() => onOAuth("google")}>
                        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /><path fill="none" d="M1 1h22v22H1z" /></svg>
                        Registro con Google
                    </AuthButton>
                    <AuthButton variant="secondary" onClick={() => onOAuth("linkedin_oidc")}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                        Registro con LinkedIn
                    </AuthButton>
                    <Divider />

                    {error && (
                        <div style={{
                            background: C.errorDim, border: `1px solid ${C.error} 25`,
                            borderRadius: 10, padding: "12px 16px", marginBottom: 16,
                            fontSize: 13, color: C.error, fontFamily: FF, lineHeight: 1.5,
                        }}>{error}</div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <AuthInput label="Correo electrónico laboral" type="email" value={email}
                            onChange={setEmail} placeholder="tu@empresa.com" required icon="✉" />
                        <AuthInput label="Contraseña" type="password" value={password}
                            onChange={setPassword} placeholder="Mínimo 6 caracteres" required icon="🔒" />
                        <AuthInput label="Confirmar contraseña" type="password" value={confirmPass}
                            onChange={setConfirmPass} placeholder="Repite la contraseña" required icon="🔒" />

                        <div style={{ marginTop: 10 }}>
                            <AuthButton onClick={handleSubmit} loading={loading}>
                                Continuar con Email
                            </AuthButton>
                        </div>
                    </form>

                    <div style={{
                        textAlign: "center", marginTop: 18, paddingTop: 18,
                        borderTop: `1px solid ${C.borderLight} `,
                    }}>
                        <span style={{ fontSize: 14, color: C.textSecondary, fontFamily: FF }}>
                            ¿Ya tienes cuenta?{" "}
                            <button onClick={() => onSwitch("login")} style={{
                                background: "none", border: "none", color: C.primary,
                                fontFamily: FF, fontSize: 14, fontWeight: 700, cursor: "pointer",
                            }}>Inicia sesión</button>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════ ONBOARDING (Post-Login) ═══════════════ */
export function OnboardingScreen({ onComplete }) {
    const [companyName, setCompanyName] = useState("");
    const [sector, setSector] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const sectors = [
        "Tecnología", "Salud", "Finanzas y Banca", "Manufactura",
        "Retail y Comercio", "Educación", "Consultoría", "Gobierno",
        "Otros",
    ];

    const handleSubmit = async (e) => {
        e?.preventDefault();
        setError(""); setLoading(true);
        try {
            await onComplete(companyName, sector);
        } catch (err) {
            setError("Error al guardar perfil. Intenta de nuevo.");
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: "100vh", background: C.bg, display: "flex",
            alignItems: "center", justifyContent: "center", fontFamily: FF, padding: "40px 0",
        }}>
            <style>{KEYFRAMES}</style>
            <div style={{ width: "100%", maxWidth: 440, padding: "0 20px", animation: "fadeIn 0.5s ease" }}>
                {/* Card */}
                <div style={{
                    background: "#fff", border: `1px solid ${C.border} `,
                    borderRadius: 16, padding: "34px 30px", boxShadow: C.shadowMd,
                    textAlign: "center"
                }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 14, margin: "0 auto 16px",
                        background: `linear - gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 24, color: "#fff", fontWeight: 700,
                        boxShadow: `0 6px 20px ${C.primaryGlow} `,
                    }}>👋</div>

                    <h2 style={{ margin: "0 0 8px", fontFamily: FF, fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>
                        ¡Te damos la bienvenida!
                    </h2>
                    <p style={{ fontSize: 15, color: C.textSecondary, margin: "0 0 28px", lineHeight: 1.6 }}>
                        Solo necesitamos un par de datos para personalizar tu espacio de trabajo.
                    </p>

                    {error && (
                        <div style={{
                            background: C.errorDim, border: `1px solid ${C.error} 25`,
                            borderRadius: 10, padding: "12px 16px", marginBottom: 16,
                            fontSize: 13, color: C.error, fontFamily: FF, lineHeight: 1.5,
                        }}>{error}</div>
                    )}

                    <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
                        <AuthInput label="¿Cómo se llama tu empresa?" value={companyName}
                            onChange={setCompanyName} placeholder="Ej. Grupo Empresarial XYZ" required icon="🏢" />

                        <div style={{ marginBottom: 24 }}>
                            <label style={{ fontSize: 13, color: C.text, fontFamily: FF, fontWeight: 600, display: "block", marginBottom: 6 }}>
                                ¿A qué sector pertenece? <span style={{ color: C.error }}>*</span>
                            </label>
                            <select value={sector} onChange={e => setSector(e.target.value)} required style={{
                                width: "100%", boxSizing: "border-box", background: "#fff",
                                border: `1.5px solid ${C.border} `, borderRadius: 10, color: C.text,
                                fontFamily: FF, fontSize: 15, padding: "13px 16px", outline: "none",
                                cursor: "pointer", appearance: "none",
                                boxShadow: C.shadow,
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235B6B7F' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                                backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center",
                            }}>
                                <option value="">— Seleccionar sector —</option>
                                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <AuthButton onClick={handleSubmit} loading={loading}>
                            Finalizar configuración →
                        </AuthButton>
                    </form>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════ FORGOT PASSWORD ═══════════════ */
export function ForgotPasswordScreen({ onSwitch, onReset }) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e?.preventDefault();
        setError(""); setLoading(true);
        try {
            await onReset(email);
            setSent(true);
        } catch (err) {
            const msg = (err?.message || "").toLowerCase();
            if (msg.includes("rate limit")) {
                setError("Has excedido el límite de correos. Espera unos minutos e intenta de nuevo.");
            } else {
                setError("No pudimos enviar el correo. Verifica el email.");
            }
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: "100vh", background: C.bg, display: "flex",
            alignItems: "center", justifyContent: "center", fontFamily: FF,
        }}>
            <style>{KEYFRAMES}</style>
            <div style={{ width: "100%", maxWidth: 440, padding: "0 20px", animation: "fadeIn 0.5s ease" }}>
                <div style={{ textAlign: "center", marginBottom: 28, cursor: "pointer" }}
                    onClick={() => onSwitch("login")} title="Volver al inicio">
                    <div style={{
                        width: 48, height: 48, borderRadius: 12, margin: "0 auto 12px",
                        background: C.primaryDim, border: `1px solid ${C.primary} 25`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20, color: C.primary, transition: "transform 0.2s",
                    }}
                        onMouseOver={e => e.currentTarget.style.transform = "scale(1.08)"}
                        onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                    >🔑</div>
                </div>

                <div style={{
                    background: "#fff", border: `1px solid ${C.border} `,
                    borderRadius: 16, padding: "28px 28px", boxShadow: C.shadowMd,
                }}>
                    {sent ? (
                        <div style={{ textAlign: "center" }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: "50%", margin: "0 auto 18px",
                                background: C.successDim, border: `2px solid ${C.success} `,
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                            }}>✓</div>
                            <h2 style={{ fontFamily: FF, fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 10 }}>
                                Correo enviado
                            </h2>
                            <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, marginBottom: 22 }}>
                                Si el correo <strong>{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña.
                            </p>
                            <AuthButton onClick={() => onSwitch("login")}>
                                Volver a iniciar sesión
                            </AuthButton>
                        </div>
                    ) : (
                        <>
                            <h2 style={{ margin: "0 0 4px", fontFamily: FF, fontSize: 20, fontWeight: 700, color: C.text }}>
                                Recuperar contraseña
                            </h2>
                            <p style={{ fontSize: 14, color: C.textSecondary, margin: "0 0 22px", lineHeight: 1.6 }}>
                                Te enviaremos un enlace seguro para restablecer tu acceso
                            </p>

                            {error && (
                                <div style={{
                                    background: C.errorDim, border: `1px solid ${C.error} 25`,
                                    borderRadius: 10, padding: "12px 16px", marginBottom: 16,
                                    fontSize: 13, color: C.error, fontFamily: FF,
                                }}>{error}</div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <AuthInput label="Correo electrónico" type="email" value={email}
                                    onChange={setEmail} placeholder="tu@empresa.com" required icon="✉" />
                                <AuthButton onClick={handleSubmit} loading={loading}>
                                    Enviar enlace de recuperación
                                </AuthButton>
                            </form>

                            <div style={{ textAlign: "center", marginTop: 18 }}>
                                <button onClick={() => onSwitch("login")} style={{
                                    background: "none", border: "none", color: C.primary,
                                    fontFamily: FF, fontSize: 13, fontWeight: 600, cursor: "pointer",
                                }}>← Volver a iniciar sesión</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
