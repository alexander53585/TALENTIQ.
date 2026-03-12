import { useState, useEffect, Component } from "react";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { LoginScreen, RegisterScreen, ForgotPasswordScreen, OnboardingScreen } from "./components/AuthScreens";
import KultuRH from "./components/KultuRH";
import { C, FF, KEYFRAMES } from "./components/tokens";

/* ═══════════ ERROR BOUNDARY GLOBAL ═══════════ */
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(err) { return { hasError: true, error: err }; }
  componentDidCatch(err, info) { console.error("[ErrorBoundary]", err, info); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FF }}>
        <style>{KEYFRAMES}</style>
        <div style={{ textAlign: "center", maxWidth: 420, padding: "0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: C.text, marginBottom: 8, fontWeight: 700 }}>Algo salió mal</h2>
          <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 24 }}>
            La aplicación encontró un error inesperado. Tu trabajo guardado no se ha perdido.
          </p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontFamily: FF, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Recargar aplicación
          </button>
        </div>
      </div>
    );
  }
}

function AppContent() {
  const { user, company, loading, signIn, signUp, signInWithProvider, signOut, resetPassword, createCompanyProfile } = useAuth();
  const [authScreen, setAuthScreen] = useState("login");
  const [showOverride, setShowOverride] = useState(false);

  useEffect(() => {
    if (!loading) { setShowOverride(false); return; }
    const t = setTimeout(() => setShowOverride(true), 6000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg, display: "flex",
        alignItems: "center", justifyContent: "center", fontFamily: FF,
      }}>
        <style>{KEYFRAMES}</style>
        <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: "0 auto 18px",
            background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, color: "#fff", fontWeight: 700,
            boxShadow: `0 6px 20px ${C.primaryGlow}`,
          }}>T</div>
          <div style={{ fontFamily: FF, fontSize: 20, fontWeight: 700, color: C.text }}>
            Kultu<span style={{ color: C.primary }}>RH</span>
          </div>
          <div style={{
            marginTop: 18, width: 36, height: 36, borderRadius: "50%",
            border: `3px solid ${C.borderLight}`, borderTopColor: C.primary,
            animation: "spin 1s linear infinite", margin: "18px auto 0",
          }} />
          {showOverride && (
            <div style={{ marginTop: 24, animation: "fadeIn 0.4s ease" }}>
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>Está tardando más de lo normal...</p>
              <button
                onClick={() => window.location.reload()}
                style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textSecondary, borderRadius: 8, padding: "8px 20px", fontFamily: FF, fontSize: 13, cursor: "pointer" }}>
                Reintentar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    if (authScreen === "register") return <RegisterScreen onSwitch={setAuthScreen} onRegister={signUp} onOAuth={signInWithProvider} />;
    if (authScreen === "forgot") return <ForgotPasswordScreen onSwitch={setAuthScreen} onReset={resetPassword} />;
    return <LoginScreen onSwitch={setAuthScreen} onLogin={signIn} onOAuth={signInWithProvider} />;
  }

  if (!company) return <OnboardingScreen onComplete={createCompanyProfile} />;

  return <KultuRH user={user} company={company} onSignOut={signOut} />;
}



function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
