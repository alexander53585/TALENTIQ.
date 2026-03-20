'use client';

import { useState, useEffect } from 'react';
import { C, FF } from '@/lib/tokens';
import Link from 'next/link';
import CandidatePipeline from '@/components/hiring/CandidatePipeline';

export default function VacancyDetailPage({ params }: { params: { id: string } }) {
  const [vacancy, setVacancy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  
  const [resolvedId, setResolvedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve(params).then(p => {
      setResolvedId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (!resolvedId) return;
    
    fetch(`/api/hiring/vacancies/${resolvedId}`)
      .then(res => res.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        setVacancy(json);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [resolvedId]);

  const handlePublish = async () => {
    if (!resolvedId) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/hiring/vacancies/${resolvedId}/publish`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setVacancy({ ...vacancy, status: 'published' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const addManualCandidate = async () => {
    const name = window.prompt("Nombre Completo:");
    if (!name) return;
    const email = window.prompt("Email:");
    if (!email) return;

    try {
      const res = await fetch(`/api/hiring/vacancies/${resolvedId}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, email, phone: '', source: 'direct' })
      });
      if (!res.ok) alert('Error al agregar');
      else window.location.reload(); // Quick refresh to update Kanban state naturally
    } catch(e) {
      alert(e);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontFamily: FF, color: C.textMuted }}>Cargando pipeline...</div>;
  }

  if (error || !vacancy) {
    return (
      <div style={{ padding: '40px', fontFamily: FF, maxWidth: 900, margin: '0 auto' }}>
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '20px', borderRadius: 12, color: '#DC2626' }}>
          ⚠️ {error || 'Vacante no encontrada'}
        </div>
        <Link href="/hiring" style={{ display: 'inline-block', marginTop: 20, color: C.primary, fontWeight: 700 }}>← Volver</Link>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FF, margin: '0 auto', padding: '40px 20px', maxWidth: 1400 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <Link href="/hiring" style={{ 
          background: '#fff', border: `1px solid ${C.border}`, color: C.textSecondary,
          borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600,
          textDecoration: 'none', display: 'inline-block'
        }}>
          ← Volver
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, margin: 0 }}>{vacancy.title}</h1>
        
        <span style={{ 
          background: vacancy.status === 'published' ? '#D1FAE5' : vacancy.status === 'created' ? C.surfaceAlt : '#FEF3C7',
          color: vacancy.status === 'published' ? '#065F46' : vacancy.status === 'created' ? C.textSecondary : '#92400E',
          fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase'
        }}>
          {vacancy.status === 'published' ? 'Publicada activa' : vacancy.status === 'created' ? 'Borrador' : vacancy.status}
        </span>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
           <button onClick={addManualCandidate} style={{ 
             background: '#fff', border: `1px solid ${C.primary}`, color: C.primary,
             borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FF
           }}>
             + Añadir Candidato
           </button>

           {vacancy.status === 'created' && (
             <button onClick={handlePublish} disabled={publishing} style={{ 
               background: publishing ? C.border : 'linear-gradient(135deg, #10B981, #059669)',
               border: 'none', color: '#fff', borderRadius: 10, padding: '10px 20px',
               fontSize: 14, fontWeight: 700, cursor: publishing ? 'wait' : 'pointer', fontFamily: FF, boxShadow: '0 4px 14px rgba(16,185,129,0.2)'
             }}>
               {publishing ? 'Publicando...' : '✦ Publicar Vacante'}
             </button>
           )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        
        {/* Pipeline Column (Left 80%) */}
        <div style={{ flex: 1, minWidth: 0, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: '24px', boxShadow: C.shadow }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 24 }}>Pipeline de Candidatos</h2>
          
          <CandidatePipeline vacancyId={resolvedId as string} />
        </div>

        {/* Info Column (Right 20%) */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: '#F8FAFC', border: `1px solid ${C.border}`, borderRadius: 16, padding: '24px' }}>
             <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estructura de Evaluación</h3>
             <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
               {Object.entries(vacancy.evaluation_structure || {}).map(([c, w]: any) => (
                 <li key={c} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: C.textSecondary }}>
                   <span style={{ textTransform: 'capitalize' }}>{c === '16pf' ? 'Perfil 16PF' : c}</span>
                   <strong style={{ color: C.primary }}>{w}%</strong>
                 </li>
               ))}
             </ul>
          </div>
          
          <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 16, padding: '24px' }}>
             <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0369A1', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Copias IA Disponibles</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               {vacancy.ad_content?.linkedin ? (
                 <div style={{ fontSize: 13, color: '#1E40AF' }}>
                   <strong>LinkedIn:</strong> <br />
                   {vacancy.ad_content.linkedin.substring(0, 100)}...
                 </div>
               ) : (
                 <span style={{ fontSize: 13, color: C.textMuted }}>No se generó aviso interno.</span>
               )}
             </div>
          </div>
        </div>

      </div>

    </div>
  );
}
