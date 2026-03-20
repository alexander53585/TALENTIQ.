'use client'

import { useState } from 'react'
import { C, FF } from '@/lib/tokens'
import { VALUE_CARDS, ARCHETYPE_CARDS, CHALLENGE_CARDS, ValueCard, ArchetypeCard, ChallengeCard } from '@/lib/foundation/cards-data'

/* ── Flip Card ─────────────────────────────────────── */
function FlipCard({
  front, back, selected, onToggle, workshopMode,
}: {
  front: React.ReactNode
  back: React.ReactNode
  selected: boolean
  onToggle: () => void
  workshopMode?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const h = workshopMode ? 200 : 168
  return (
    <div
      style={{ perspective: '1000px', cursor: 'pointer', height: h }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onToggle}
    >
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.45s cubic-bezier(.4,0,.2,1)',
        transform: hovered ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>
        {/* Front */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden' as const,
          background: selected ? `${C.primary}08` : '#fff',
          border: `2px solid ${selected ? C.primary : C.border}`,
          borderRadius: 14,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 8, padding: '14px 10px',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: selected ? `0 0 0 3px ${C.primaryGlow}` : 'none',
        }}>
          {front}
          {selected && (
            <div style={{
              position: 'absolute', top: 8, right: 8,
              width: 20, height: 20, borderRadius: '50%',
              background: C.success, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700,
            }}>✓</div>
          )}
        </div>
        {/* Back */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden' as const,
          transform: 'rotateY(180deg)',
          background: selected ? `${C.primary}0f` : C.surfaceAlt,
          border: `2px solid ${selected ? C.primary : C.borderLight}`,
          borderRadius: 14,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '14px 12px', gap: 8,
        }}>
          {back}
        </div>
      </div>
    </div>
  )
}

/* ── Values Deck ───────────────────────────────────── */
export function ValuesDeck({
  selected, onChange, workshopMode,
}: {
  selected: string[]
  onChange: (ids: string[]) => void
  workshopMode?: boolean
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])

  const fs = workshopMode ? 15 : 13

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <p style={{ fontFamily: FF, fontSize: workshopMode ? 16 : 13, fontWeight: 600, color: C.text, margin: 0 }}>
            Selecciona los valores de tu organización
          </p>
          <p style={{ fontFamily: FF, fontSize: 12, color: C.textMuted, margin: '4px 0 0' }}>
            Hover para ver definición · Click para seleccionar · Recomendado: 4–8
          </p>
        </div>
        {selected.length > 0 && (
          <div style={{
            background: C.successDim, border: `1px solid ${C.success}30`,
            borderRadius: 20, padding: '4px 14px',
            fontFamily: FF, fontSize: 13, color: C.success, fontWeight: 600,
          }}>
            {selected.length} seleccionados
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
        {VALUE_CARDS.map(card => (
          <FlipCard
            key={card.id}
            selected={selected.includes(card.id)}
            onToggle={() => toggle(card.id)}
            workshopMode={workshopMode}
            front={
              <>
                <span style={{ fontSize: workshopMode ? 32 : 26 }}>{card.icon}</span>
                <span style={{ fontFamily: FF, fontSize: fs, fontWeight: 700, color: C.text, textAlign: 'center' }}>
                  {card.name}
                </span>
                <span style={{
                  fontFamily: FF, fontSize: 10, color: C.textMuted, textTransform: 'uppercase',
                  letterSpacing: '0.05em', background: C.surfaceAlt, borderRadius: 4,
                  padding: '2px 6px',
                }}>{card.dimension}</span>
              </>
            }
            back={
              <>
                <span style={{ fontSize: 20 }}>{card.icon}</span>
                <p style={{ fontFamily: FF, fontSize: 12, color: C.text, fontWeight: 700, margin: 0 }}>{card.name}</p>
                <p style={{ fontFamily: FF, fontSize: 11, color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>
                  {card.definition}
                </p>
              </>
            }
          />
        ))}
      </div>
    </div>
  )
}

/* ── Archetypes Deck ───────────────────────────────── */
export function ArchetypesDeck({
  selected, onChange, workshopMode, maxSelect = 3,
}: {
  selected: string[]
  onChange: (ids: string[]) => void
  workshopMode?: boolean
  maxSelect?: number
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(x => x !== id))
    } else if (selected.length < maxSelect) {
      onChange([...selected, id])
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: FF, fontSize: workshopMode ? 16 : 13, fontWeight: 600, color: C.text, margin: 0 }}>
          ¿Con qué arquetipos culturales se identifica tu organización?
        </p>
        <p style={{ fontFamily: FF, fontSize: 12, color: C.textMuted, margin: '4px 0 0' }}>
          Elige hasta {maxSelect} arquetipos · Hover para explorar · Click para seleccionar
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {ARCHETYPE_CARDS.map(card => (
          <FlipCard
            key={card.id}
            selected={selected.includes(card.id)}
            onToggle={() => toggle(card.id)}
            workshopMode={workshopMode}
            front={
              <>
                <span style={{ fontSize: workshopMode ? 34 : 28 }}>{card.icon}</span>
                <span style={{ fontFamily: FF, fontSize: 14, fontWeight: 700, color: C.text }}>{card.name}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                  {card.traits.map(t => (
                    <span key={t} style={{
                      fontSize: 9, fontFamily: FF, fontWeight: 600,
                      color: card.color, background: `${card.color}12`,
                      borderRadius: 4, padding: '2px 5px', textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>{t}</span>
                  ))}
                </div>
              </>
            }
            back={
              <>
                <span style={{ fontSize: 22 }}>{card.icon}</span>
                <p style={{ fontFamily: FF, fontSize: 12, color: C.text, fontWeight: 700, margin: 0 }}>{card.name}</p>
                <p style={{ fontFamily: FF, fontSize: 11, color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>
                  {card.description}
                </p>
              </>
            }
          />
        ))}
      </div>
    </div>
  )
}

/* ── Challenges Deck ───────────────────────────────── */
export function ChallengesDeck({
  selected, onChange, workshopMode,
}: {
  selected: string[]
  onChange: (ids: string[]) => void
  workshopMode?: boolean
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontFamily: FF, fontSize: workshopMode ? 16 : 13, fontWeight: 600, color: C.text, margin: 0 }}>
            Retos estratégicos del período
          </p>
          <p style={{ fontFamily: FF, fontSize: 12, color: C.textMuted, margin: '4px 0 0' }}>
            Selecciona los retos más relevantes — se convertirán en ejes estratégicos
          </p>
        </div>
        {selected.length > 0 && (
          <div style={{
            background: C.primaryDim, border: `1px solid ${C.primary}30`,
            borderRadius: 20, padding: '4px 14px',
            fontFamily: FF, fontSize: 13, color: C.primary, fontWeight: 600,
          }}>
            {selected.length} ejes definidos
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {CHALLENGE_CARDS.map(card => (
          <FlipCard
            key={card.id}
            selected={selected.includes(card.id)}
            onToggle={() => toggle(card.id)}
            workshopMode={workshopMode}
            front={
              <>
                <span style={{ fontSize: workshopMode ? 32 : 26 }}>{card.icon}</span>
                <span style={{ fontFamily: FF, fontSize: 12, fontWeight: 700, color: C.text, textAlign: 'center', lineHeight: 1.3 }}>
                  {card.name}
                </span>
              </>
            }
            back={
              <>
                <span style={{ fontSize: 20 }}>{card.icon}</span>
                <p style={{ fontFamily: FF, fontSize: 12, color: C.text, fontWeight: 700, margin: 0 }}>{card.name}</p>
                <p style={{ fontFamily: FF, fontSize: 11, color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>
                  {card.description}
                </p>
              </>
            }
          />
        ))}
      </div>
    </div>
  )
}
