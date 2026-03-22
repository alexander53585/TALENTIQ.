'use client'

import { useState } from 'react'
import { Sparkles, X, ArrowRight } from 'lucide-react'
import type { OnboardingSuggestions, PostTemplate } from './types'

interface Props {
  suggestions:   OnboardingSuggestions
  employeeName:  string
  onUseTemplate: (template: PostTemplate, communityId?: string) => void
  onDismiss:     () => void
}

export default function OnboardingBanner({
  suggestions,
  employeeName,
  onUseTemplate,
  onDismiss,
}: Props) {
  const [step, setStep] = useState<'welcome' | 'communities' | 'post'>('welcome')
  const firstName = employeeName.split(' ')[0] || employeeName

  return (
    <div
      className="relative bg-gradient-to-br from-[#3B6FCA] to-[#2d5db5] rounded-2xl p-5 text-white overflow-hidden"
      role="region"
      aria-label="Bienvenida al equipo"
    >
      {/* Background decoration */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" aria-hidden="true" />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" aria-hidden="true" />

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
        aria-label="Cerrar sugerencias de bienvenida"
      >
        <X size={14} />
      </button>

      {step === 'welcome' && (
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-amber-300" aria-hidden="true" />
            <p className="text-sm font-bold">¡Bienvenido/a, {firstName}!</p>
          </div>
          <p className="text-xs text-white/80 leading-relaxed mb-4">
            Moments es el espacio donde tu equipo comparte ideas, celebra logros y se conoce.
            Te ayudamos a empezar.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setStep('communities')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#3B6FCA] rounded-lg text-xs font-semibold hover:bg-white/90 transition-colors"
            >
              Ver comunidades <ArrowRight size={11} />
            </button>
            <button
              onClick={() => setStep('post')}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors"
            >
              Escribir presentación
            </button>
          </div>
        </div>
      )}

      {step === 'communities' && (
        <div className="relative">
          <button
            onClick={() => setStep('welcome')}
            className="text-[10px] text-white/60 hover:text-white/90 mb-3 block transition-colors"
          >
            ← Volver
          </button>
          <p className="text-xs font-bold mb-2.5">Comunidades recomendadas para ti</p>
          <ul className="flex flex-col gap-1.5 mb-4">
            {suggestions.communities.map(c => (
              <li
                key={c.id}
                className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2 text-xs"
              >
                <span className="font-medium truncate pr-2">{c.name}</span>
                <span className="text-white/60 shrink-0">{c.member_count} miembros</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setStep('post')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#3B6FCA] rounded-lg text-xs font-semibold hover:bg-white/90 transition-colors"
          >
            Siguiente: escribe tu primer post <ArrowRight size={11} />
          </button>
        </div>
      )}

      {step === 'post' && (
        <div className="relative">
          <button
            onClick={() => setStep('communities')}
            className="text-[10px] text-white/60 hover:text-white/90 mb-3 block transition-colors"
          >
            ← Volver
          </button>
          <p className="text-xs font-bold mb-2.5">Plantillas de primer post</p>
          <div className="flex flex-col gap-2">
            {suggestions.post_templates.map((tpl, i) => (
              <button
                key={i}
                onClick={() => {
                  onUseTemplate(tpl, suggestions.communities[0]?.id)
                  onDismiss()
                }}
                className="text-left bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2.5 text-xs transition-colors"
              >
                <p className="font-semibold mb-0.5">
                  {tpl.type === 'discussion' ? '💬 Presentación' : '❓ Pregunta al equipo'}
                </p>
                <p className="text-white/70 line-clamp-2 leading-relaxed">{tpl.title ?? tpl.body}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
