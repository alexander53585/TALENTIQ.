'use client';

import { useState } from 'react';
import { C, FF } from '@/lib/tokens';
import ApprovedPositionSelector from '@/components/kulturh/ApprovedPositionSelector';
import VacancyEditor from '@/components/hiring/VacancyEditor';
import Link from 'next/link';

export default function NewVacancyPage() {
  const [selectedPosition, setSelectedPosition] = useState<any>(null);

  return (
    <div style={{ fontFamily: FF, maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/hiring" style={{ 
          background: '#fff', border: `1px solid ${C.border}`, color: C.textSecondary,
          borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600,
          textDecoration: 'none', display: 'inline-block'
        }}>
          ← Volver
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, margin: 0 }}>Nueva Vacante</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 24 }}>
        {!selectedPosition ? (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
              Paso 1 — Selecciona el perfil fuente
            </div>
            <ApprovedPositionSelector 
              onSelect={setSelectedPosition}
              selectedId={selectedPosition?.id}
            />
          </div>
        ) : (
          <div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
               <div style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                 Paso 2 — Preparar y publicar el aviso
               </div>
               <button onClick={() => setSelectedPosition(null)} style={{ background: 'transparent', border: 'none', color: C.primary, cursor: 'pointer', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}>
                 Cambiar selección
               </button>
             </div>
             
             <VacancyEditor position={selectedPosition} />
          </div>
        )}
      </div>
    </div>
  );
}
