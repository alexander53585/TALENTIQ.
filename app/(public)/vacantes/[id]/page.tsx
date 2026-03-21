'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { C, FF } from '@/lib/tokens';

/* ─── Types ──────────────────────────────────────────── */
interface Vacancy {
  id: string;
  title: string;
  status: string;
  location: string | null;
  modality: string | null;
  description: string | null;
  organization: string;
  position: string | null;
  created_at: string;
  updated_at: string;
}

interface ApplyForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

/* ─── Helpers ────────────────────────────────────────── */
const MODALITY_LABEL: Record<string, string> = {
  presencial: 'Presencial',
  remoto: 'Remoto',
  hibrido: 'Híbrido',
};

function orgColor(name: string) {
  const palette = [C.primary, C.secondary, '#7C3AED', '#E08A3C', '#18A873'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
}

function timeAgo(dateStr: string) {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (d < 1)   return 'Hace menos de 1 hora';
  if (d < 24)  return `Actualizado hace ${d} hora${d > 1 ? 's' : ''}`;
  const days = Math.floor(d / 24);
  if (days === 1) return 'Actualizado ayer';
  return `Actualizado hace ${days} días`;
}

/* ─── Main component ────────────────────────────────── */
export default function VacancyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [vacancy, setVacancy]       = useState<Vacancy | null>(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [activeTab, setActiveTab]   = useState<'detail' | 'related'>('detail');
  const [related, setRelated]       = useState<Vacancy[]>([]);
  const [vacancyId, setVacancyId]   = useState('');

  /* Apply form state */
  const [form, setForm]             = useState<ApplyForm>({ first_name: '', last_name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [applyResult, setApplyResult] = useState<{ success: boolean; message: string } | null>(null);

  /* Load vacancy */
  useEffect(() => {
    params.then(({ id }) => {
      setVacancyId(id);
      fetch(`/api/public/vacancies/${id}`)
        .then(r => r.json())
        .then(json => {
          if (json.error) { setNotFound(true); return; }
          setVacancy(json);
        })
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false));
    });
  }, [params]);

  /* Load related (same org) when tab clicked */
  useEffect(() => {
    if (activeTab !== 'related' || !vacancy) return;
    fetch(`/api/public/vacancies?q=${encodeURIComponent(vacancy.organization)}`)
      .then(r => r.json())
      .then(j => setRelated((j.data || []).filter((v: Vacancy) => v.id !== vacancy.id)));
  }, [activeTab, vacancy]);

  /* Submit */
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vacancy) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/vacancies/${vacancy.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setApplyResult({ success: true, message: json.message });
    } catch (err: any) {
      setApplyResult({ success: false, message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FF, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${C.primaryDim}`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: C.textMuted, fontSize: 14 }}>Cargando vacante…</p>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ── Not found ── */
  if (notFound || !vacancy) return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FF, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <div style={{ fontSize: 60 }}>😕</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Vacante no disponible</h2>
      <p style={{ color: C.textSecondary, fontSize: 14 }}>Esta vacante puede haber sido cerrada o ya no está activa.</p>
      <Link href="/vacantes" style={{ color: C.primary, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>← Ver todas las vacantes</Link>
    </div>
  );

  const color = orgColor(vacancy.organization);
  const initial = vacancy.organization.charAt(0).toUpperCase();

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 9,
    border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: FF,
    color: C.text, background: '#fff', outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FF, color: C.text }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg};font-family:${FF};-webkit-font-smoothing:antialiased}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        input:focus,textarea:focus{border-color:${C.primary}!important;box-shadow:0 0 0 3px ${C.primaryGlow}}
        .tab-btn{transition:all 0.15s}
        .action-icon:hover{background:${C.surfaceAlt}!important}
        .apply-primary:hover{opacity:0.92;transform:translateY(-1px)}
        .apply-primary{transition:all 0.18s}
        .outline-btn:hover{background:${C.primaryDim}!important;border-color:${C.primary}!important;color:${C.primary}!important}
        .outline-btn{transition:all 0.15s}
        .related-card:hover{box-shadow:${C.shadowMd}!important;transform:translateY(-2px)}
        .related-card{transition:all 0.18s}
        @media(max-width:680px){
          .two-col{grid-template-columns:1fr!important}
          .sidebar-sticky{position:static!important;top:auto!important}
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{
        background: '#fff', borderBottom: `1px solid ${C.border}`,
        padding: '0 20px', height: 56, position: 'sticky', top: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/vacantes" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 14,
          }}>K</div>
          <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>KultuRH</span>
          <span style={{ color: C.border, margin: '0 4px' }}>›</span>
          <span style={{ fontSize: 13, color: C.textSecondary }}>Portal de Empleo</span>
        </Link>
        <Link href="/login" style={{
          background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
          color: '#fff', padding: '7px 16px', borderRadius: 8,
          fontSize: 13, fontWeight: 700, textDecoration: 'none',
        }}>
          Ingresar
        </Link>
      </nav>

      {/* ── TITLE HEADER CARD ── */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 0' }}>

          {/* Breadcrumb */}
          <Link href="/vacantes" style={{ fontSize: 12, color: C.textMuted, textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
            ‹ Volver a vacantes
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              {/* Title */}
              <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1.25, marginBottom: 10 }}>
                {vacancy.title}
              </h1>

              {/* Company row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                {/* Org avatar inline */}
                <div style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  background: color + '18', border: `2px solid ${color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 900, color,
                }}>
                  {initial}
                </div>
                <span style={{ fontWeight: 700, color: C.primary, fontSize: 14 }}>{vacancy.organization}</span>

                {/* Verified badge */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: C.successDim, color: C.success,
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                }}>
                  ✓ Proceso cultural verificado
                </span>

                {/* KultuRH process badge */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: C.primaryDim, color: C.primary,
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                }}>
                  ✦ Alta revisión de perfiles
                </span>

                <span style={{ color: C.border }}>|</span>

                <Link href={`/vacantes?q=${encodeURIComponent(vacancy.organization)}`} style={{
                  fontSize: 13, fontWeight: 700, color: C.primary, textDecoration: 'none',
                }}>
                  ♡ Seguir empresa
                </Link>
              </div>
            </div>

            {/* Action icons */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {['⚠️', '🔗', '♡'].map((icon, i) => (
                <button key={i} className="action-icon" style={{
                  width: 38, height: 38, borderRadius: 8, border: `1px solid ${C.border}`,
                  background: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginTop: 4 }}>
            {([['detail', 'Detalle del empleo'], ['related', 'Más vacantes de la empresa']] as const).map(([key, label]) => (
              <button
                key={key}
                className="tab-btn"
                onClick={() => setActiveTab(key)}
                style={{
                  padding: '12px 20px', fontSize: 14, fontWeight: 700, background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: FF,
                  color: activeTab === key ? C.primary : C.textSecondary,
                  borderBottom: activeTab === key ? `2.5px solid ${C.primary}` : '2.5px solid transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* Tab: Detalle */}
        {activeTab === 'detail' && (
          <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start', animation: 'fadeUp 0.25s ease' }}>

            {/* ─ LEFT: Content ─ */}
            <div>

              {/* Quick-apply badge + timestamp */}
              <div style={{
                background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14,
                padding: '18px 22px', marginBottom: 20, boxShadow: C.shadow,
                display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                  color: '#fff', fontSize: 12, fontWeight: 800,
                  padding: '6px 14px', borderRadius: 20,
                }}>
                  ⚡ Postulación rápida
                </span>
                <span style={{ fontSize: 13, color: C.textMuted }}>
                  {timeAgo(vacancy.updated_at)}
                </span>
              </div>

              {/* Location */}
              {vacancy.location && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 20, padding: '0 4px',
                }}>
                  <span style={{ fontSize: 16 }}>📍</span>
                  <span style={{ fontSize: 14, color: C.textSecondary, fontWeight: 500 }}>
                    {vacancy.location}
                    {vacancy.modality ? ` · ${MODALITY_LABEL[vacancy.modality]}` : ''}
                  </span>
                </div>
              )}

              {/* Description */}
              <div style={{
                background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14,
                padding: '28px', boxShadow: C.shadow,
              }}>
                <h2 style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 20,
                }}>
                  <span style={{ fontSize: 18 }}>📋</span> Descripción del puesto
                </h2>

                {vacancy.description ? (
                  <div style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
                    {vacancy.description}
                  </div>
                ) : (
                  <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7 }}>
                    Postúlate para conocer más detalles sobre esta oportunidad.
                    El equipo de selección compartirá la información completa del cargo.
                  </p>
                )}

                {/* Position chip */}
                {vacancy.position && (
                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.borderLight}` }}>
                    <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>CARGO BASE: </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.textSecondary }}>{vacancy.position}</span>
                  </div>
                )}
              </div>

              {/* Legal note */}
              <div style={{ marginTop: 16, padding: '14px 18px', background: C.surfaceAlt, borderRadius: 10 }}>
                <p style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.7 }}>
                  El contenido de este aviso es responsabilidad del empleador. KultuRH no avala ni garantiza
                  las condiciones laborales descritas. <strong>Bajo ningún motivo envíes dinero o realices pagos.</strong>{' '}
                  Ningún proceso legítimo de selección requiere pagos del candidato.
                </p>
              </div>
            </div>

            {/* ─ RIGHT: Sidebar ─ */}
            <div className="sidebar-sticky" style={{ position: 'sticky', top: 72 }}>

              {/* Apply card */}
              <div style={{
                background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16,
                padding: '24px', boxShadow: C.shadowMd, marginBottom: 16,
              }}>
                {applyResult?.success ? (
                  /* Success state */
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                      ¡Postulación enviada!
                    </h3>
                    <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginBottom: 16 }}>
                      {applyResult.message}
                    </p>
                    <button
                      onClick={() => setApplyResult(null)}
                      style={{
                        padding: '9px 20px', borderRadius: 8, border: `1px solid ${C.border}`,
                        background: '#fff', color: C.textSecondary, fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', fontFamily: FF,
                      }}
                    >
                      Postularme con otro email
                    </button>
                  </div>
                ) : (
                  /* Apply form inline */
                  <>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>
                      ⚡ Postulación rápida
                    </h3>

                    <form onSubmit={handleApply}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nombre *</label>
                          <input required placeholder="Ana" style={inputStyle} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Apellido *</label>
                          <input required placeholder="García" style={inputStyle} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email *</label>
                        <input required type="email" placeholder="ana@email.com" style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Teléfono</label>
                        <input type="tel" placeholder="+57 300 000 0000" style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                      </div>

                      {applyResult && !applyResult.success && (
                        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#DC2626' }}>
                          ⚠️ {applyResult.message}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="apply-primary"
                        style={{
                          width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                          background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                          color: '#fff', fontSize: 14, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer',
                          fontFamily: FF, opacity: submitting ? 0.7 : 1,
                          boxShadow: `0 4px 14px ${C.primaryGlow}`,
                        }}
                      >
                        {submitting ? 'Enviando…' : '⚡ Postularme ahora'}
                      </button>
                    </form>
                  </>
                )}
              </div>

              {/* Ver más vacantes */}
              <Link
                href={`/vacantes?q=${encodeURIComponent(vacancy.organization)}`}
                className="outline-btn"
                style={{
                  display: 'block', width: '100%', padding: '13px', borderRadius: 10,
                  border: `1.5px solid ${C.border}`, background: '#fff',
                  color: C.textSecondary, fontSize: 13, fontWeight: 700,
                  textDecoration: 'none', textAlign: 'center', marginBottom: 16,
                }}
              >
                Ver más vacantes de {vacancy.organization}
              </Link>

              {/* Company card */}
              <div style={{
                background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16,
                padding: '20px', boxShadow: C.shadow,
              }}>
                {/* Org avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 11,
                    background: color + '18', border: `2px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 900, color,
                  }}>
                    {initial}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{vacancy.organization}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: C.success, fontWeight: 700 }}>✓</span>
                      <span style={{ fontSize: 11, color: C.textMuted }}>Empresa verificada en KultuRH</span>
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14, borderTop: `1px solid ${C.borderLight}` }}>
                  {vacancy.location && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 14 }}>📍</span>
                      <span style={{ fontSize: 12, color: C.textSecondary }}>{vacancy.location}</span>
                    </div>
                  )}
                  {vacancy.modality && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 14 }}>{vacancy.modality === 'remoto' ? '🌐' : vacancy.modality === 'hibrido' ? '🔄' : '🏢'}</span>
                      <span style={{ fontSize: 12, color: C.textSecondary }}>{MODALITY_LABEL[vacancy.modality]}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 14 }}>📅</span>
                    <span style={{ fontSize: 12, color: C.textSecondary }}>
                      Publicado el {new Date(vacancy.created_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* KultuRH badge */}
                <div style={{ marginTop: 16, padding: '10px 14px', background: C.primaryDim, borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: C.primary, fontWeight: 600, lineHeight: 1.6 }}>
                    ✦ Esta empresa usa KultuRH para selección basada en cultura y talento real.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Más vacantes */}
        {activeTab === 'related' && (
          <div style={{ animation: 'fadeUp 0.25s ease' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 20 }}>
              Más vacantes de <span style={{ color: C.primary }}>{vacancy.organization}</span>
            </h2>

            {related.length === 0 ? (
              <div style={{ background: '#fff', border: `1px dashed ${C.border}`, borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔎</div>
                <p style={{ color: C.textSecondary, fontSize: 14 }}>
                  No hay otras vacantes activas de esta empresa en este momento.
                </p>
                <Link href="/vacantes" style={{ display: 'inline-block', marginTop: 16, color: C.primary, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                  Ver todas las vacantes →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {related.map(v => (
                  <Link key={v.id} href={`/vacantes/${v.id}`} className="related-card" style={{
                    display: 'block', background: '#fff', border: `1px solid ${C.border}`,
                    borderRadius: 14, padding: '22px', textDecoration: 'none', color: 'inherit',
                    boxShadow: C.shadow,
                  }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{v.title}</h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {v.location && <span style={{ fontSize: 12, color: C.textSecondary }}>📍 {v.location}</span>}
                      {v.modality && <span style={{ fontSize: 12, color: C.secondary }}>· {MODALITY_LABEL[v.modality]}</span>}
                    </div>
                    <div style={{ marginTop: 12, textAlign: 'right', fontSize: 12, fontWeight: 700, color: C.primary }}>
                      Ver detalle →
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#fff', borderTop: `1px solid ${C.border}`, padding: '24px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', fontSize: 11, color: C.textMuted }}>
          <span style={{ fontWeight: 700, color: C.primary }}>KultuRH</span> · Selección de talento basada en cultura organizacional real.
          <span style={{ margin: '0 12px', color: C.border }}>|</span>
          © {new Date().getFullYear()} KultuRH · Todos los derechos reservados
        </div>
      </footer>
    </div>
  );
}
