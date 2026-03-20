// CLIENTE — llama a /api/ai desde el browser. No importa Anthropic SDK.

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiCompleteParams {
  messages: AiMessage[]
  system?: string
  maxTokens?: number
  model?: string
  feature?: string
}

const ERROR_MAP: Record<number, string> = {
  401: 'Sesión expirada. Por favor inicia sesión de nuevo.',
  403: 'No tienes permiso para usar esta función.',
  429: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
  500: 'Error en el servidor de IA. Intenta de nuevo.',
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export async function aiComplete(params: AiCompleteParams): Promise<string> {
  let lastError: Error = new Error('No se pudo conectar con el asistente. Intenta de nuevo.')

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await delay(1500 * attempt)
    }

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = ERROR_MAP[res.status] ?? data?.error ?? 'No se pudo conectar con el asistente.'
        const err = new Error(msg)
        // No reintentar en errores de auth
        if (res.status === 401 || res.status === 403) throw err
        lastError = err
        continue
      }

      return data.content as string
    } catch (err: any) {
      // Errores de red o auth — no seguir reintentando si es auth
      if (err.message === ERROR_MAP[401] || err.message === ERROR_MAP[403]) throw err
      lastError = err
    }
  }

  throw lastError
}
