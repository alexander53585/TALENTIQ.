import { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({});

/* ─── Helper: query con timeout ────────────────────────────── */
function withTimeout(promise, ms = 5000) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("TIMEOUT")), ms)
        ),
    ]);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const isMounted = useRef(true);
    const loadingLock = useRef(false); // Mutex para evitar doble carga

    /* ─── Carga empresa con mutex + timeout ──────────────────── */
    const loadCompanyProfile = async (userId, email) => {
        // MUTEX: si ya estoy cargando, no entro otra vez
        if (loadingLock.current) {
            console.log("[Auth] loadCompanyProfile — salteado (lock activo)");
            return;
        }
        loadingLock.current = true;

        try {
            // Query con timeout de 5 segundos
            let data = null;

            try {
                const r = await withTimeout(
                    supabase.from("companies").select("*").eq("user_id", userId).maybeSingle(),
                    5000
                );
                data = r.data;
            } catch (e) {
                console.warn("[Auth] Query por user_id falló o timeout:", e.message);
            }

            // Fallback por email si no encontró nada
            if (!data && email) {
                try {
                    const r = await withTimeout(
                        supabase.from("companies").select("*").eq("email", email).maybeSingle(),
                        5000
                    );
                    if (r.data) {
                        data = r.data;
                        // Auto-reparar user_id
                        if (r.data.user_id !== userId) {
                            console.warn("[Auth] Reparando user_id");
                            supabase.from("companies")
                                .update({ user_id: userId })
                                .eq("id", r.data.id)
                                .then(() => console.log("[Auth] user_id reparado"));
                        }
                    }
                } catch (e) {
                    console.warn("[Auth] Query por email falló o timeout:", e.message);
                }
            }

            if (isMounted.current && data) {
                setCompany(data);
            }
        } catch (e) {
            console.error("[Auth] loadCompanyProfile error:", e);
        } finally {
            loadingLock.current = false;
            if (isMounted.current) setLoading(false);
        }
    };

    /* ─── Init: getSession() primero, luego listener ─────────── */
    useEffect(() => {
        isMounted.current = true;

        const init = async () => {
            try {
                // 1. getSession() — resuelve inmediatamente con la sesión existente
                const { data, error } = await supabase.auth.getSession();
                if (error) throw error;
                if (!isMounted.current) return;

                const sessionUser = data.session?.user ?? null;
                console.log("[Auth] getSession →", sessionUser ? sessionUser.email : "sin sesión");

                setUser(sessionUser);

                if (sessionUser) {
                    await loadCompanyProfile(sessionUser.id, sessionUser.email);
                } else {
                    setLoading(false);
                }
            } catch (e) {
                console.error("[Auth] init error:", e);
                if (isMounted.current) setLoading(false);
            }
        };

        init();

        // 2. Listener solo para eventos POSTERIORES a la carga
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isMounted.current) return;

                // Ignorar INITIAL_SESSION — ya lo manejamos con getSession()
                if (event === "INITIAL_SESSION") return;

                console.log("[Auth] event:", event);

                if (event === "SIGNED_OUT") {
                    setUser(null);
                    setCompany(null);
                    setLoading(false);
                    return;
                }

                // SIGNED_IN (OAuth redirect, token refresh, etc.)
                if (event === "SIGNED_IN" && session?.user) {
                    setUser(session.user);
                    // Solo cargar empresa si no la tenemos ya
                    if (!company) {
                        await loadCompanyProfile(session.user.id, session.user.email);
                    }
                }
            }
        );

        // Fallback de seguridad: 7s máximo
        const fallback = setTimeout(() => {
            if (isMounted.current && loading) {
                console.warn("[Auth] Fallback 7s — forzando debloqueo");
                setLoading(false);
                loadingLock.current = false;
            }
        }, 7000);

        // Listener for tab close (Ephemeral Sessions)
        const handleUnload = () => {
            if (sessionStorage.getItem("ephemeral") === "true") {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
                        localStorage.removeItem(key);
                    }
                }
            }
        };
        window.addEventListener("unload", handleUnload);

        return () => {
            isMounted.current = false;
            clearTimeout(fallback);
            subscription.unsubscribe();
            window.removeEventListener("unload", handleUnload);
        };
    }, []);

    /* ─── Crear empresa ──────────────────────────────────────── */
    const createCompanyProfile = async (companyName, sector) => {
        if (!user) return;
        const { data, error } = await supabase.from("companies").insert({
            user_id: user.id, name: companyName, sector, email: user.email,
        }).select().single();
        if (error) throw error;
        setCompany(data);
        return data;
    };

    /* ─── Auth ───────────────────────────────────────────────── */
    const getRedirectUrl = () => {
        // Si estamos en producción, forzamos la URL de producción
        if (window.location.hostname !== "localhost") {
            return "https://app.kulturh.com";
        }
        return window.location.origin;
    };

    const signUp = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email, password, options: { emailRedirectTo: getRedirectUrl() }
        });
        if (error) throw error;
        return data;
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const signInWithProvider = async (provider) => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider, options: { redirectTo: getRedirectUrl() }
        });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setCompany(null);
    };

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: getRedirectUrl(),
        });
        if (error) throw error;
    };

    return (
        <AuthContext.Provider value={{
            user, company, loading,
            signUp, signIn, signInWithProvider, signOut, resetPassword,
            loadCompanyProfile, createCompanyProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
