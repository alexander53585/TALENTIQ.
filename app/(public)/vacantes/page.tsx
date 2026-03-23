'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { C, FF } from '@/lib/tokens';

/* ─── Types ─────────────────────────────────────────── */
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

interface Pagination {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  count: number;
}

/* ─── Constants ─────────────────────────────────────── */
const MODALITY_LABEL: Record<string, string> = {
  presencial: 'Presencial',
  remoto: 'Remoto',
  hibrido: 'Híbrido',
};

const MODALITY_ICON: Record<string, string> = {
  presencial: '🏢',
  remoto: '🌐',
  hibrido: '🔄',
};

const MODALITY_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'remoto', label: 'Remoto' },
  { value: 'hibrido', label: 'Híbrido' },
];

/* ─── Helpers ────────────────────────────────────────── */
function orgInitial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

function orgColor(name: string): string {
  const palette = [C.primary, C.secondary, '#7C3AED', '#E08A3C', '#18A873', '#E05252'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
}

function excerpt(text: string | null, max = 150) {
  if (!text) return null;
  const flat = text.replace(/\n/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max) + '…' : flat;
}

function daysLabel(dateStr: string) {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Ayer';
  return `Hace ${d} días`;
}

function buildRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [];
  const add = (n: number | '…') => { if (pages[pages.length - 1] !== n) pages.push(n); };
  [1, 2].forEach(add);
  if (current > 4) add('…');
  for (let i = Math.max(3, current - 1); i <= Math.min(total - 2, current + 1); i++) add(i);
  if (current < total - 3) add('…');
  [total - 1, total].forEach(add);
  return pages;
}

/* ─── Component ──────────────────────────────────────── */
export default function VacantesPage() {
  const [vacancies, setVacancies]     = useState<Vacancy[]>([]);
  const [pagination, setPagination]   = useState<Pagination | null>(null);
  const [companies, setCompanies]     = useState<Company[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [location, setLocation]       = useState('');
  const [modality, setModality]       = useState('');
  const [sort, setSort]               = useState<'recent' | 'active'>('recent');
  const [page, setPage]               = useState(1);
  const carouselRef                   = useRef<HTMLDivElement>(null);

  /* ── Load vacancies ── */
  const loadVacancies = useCallback(async (
    q: string, loc: string, mod: string, s: string, pg: number
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q)   params.set('q', q);
      if (loc) params.set('location', loc);
      if (mod) params.set('modality', mod);
      params.set('sort', s);
      params.set('page', String(pg));
      const res  = await fetch(`/api/public/vacancies?${params}`);
      const json = await res.json();
      setVacancies(json.data || []);
      setPagination(json.pagination || null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Load companies once ── */
  useEffect(() => {
    fetch('/api/public/companies')
      .then(r => r.json())
      .then(j => setCompanies(j.data || []));
  }, []);

  /* ── Initial + dependency-driven load ── */
  useEffect(() => {
    loadVacancies(search, location, modality, sort, page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modality, sort, page]);

  /* ── Debounced search / location ── */
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadVacancies(search, location, modality, sort, 1);
    }, 380);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, location]);

  const handleFilterChange = (key: 'modality' | 'sort', val: string) => {
    setPage(1);
    if (key === 'modality') setModality(val);
    else setSort(val as 'recent' | 'active');
  };

  /* ─── Styles ── */
  const S = {
    page: { minHeight: '100vh', background: C.bg, fontFamily: FF, color: C.text },
    nav: {
      background: '#fff', borderBottom: `1px solid ${C.border}`,
      padding: '0 20px', height: 58, display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky' as const, top: 0, zIndex: 60,
    },
    logo: {
      display: 'flex', alignItems: 'center', gap: 10,
      textDecoration: 'none', color: 'inherit',
    },
    logoIcon: {
      width: 34, height: 34, borderRadius: 9,
      background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 900, fontSize: 15,
    },
    pill: (active: boolean): React.CSSProperties => ({
      padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
      border: `1.5px solid ${active ? C.primary : C.border}`,
      background: active ? C.primaryDim : '#fff',
      color: active ? C.primary : C.textSecondary,
      cursor: 'pointer', fontFamily: FF, transition: 'all 0.15s',
    }),
    sortTab: (active: boolean): React.CSSProperties => ({
      fontSize: 13, fontWeight: 700, color: active ? C.primary : C.textMuted,
      background: 'none', border: 'none', cursor: 'pointer', fontFamily: FF,
      paddingBottom: 2, borderBottom: active ? `2px solid ${C.primary}` : '2px solid transparent',
      transition: 'all 0.15s',
    }),
    input: {
      flex: 1, padding: '11px 16px', border: `1.5px solid ${C.border}`,
      borderRadius: 10, fontSize: 14, fontFamily: FF, color: C.text,
      background: '#fff', outline: 'none',
    } as React.CSSProperties,
    card: {
      background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14,
      padding: '22px', boxShadow: C.shadow,
      textDecoration: 'none', color: 'inherit', display: 'block',
      transition: 'all 0.18s',
    } as React.CSSProperties,
  };

  const pageRange = pagination ? buildRange(page, pagination.total_pages) : [];

  return (
    <div style={S.page}>
      <style suppressHydrationWarning>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg};font-family:${FF};color:${C.text};-webkit-font-smoothing:antialiased}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.55}50%{opacity:1}}
        .v-card:hover{box-shadow:${C.shadowMd}!important;transform:translateY(-2px)}
        .co-card:hover{box-shadow:${C.shadowMd}!important;transform:translateY(-2px);border-color:${C.primary}!important}
        input:focus{border-color:${C.primary}!important;box-shadow:0 0 0 3px ${C.primaryGlow}}
        .pg-btn:hover{background:${C.primaryDim}!important;color:${C.primary}!important}
        ::-webkit-scrollbar{height:4px}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={S.nav}>
        <Link href="/vacantes" style={S.logo}>
          <div style={S.logoIcon}>K</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1 }}>KultuRH</div>
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 500 }}>Portal de Empleo</div>
          </div>
        </Link>
        <Link href="/login" style={{
          background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
          color: '#fff', padding: '8px 18px', borderRadius: 8,
          fontSize: 13, fontWeight: 700, textDecoration: 'none',
          boxShadow: `0 2px 8px ${C.primaryGlow}`,
        }}>
          Ingresar
        </Link>
      </nav>

      {/* ── HERO ── */}
      <div style={{
        background: `linear-gradient(160deg, #0c1a3a 0%, #172e6e 55%, ${C.primary} 100%)`,
        padding: '60px 20px 72px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* dot grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
        }} />
        <div style={{ position: 'relative', maxWidth: 620, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 24, padding: '5px 16px', marginBottom: 20,
          }}>
            <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, letterSpacing: '0.08em' }}>
              ✦ OPORTUNIDADES REALES · CULTURA VERIFICADA
            </span>
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1.18, marginBottom: 14 }}>
            Encuentra el trabajo<br />
            <span style={{
              background: `linear-gradient(90deg, ${C.secondary}, #7EEBD6)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              que encaja contigo
            </span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 1.7, marginBottom: 0 }}>
            Empresas que usan KultuRH aplican selección inteligente basada en cultura y perfil real.
          </p>
        </div>
      </div>

      {/* ── SECTION: Empleadores destacados ── */}
      {companies.length > 0 && (
        <div style={{ background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, padding: '28px 0' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 18 }}>
              Empleadores que contratan ahora
            </h2>
            <div
              ref={carouselRef}
              style={{
                display: 'flex', gap: 12, overflowX: 'auto',
                paddingBottom: 8, scrollSnapType: 'x mandatory',
              }}
            >
              {companies.map(co => {
                const color = orgColor(co.name);
                return (
                  <Link
                    key={co.id}
                    href={`/vacantes?q=${encodeURIComponent(co.name)}`}
                    className="co-card"
                    style={{
                      minWidth: 180, background: '#fff',
                      border: `1px solid ${C.border}`, borderRadius: 12,
                      padding: '18px 16px', textDecoration: 'none', color: 'inherit',
                      scrollSnapAlign: 'start', flexShrink: 0,
                      boxShadow: C.shadow, transition: 'all 0.18s',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, marginBottom: 12,
                      background: color + '18', border: `2px solid ${color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 900, color,
                    }}>
                      {orgInitial(co.name)}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6, lineHeight: 1.35 }}>
                      {co.name}
                    </div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: C.primaryDim, color: C.primary,
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    }}>
                      {co.count} {co.count === 1 ? 'vacante' : 'vacantes'}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION: Búsqueda y filtros ── */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '24px 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.textSecondary, marginBottom: 14, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Busca tu vacante
          </h2>

          {/* Search inputs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '2 1 220px' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cargo, empresa o área..."
                style={{ ...S.input, paddingLeft: 40, width: '100%' }}
              />
            </div>
            <div style={{ position: 'relative', flex: '1 1 160px' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>📍</span>
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Ciudad o región..."
                style={{ ...S.input, paddingLeft: 40, width: '100%' }}
              />
            </div>
          </div>

          {/* Modality filter pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>Modalidad:</span>
            {MODALITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                style={S.pill(modality === opt.value)}
                onClick={() => handleFilterChange('modality', opt.value)}
              >
                {opt.value ? MODALITY_ICON[opt.value] + ' ' : ''}{opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION: Resultados ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Results header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 15, color: C.text }}>
            {loading
              ? <span style={{ color: C.textMuted }}>Buscando…</span>
              : <>
                  <strong style={{ color: C.primary, fontSize: 18 }}>
                    {pagination?.total?.toLocaleString('es-CO') ?? 0}
                  </strong>
                  {' '}vacante{pagination?.total !== 1 ? 's' : ''} encontrada{pagination?.total !== 1 ? 's' : ''}
                </>
            }
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>Ordenar:</span>
            <button style={S.sortTab(sort === 'recent')} onClick={() => handleFilterChange('sort', 'recent')}>
              Más recientes
            </button>
            <span style={{ color: C.border }}>·</span>
            <button style={S.sortTab(sort === 'active')} onClick={() => handleFilterChange('sort', 'active')}>
              Activas primero
            </button>
          </div>
        </div>

        {/* Skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '22px', border: `1px solid ${C.border}`, animation: 'pulse 1.5s ease-in-out infinite' }}>
                <div style={{ height: 18, background: C.surfaceAlt, borderRadius: 6, width: '50%', marginBottom: 12 }} />
                <div style={{ height: 13, background: C.surfaceAlt, borderRadius: 6, width: '25%', marginBottom: 10 }} />
                <div style={{ height: 13, background: C.surfaceAlt, borderRadius: 6, width: '80%' }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && vacancies.length === 0 && (
          <div style={{
            background: '#fff', border: `1px dashed ${C.border}`, borderRadius: 16,
            padding: '60px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🔎</div>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 8 }}>Sin resultados</h2>
            <p style={{ color: C.textSecondary, fontSize: 14 }}>
              Prueba con otros términos o elimina los filtros activos.
            </p>
          </div>
        )}

        {/* Card list */}
        {!loading && vacancies.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.3s ease' }}>
            {vacancies.map((v, idx) => {
              const color = orgColor(v.organization);
              return (
                <>
                  {/* ── CTA card every 5 items ── */}
                  {idx > 0 && idx % 5 === 0 && (
                    <div key={`cta-${idx}`} style={{
                      background: C.primaryDim, border: `1px solid ${C.primary}20`,
                      borderRadius: 14, padding: '24px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
                    }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                          ¿Representas una empresa?
                        </div>
                        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
                          Publica vacantes con proceso de selección cultural e inteligente.
                        </div>
                      </div>
                      <Link href="/register" style={{
                        background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                        color: '#fff', padding: '10px 22px', borderRadius: 8, fontWeight: 700,
                        fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' as const,
                        boxShadow: `0 4px 12px ${C.primaryGlow}`,
                      }}>
                        Publicar gratis →
                      </Link>
                    </div>
                  )}

                  {/* ── Vacancy card ── */}
                  <Link key={v.id} href={`/vacantes/${v.id}`} className="v-card" style={S.card}>
                    <div style={{ display: 'flex', gap: 16 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                        background: color + '15', border: `2px solid ${color}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, fontWeight: 900, color, alignSelf: 'flex-start',
                      }}>
                        {orgInitial(v.organization)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Org + date */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {v.organization}
                          </span>
                          <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                            {daysLabel(v.updated_at)}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.3, marginBottom: 10 }}>
                          {v.title}
                        </h3>

                        {/* Chips */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                          {v.location && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: C.surfaceAlt, color: C.textSecondary, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                              📍 {v.location}
                            </span>
                          )}
                          {v.modality && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: C.secondaryDim, color: C.secondary, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                              {MODALITY_ICON[v.modality]} {MODALITY_LABEL[v.modality]}
                            </span>
                          )}
                          {v.position && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: C.surfaceAlt, color: C.textSecondary, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                              💼 {v.position}
                            </span>
                          )}
                          {v.status === 'in_process' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: C.successDim, color: C.success, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                              ● Proceso activo
                            </span>
                          )}
                        </div>

                        {/* Excerpt */}
                        {excerpt(v.description) && (
                          <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, margin: 0 }}>
                            {excerpt(v.description)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>Ver detalle y postular →</span>
                    </div>
                  </Link>
                </>
              );
            })}
          </div>
        )}

        {/* ── PAGINATION ── */}
        {pagination && pagination.total_pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 40, flexWrap: 'wrap' }}>
            {/* Prev */}
            <button
              className="pg-btn"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              style={{
                width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border}`,
                background: '#fff', color: page === 1 ? C.textMuted : C.text,
                cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: FF, fontSize: 16,
              }}
            >
              ‹
            </button>

            {pageRange.map((p, i) =>
              p === '…'
                ? <span key={`ellipsis-${i}`} style={{ color: C.textMuted, fontSize: 14, padding: '0 4px' }}>…</span>
                : (
                  <button
                    key={p}
                    className="pg-btn"
                    onClick={() => setPage(p as number)}
                    style={{
                      width: 36, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 700,
                      border: `1px solid ${page === p ? C.primary : C.border}`,
                      background: page === p ? C.primary : '#fff',
                      color: page === p ? '#fff' : C.text,
                      cursor: 'pointer', fontFamily: FF,
                    }}
                  >
                    {p}
                  </button>
                )
            )}

            {/* Next */}
            <button
              className="pg-btn"
              disabled={page === pagination.total_pages}
              onClick={() => setPage(p => p + 1)}
              style={{
                width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border}`,
                background: '#fff', color: page === pagination.total_pages ? C.textMuted : C.text,
                cursor: page === pagination.total_pages ? 'not-allowed' : 'pointer', fontFamily: FF, fontSize: 16,
              }}
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#fff', borderTop: `1px solid ${C.border}`, padding: '28px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ ...S.logoIcon, width: 28, height: 28, borderRadius: 7, fontSize: 13 }}>K</div>
            <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>KultuRH</span>
          </div>
          <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
            Selección de talento basada en cultura organizacional real.
          </p>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            {['Términos y condiciones', 'Privacidad', 'Preguntas frecuentes'].map(l => (
              <Link key={l} href="/login" style={{ fontSize: 11, color: C.textMuted, textDecoration: 'none' }}>{l}</Link>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: C.textMuted }}>
            © {new Date().getFullYear()} KultuRH · Todos los derechos reservados
          </div>
        </div>
      </footer>
    </div>
  );
}
