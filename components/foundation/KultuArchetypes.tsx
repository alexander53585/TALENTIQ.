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
  selected, onChange, workshopMode, min = 2, max = 7,
}: {
  selected: string[]
  onChange: (ids: string[]) => void
  workshopMode?: boolean
  min?: number
  max?: number
}) {
  const atMax = selected.length >= max
  const belowMin = selected.length < min && selected.length > 0

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter(x => x !== id))
    else if (!atMax) onChange([...selected, id])
  }

  const fs = workshopMode ? 15 : 13
  const badgeColor = atMax ? C.primary : belowMin ? '#f59e0b' : C.success
  const badgeBg    = atMax ? C.primaryDim : belowMin ? '#fef3c7' : C.successDim

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
            Hover para ver definición · Click para seleccionar · Mín. {min} · Máx. {max}
          </p>
        </div>
        <div style={{
          background: badgeBg, border: `1px solid ${badgeColor}30`,
          borderRadius: 20, padding: '4px 14px',
          fontFamily: FF, fontSize: 13, color: badgeColor, fontWeight: 600,
        }}>
          {selected.length}/{max}{atMax ? ' — límite' : belowMin ? ' — agrega más' : ''}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
        {VALUE_CARDS.map(card => {
          const isSelected = selected.includes(card.id)
          const isDisabled = atMax && !isSelected
          return (
            <div key={card.id} style={{ opacity: isDisabled ? 0.4 : 1, transition: 'opacity 0.2s' }}>
              <FlipCard
                selected={isSelected}
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
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Archetypes Deck ───────────────────────────────── */
export function ArchetypesDeck({
  selected, onChange, workshopMode, min = 3, maxSelect = 5,
}: {
  selected: string[]
  onChange: (ids: string[]) => void
  workshopMode?: boolean
  min?: number
  maxSelect?: number
}) {
  const atMax = selected.length >= maxSelect
  const belowMin = selected.length < min && selected.length > 0

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(x => x !== id))
    } else if (!atMax) {
      onChange([...selected, id])
    }
  }

  const badgeColor = atMax ? C.primary : belowMin ? '#f59e0b' : C.success
  const badgeBg    = atMax ? C.primaryDim : belowMin ? '#fef3c7' : C.successDim

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontFamily: FF, fontSize: workshopMode ? 16 : 13, fontWeight: 600, color: C.text, margin: 0 }}>
            ¿Con qué arquetipos culturales se identifica tu organización?
          </p>
          <p style={{ fontFamily: FF, fontSize: 12, color: C.textMuted, margin: '4px 0 0' }}>
            Mín. {min} · Máx. {maxSelect} arquetipos · Hover para explorar · Click para seleccionar
          </p>
        </div>
        {selected.length > 0 && (
          <div style={{
            background: badgeBg, border: `1px solid ${badgeColor}30`,
            borderRadius: 20, padding: '4px 14px',
            fontFamily: FF, fontSize: 13, color: badgeColor, fontWeight: 600,
          }}>
            {selected.length}/{maxSelect}{atMax ? ' — límite' : belowMin ? ' — agrega más' : ''}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {ARCHETYPE_CARDS.map(card => {
          const isSelected = selected.includes(card.id)
          const isDisabled = atMax && !isSelected
          return (
          <div key={card.id} style={{ opacity: isDisabled ? 0.4 : 1, transition: 'opacity 0.2s' }}>
          <FlipCard
            selected={isSelected}
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
          </div>
          )})}
      </div>
    </div>
  )
}

/* ── Challenges Deck ───────────────────────────────── */
export function ChallengesDeck({
  selected, onChange, workshopMode, min = 2, max = 5,
}: {
  selected: string[]
  onChange: (ids: string[]) => void
  workshopMode?: boolean
  min?: number
  max?: number
}) {
  const atLimit = selected.length >= max
  const belowMin = selected.length < min && selected.length > 0

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(x => x !== id))
    } else if (!atLimit) {
      onChange([...selected, id])
    }
  }

  const badgeColor = atLimit ? C.primary : belowMin ? '#f59e0b' : selected.length >= min ? '#16a34a' : C.textMuted
  const badgeBg    = atLimit ? C.primaryDim : belowMin ? '#fef3c7' : selected.length >= min ? '#f0fdf4' : C.surfaceAlt

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontFamily: FF, fontSize: workshopMode ? 16 : 13, fontWeight: 600, color: C.text, margin: 0 }}>
            Retos estratégicos del período
          </p>
          <p style={{ fontFamily: FF, fontSize: 12, color: C.textMuted, margin: '4px 0 0' }}>
            Elige entre {min} y {max} retos — se convertirán en ejes estratégicos con duración definida
          </p>
        </div>
        <div style={{
          background: badgeBg,
          border: `1px solid ${badgeColor}40`,
          borderRadius: 20, padding: '4px 14px',
          fontFamily: FF, fontSize: 13, color: badgeColor, fontWeight: 600,
        }}>
          {selected.length}/{max} ejes{atLimit ? ' — límite alcanzado' : belowMin ? ' — agrega más' : ''}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {CHALLENGE_CARDS.map(card => {
          const isSelected = selected.includes(card.id)
          const isDisabled = atLimit && !isSelected
          return (
            <div key={card.id} style={{ opacity: isDisabled ? 0.4 : 1, transition: 'opacity 0.2s', cursor: isDisabled ? 'not-allowed' : 'pointer' }}>
              <FlipCard
                selected={isSelected}
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
