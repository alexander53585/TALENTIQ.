'use client';

import { useState, useEffect, useCallback } from 'react';

type TokenValidation = {
  valid: boolean;
  completed?: boolean;
  expired?: boolean;
  message?: string;
  candidateName?: string;
  progress_pct?: number;
  status?: string;
};

type Question = { id: number; text: string; options: string[] };

export default function CandidateTestPage({ params }: { params: { token: string } }) {
  const [tokenData, setTokenData] = useState<TokenValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, 1 | 2 | 3>>({});
  const [step, setStep] = useState(0); // 0=intro, 1-187=questions, 188=submitting, 189=done
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedToken, setResolvedToken] = useState<string>('');

  useEffect(() => {
    async function init() {
      const { token } = await params;
      setResolvedToken(token);

      // Validate token
      const res = await fetch(`/api/16pf/token/${token}`);
      const data = await res.json();
      setTokenData(data);

      // Load questions dynamically
      const { QUESTIONS } = await import('@/lib/16pf/questions');
      setQuestions(QUESTIONS);
      setLoading(false);
    }
    init();
  }, [params]);

  const progress = step > 0 && step <= 187 ? Math.round((step / 187) * 100) : step > 187 ? 100 : 0;
  const currentQ = step >= 1 && step <= 187 ? questions[step - 1] : null;

  const handleAnswer = useCallback(async (qId: number, val: 1 | 2 | 3) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));

    // Track progress
    fetch(`/api/16pf/token/${resolvedToken}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: qId, value: val }),
    }).catch(() => {}); // fire and forget

    // Auto-advance
    if (step < 187) {
      setStep(s => s + 1);
    }
  }, [step, resolvedToken]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/16pf/token/${resolvedToken}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      setStep(189);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={S.shell}>
        <div style={S.card}>
          <div style={S.loadingWrap}>
            <div style={S.spinner} />
            <p style={{ color: '#5B6B7F', marginTop: 16 }}>Validando enlace...</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token states
  if (!tokenData?.valid) {
    return (
      <div style={S.shell}>
        <div style={S.card}>
          <div style={S.logo}><div style={S.logoIcon}>K</div><span style={S.logoText}>KultuRH · 16PF</span></div>
          <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>
              {tokenData?.completed ? '✅' : tokenData?.expired ? '⏰' : '❌'}
            </div>
            <h2 style={{ color: '#182230', marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
              {tokenData?.completed ? 'Evaluación ya completada' : tokenData?.expired ? 'Enlace expirado' : 'Enlace inválido'}
            </h2>
            <p style={{ color: '#5B6B7F', lineHeight: 1.7 }}>
              {tokenData?.message || 'Este enlace no es válido. Contacta al equipo de RRHH.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Intro screen
  if (step === 0) {
    return (
      <div style={S.shell}>
        <style>{globalCSS}</style>
        <div style={S.card}>
          <div style={S.logo}><div style={S.logoIcon}>K</div><span style={S.logoText}>KultuRH</span></div>
          <div style={{ padding: '2rem 3rem 3rem' }}>
            <h1 style={S.introTitle}>Test de Personalidad<br /><span style={{ color: '#3366FF' }}>16PF</span></h1>
            <p style={{ color: '#5B6B7F', marginBottom: '2rem', fontSize: 15 }}>Cuestionario de 16 Factores de Personalidad</p>
            <div style={S.instrBox}>
              <h3 style={{ color: '#3366FF', fontWeight: 700, marginBottom: '1rem', fontSize: 15 }}>Instrucciones importantes</h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#182230', lineHeight: 2, fontSize: 15 }}>
                <li>Este cuestionario consta de <strong>187 preguntas</strong>.</li>
                <li>Cada pregunta tiene <strong>3 opciones</strong> de respuesta.</li>
                <li><strong>No hay respuestas buenas ni malas</strong>. Responde con total sinceridad.</li>
                <li>No pienses demasiado las cuestiones. Tu primera respuesta suele ser la más acertada.</li>
                <li>Elige <em>siempre</em> la opción que mejor te describe.</li>
                <li>El cuestionario es <strong>confidencial</strong>.</li>
              </ul>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#5B6B7F', fontSize: '0.9rem', marginBottom: '2rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              Tiempo estimado: <strong>25 – 35 minutos</strong>
            </div>
            <button style={S.startBtn} onClick={() => setStep(1)}>
              Comenzar evaluación →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Completed screen
  if (step === 189) {
    return (
      <div style={S.shell}>
        <style>{globalCSS}</style>
        <div style={S.card}>
          <div style={S.logo}><div style={S.logoIcon}>K</div><span style={S.logoText}>KultuRH</span></div>
          <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={S.checkCircle}>✓</div>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '2rem', color: '#182230', marginBottom: '1rem' }}>
              ¡Evaluación completada!
            </h2>
            <p style={{ color: '#5B6B7F', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 2rem' }}>
              Gracias por completar el cuestionario 16PF. Tus respuestas han sido registradas y serán analizadas por el equipo evaluador.
            </p>
            <div style={{ display: 'flex', gap: 32, justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}><span style={{ display: 'block', fontSize: '2rem', fontWeight: 700, color: '#182230' }}>187</span><span style={{ color: '#5B6B7F', fontSize: '0.85rem' }}>Preguntas respondidas</span></div>
              <div style={{ textAlign: 'center' }}><span style={{ display: 'block', fontSize: '2rem', fontWeight: 700, color: '#182230' }}>100%</span><span style={{ color: '#5B6B7F', fontSize: '0.85rem' }}>Progreso</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Question screen
  const answered = currentQ ? answers[currentQ.id] : undefined;

  return (
    <div style={S.shell}>
      <style>{globalCSS}</style>
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem 0' }}>
          <div style={S.logo}><div style={S.logoIcon}>K</div><span style={S.logoText}>KultuRH 16PF</span></div>
          <span style={{ color: '#5B6B7F', fontSize: '0.9rem', fontWeight: 600 }}>{step} / 187</span>
        </div>
        <div style={{ height: 4, background: 'rgba(51,102,255,0.08)', marginTop: '1rem' }}>
          <div style={{ height: '100%', background: 'linear-gradient(135deg, #3366FF, #5580FF)', transition: 'width 0.3s ease', borderRadius: '0 2px 2px 0', width: `${progress}%` }} />
        </div>
        {currentQ && (
          <div style={{ padding: '2.5rem 2.5rem 1.5rem' }}>
            <span style={S.qBadge}>Pregunta {step}</span>
            <p style={{ fontSize: 15, color: '#182230', lineHeight: 1.6, fontWeight: 500, marginBottom: '2rem' }}>{currentQ.text}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {currentQ.options.map((opt, i) => {
                const val = (i + 1) as 1 | 2 | 3;
                const isSelected = answered === val;
                return (
                  <button
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16, padding: '1rem 1.25rem',
                      border: isSelected ? '1.5px solid #3366FF' : '1.5px solid #D8E1EB',
                      borderRadius: 10, background: isSelected ? 'rgba(51,102,255,0.08)' : '#F7F9FC',
                      cursor: 'pointer', textAlign: 'left' as const, transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 0 0 3px rgba(51,102,255,0.15)' : 'none',
                    }}
                    onClick={() => handleAnswer(currentQ.id, val)}
                  >
                    <span style={{
                      width: 28, height: 28, borderRadius: 50, background: isSelected ? '#3366FF' : '#F1F5F9',
                      color: isSelected ? '#fff' : '#5B6B7F', fontWeight: 700, fontSize: '0.85rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>{val}</span>
                    <span style={{ color: '#182230', fontSize: 15 }}>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 2.5rem 2rem', borderTop: '1px solid #E8EDF3' }}>
          {step > 1 && (
            <button style={S.backBtn} onClick={() => setStep(s => s - 1)}>← Anterior</button>
          )}
          <div style={{ marginLeft: 'auto' }}>
            {answered && step < 187 && (
              <button style={S.nextBtn} onClick={() => setStep(s => s + 1)}>Siguiente →</button>
            )}
            {answered && step === 187 && (
              <button
                style={{ ...S.nextBtn, background: submitting ? '#9CA3AF' : '#10B981' }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Enviando...' : 'Finalizar ✓'}
              </button>
            )}
          </div>
        </div>
        {error && (
          <div style={{ margin: '0 2rem 1rem', padding: '0.75rem 1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}

const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #F7F9FC; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; color: #182230; }
@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
`;

const S = {
  shell: { minHeight: '100vh', background: '#F7F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", padding: '2rem' } as React.CSSProperties,
  card: { background: '#fff', borderRadius: 16, boxShadow: '0 10px 30px rgba(24,34,48,0.08), 0 4px 8px rgba(24,34,48,0.04)', width: '100%', maxWidth: 680, overflow: 'hidden' } as React.CSSProperties,
  logo: { display: 'flex', alignItems: 'center', gap: 10, padding: '1.5rem 2rem 0' } as React.CSSProperties,
  logoIcon: { width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg, #3366FF, #5580FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1rem' } as React.CSSProperties,
  logoText: { color: '#182230', fontWeight: 700, fontSize: '1rem' } as React.CSSProperties,
  introTitle: { fontSize: 42, fontWeight: 700, color: '#182230', lineHeight: 1.15, marginBottom: '0.5rem' } as React.CSSProperties,
  instrBox: { background: 'rgba(51,102,255,0.08)', borderLeft: '3px solid #3366FF', borderRadius: '0 10px 10px 0', padding: '1.5rem 2rem', marginBottom: '1.5rem' } as React.CSSProperties,
  startBtn: { background: 'linear-gradient(135deg, #3366FF, #5580FF)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 15, display: 'block', width: '100%', boxShadow: '0 4px 12px rgba(51,102,255,0.15)' } as React.CSSProperties,
  checkCircle: { width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #18A873, #0EA66B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#fff', margin: '0 auto 1.5rem' } as React.CSSProperties,
  qBadge: { display: 'inline-block', background: 'rgba(51,102,255,0.08)', color: '#3366FF', borderRadius: 20, padding: '0.25rem 0.75rem', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: '1rem' } as React.CSSProperties,
  backBtn: { background: 'transparent', border: '1.5px solid #D8E1EB', color: '#5B6B7F', borderRadius: 10, padding: '0.6rem 1.4rem', cursor: 'pointer', fontWeight: 600 } as React.CSSProperties,
  nextBtn: { background: 'linear-gradient(135deg, #3366FF, #5580FF)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.6rem 1.4rem', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(51,102,255,0.15)' } as React.CSSProperties,
  loadingWrap: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' } as React.CSSProperties,
  spinner: { width: 32, height: 32, border: '3px solid #E2E8F0', borderTop: '3px solid #3366FF', borderRadius: '50%', animation: 'spin 1s linear infinite' } as React.CSSProperties,
};
