import Link from 'next/link'
import {
  Dna,
  Building2,
  Briefcase,
  Newspaper,
  ArrowRight,
  CheckCircle2,
  Zap,
  Globe,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Dna,
    title: 'Foundation',
    description:
      'Define la ADN cultural de tu organización: valores, arquetipos y competencias clave.',
    color: 'bg-blue-50 text-[#3B6FCA]',
  },
  {
    icon: Building2,
    title: 'Architecture',
    description:
      'Diseña la estructura organizacional y los perfiles de cargo con IA generativa.',
    color: 'bg-teal-50 text-[#00A99D]',
  },
  {
    icon: Briefcase,
    title: 'Hiring',
    description:
      'Gestiona vacantes, evalúa candidatos con 16PF y toma decisiones basadas en datos.',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: Newspaper,
    title: 'Moments',
    description:
      'Comunica logros, cultura y noticias internas en un feed social para tu equipo.',
    color: 'bg-emerald-50 text-emerald-600',
  },
]

const LOGOS = [
  { name: 'Empresa Alpha', initials: 'A', bg: 'bg-blue-100 text-blue-700' },
  { name: 'Grupo Beta', initials: 'B', bg: 'bg-teal-100 text-teal-700' },
  { name: 'Compañía Gamma', initials: 'G', bg: 'bg-purple-100 text-purple-700' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F0F3FA] font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#3B6FCA] flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-bold text-[#1E2A45] text-lg">KultuRH</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#features" className="hover:text-[#3B6FCA] transition-colors">Módulos</a>
            <a href="#empresas" className="hover:text-[#3B6FCA] transition-colors">Empresas</a>
            <a href="/vacantes" className="hover:text-[#3B6FCA] transition-colors">Vacantes</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex px-4 py-2 text-sm text-[#3B6FCA] font-medium hover:bg-blue-50 rounded-xl transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm bg-[#3B6FCA] text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              Crear empresa
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24 px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E2A45] via-[#1A2B5E] to-[#3B6FCA] opacity-5 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-[#00A99D]/10 text-[#00A99D] text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-[#00A99D]/20">
            <Zap size={12} />
            Potenciado por Inteligencia Artificial
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1E2A45] leading-tight mb-6">
            KultuRH —<br className="hidden sm:block" />
            <span className="text-[#3B6FCA]">La plataforma de Talento</span>{' '}
            <span className="text-[#00A99D]">con IA</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Gestiona cultura organizacional, diseña cargos con IA, atrae talento
            alineado y mide el impacto de tu equipo desde un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1E2A45] text-white font-semibold rounded-xl hover:bg-[#1A2B5E] transition-colors shadow-md"
            >
              Iniciar sesión
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#3B6FCA] text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md"
            >
              Crear empresa gratis
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/vacantes"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#3B6FCA] font-semibold rounded-xl border border-[#3B6FCA]/30 hover:bg-blue-50 transition-colors"
            >
              <Globe size={16} />
              Ver vacantes disponibles
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400">
            {['Sin tarjeta de crédito', 'Configuración en minutos', 'Datos seguros en la nube'].map(
              (item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-[#00A99D]" />
                  {item}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1E2A45] mb-3">
              Todo lo que necesitas para gestionar talento
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Cuatro módulos integrados que cubren todo el ciclo de vida del talento en tu organización.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon size={20} />
                </div>
                <h3 className="font-bold text-[#1E2A45] text-lg mb-2 group-hover:text-[#3B6FCA] transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section id="empresas" className="py-20 px-4 sm:px-6 bg-[#F0F3FA]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-8">
            Confiado por equipos de RH
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {LOGOS.map((logo) => (
              <div
                key={logo.name}
                className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 px-6 py-4 shadow-sm"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${logo.bg}`}
                >
                  {/* Abstract logo SVG */}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="2" y="2" width="8" height="8" rx="2" fill="currentColor" opacity="0.7" />
                    <rect x="14" y="2" width="8" height="8" rx="2" fill="currentColor" opacity="0.4" />
                    <rect x="2" y="14" width="8" height="8" rx="2" fill="currentColor" opacity="0.4" />
                    <rect x="14" y="14" width="8" height="8" rx="2" fill="currentColor" opacity="0.7" />
                  </svg>
                </div>
                <span className="font-semibold text-[#1E2A45] text-sm">{logo.name}</span>
              </div>
            ))}
          </div>
          <p className="mt-10 text-slate-500 text-sm">
            Equipos de RH en crecimiento confían en KultuRH para alinear cultura y talento.
          </p>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-4 sm:px-6 bg-[#1A2B5E]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Empieza a construir tu cultura organizacional hoy
          </h2>
          <p className="text-blue-200 mb-8 max-w-xl mx-auto">
            Únete a los equipos de RH que ya gestionan su talento con inteligencia artificial.
            Gratis para comenzar, sin compromisos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#00A99D] text-white font-semibold rounded-xl hover:bg-teal-500 transition-colors shadow-lg"
            >
              Crear cuenta gratis
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-colors"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E2A45] py-8 px-4 sm:px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#3B6FCA] flex items-center justify-center">
              <span className="text-white font-bold text-xs">K</span>
            </div>
            <span className="text-slate-400 text-sm font-medium">KultuRH</span>
          </div>
          <p className="text-slate-500 text-sm">© 2025 KultuRH. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <a href="/vacantes" className="hover:text-slate-300 transition-colors">Vacantes</a>
            <a href="/login" className="hover:text-slate-300 transition-colors">Acceder</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
