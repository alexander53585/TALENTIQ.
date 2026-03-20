export interface ValueCard {
  id: string
  name: string
  icon: string
  definition: string
  dimension: 'liderazgo' | 'técnica' | 'cultural' | 'relacional'
}

export interface ArchetypeCard {
  id: string
  name: string
  icon: string
  description: string
  traits: string[]
  color: string
}

export interface ChallengeCard {
  id: string
  name: string
  icon: string
  description: string
}

export const VALUE_CARDS: ValueCard[] = [
  { id: 'innovation',     name: 'Innovación',        icon: '💡', definition: 'Generar ideas nuevas y transformar la forma en que trabajamos.', dimension: 'técnica' },
  { id: 'integrity',      name: 'Integridad',         icon: '🎯', definition: 'Actuar con honestidad y coherencia entre lo que decimos y hacemos.', dimension: 'cultural' },
  { id: 'excellence',     name: 'Excelencia',         icon: '⭐', definition: 'Compromiso con el más alto estándar en todo lo que realizamos.', dimension: 'técnica' },
  { id: 'collaboration',  name: 'Colaboración',       icon: '🤝', definition: 'Trabajar juntos complementando fortalezas para lograr metas comunes.', dimension: 'relacional' },
  { id: 'empathy',        name: 'Empatía',            icon: '💚', definition: 'Entender y conectar con las experiencias y emociones de las personas.', dimension: 'relacional' },
  { id: 'transparency',   name: 'Transparencia',      icon: '🔍', definition: 'Comunicar con claridad y apertura, sin agendas ocultas.', dimension: 'cultural' },
  { id: 'agility',        name: 'Agilidad',           icon: '⚡', definition: 'Adaptarse rápidamente a los cambios y actuar con velocidad efectiva.', dimension: 'técnica' },
  { id: 'sustainability', name: 'Sostenibilidad',     icon: '🌱', definition: 'Operar pensando en el impacto de largo plazo para personas y planeta.', dimension: 'cultural' },
  { id: 'diversity',      name: 'Diversidad',         icon: '🌈', definition: 'Valorar las diferencias como fuente de riqueza organizacional.', dimension: 'relacional' },
  { id: 'respect',        name: 'Respeto',            icon: '🙏', definition: 'Reconocer la dignidad y el valor de cada persona en toda interacción.', dimension: 'relacional' },
  { id: 'courage',        name: 'Valentía',           icon: '🦁', definition: 'Tomar decisiones difíciles y defender convicciones frente a la adversidad.', dimension: 'liderazgo' },
  { id: 'trust',          name: 'Confianza',          icon: '🔐', definition: 'Construir relaciones sólidas basadas en la credibilidad y el cumplimiento.', dimension: 'relacional' },
  { id: 'commitment',     name: 'Compromiso',         icon: '💪', definition: 'Dedicación genuina con los objetivos, el equipo y la misión.', dimension: 'cultural' },
  { id: 'cx_focus',       name: 'Foco en cliente',    icon: '👥', definition: 'Poner las necesidades del cliente en el centro de cada decisión.', dimension: 'técnica' },
  { id: 'learning',       name: 'Aprendizaje',        icon: '📚', definition: 'Búsqueda continua de conocimiento y crecimiento desde la experiencia.', dimension: 'técnica' },
  { id: 'leadership',     name: 'Liderazgo',          icon: '🧭', definition: 'Inspirar y guiar a otros hacia un propósito con visión y ejemplo.', dimension: 'liderazgo' },
  { id: 'creativity',     name: 'Creatividad',        icon: '🎨', definition: 'Explorar soluciones originales fuera de los marcos convencionales.', dimension: 'técnica' },
  { id: 'responsibility', name: 'Responsabilidad',    icon: '⚖️', definition: 'Asumir las consecuencias de las propias acciones y decisiones.', dimension: 'cultural' },
  { id: 'quality',        name: 'Calidad',            icon: '✅', definition: 'Entregar resultados que superan expectativas y estándares establecidos.', dimension: 'técnica' },
  { id: 'authenticity',   name: 'Autenticidad',       icon: '💎', definition: 'Ser genuino, coherente y fiel a la identidad de la organización.', dimension: 'cultural' },
  { id: 'impact',         name: 'Impacto',            icon: '🚀', definition: 'Generar cambios positivos y medibles en las personas y el entorno.', dimension: 'liderazgo' },
  { id: 'community',      name: 'Comunidad',          icon: '🏘️', definition: 'Contribuir activamente al bienestar del entorno donde operamos.', dimension: 'relacional' },
  { id: 'resilience',     name: 'Resiliencia',        icon: '🔄', definition: 'Sobreponerse a los obstáculos y salir fortalecidos de los desafíos.', dimension: 'liderazgo' },
  { id: 'passion',        name: 'Pasión',             icon: '🔥', definition: 'Energía y entusiasmo genuino por el trabajo y la misión.', dimension: 'cultural' },
  { id: 'equity',         name: 'Equidad',            icon: '🌡️', definition: 'Asegurar condiciones justas para que cada persona se desarrolle plenamente.', dimension: 'relacional' },
  { id: 'communication',  name: 'Comunicación',       icon: '💬', definition: 'Escuchar activamente y expresar ideas con claridad, empatía y propósito.', dimension: 'relacional' },
  { id: 'growth',         name: 'Crecimiento',        icon: '📈', definition: 'Ambición sana de desarrollarse y generar mayor valor constantemente.', dimension: 'liderazgo' },
  { id: 'service',        name: 'Servicio',           icon: '🛎️', definition: 'Vocación genuina de ayudar y crear valor para quienes nos rodean.', dimension: 'relacional' },
  { id: 'purpose',        name: 'Propósito',          icon: '🌟', definition: 'Claridad sobre el "para qué" que da sentido a cada acción de la organización.', dimension: 'liderazgo' },
  { id: 'wellbeing',      name: 'Bienestar',          icon: '😊', definition: 'Crear entornos donde las personas prosperan y disfrutan lo que hacen.', dimension: 'cultural' },
]

export const ARCHETYPE_CARDS: ArchetypeCard[] = [
  { id: 'clan',       name: 'Clan',        icon: '👨‍👩‍👧', description: 'Organización como familia. Alta cohesión, mentoría y colaboración son la esencia.',  traits: ['Cohesión', 'Mentoría', 'Lealtad'],         color: '#10b981' },
  { id: 'adhocracy',  name: 'Adhocracia',  icon: '🚀',     description: 'Innovación y emprendimiento constante. La adaptación es la regla, no la excepción.', traits: ['Innovación', 'Riesgo', 'Experimentación'],  color: '#6366f1' },
  { id: 'market',     name: 'Mercado',     icon: '🏆',     description: 'Orientación total a resultados. La competencia externa impulsa el desempeño.',        traits: ['Resultados', 'Competencia', 'Logros'],      color: '#f59e0b' },
  { id: 'hierarchy',  name: 'Jerarquía',   icon: '🏛️',    description: 'Procesos, control y estabilidad. La eficiencia y el orden son valores centrales.',    traits: ['Control', 'Eficiencia', 'Estabilidad'],     color: '#64748b' },
  { id: 'mission',    name: 'Misión',      icon: '🌟',     description: 'Propósito social como motor. El impacto en la comunidad define el éxito.',            traits: ['Propósito', 'Impacto', 'Valores'],         color: '#ec4899' },
  { id: 'network',    name: 'Red',         icon: '🕸️',    description: 'Ecosistema de alianzas y conexiones. La colaboración externa multiplica capacidades.', traits: ['Alianzas', 'Ecosistema', 'Conexiones'],     color: '#0ea5e9' },
  { id: 'academy',    name: 'Academia',    icon: '🎓',     description: 'Aprendizaje continuo y especialización. Los expertos son el activo más valorado.',    traits: ['Conocimiento', 'Expertos', 'Formación'],    color: '#8b5cf6' },
  { id: 'tribe',      name: 'Tribu',       icon: '🔥',     description: 'Identidad y pertenencia fuertes. La cultura compartida une a las personas.',          traits: ['Identidad', 'Pertenencia', 'Pasión'],       color: '#ef4444' },
  { id: 'startup',    name: 'Startup',     icon: '⚡',     description: 'Velocidad y adaptación como ventaja. La mentalidad de MVP aplica a todo.',             traits: ['Velocidad', 'Agilidad', 'Iteración'],       color: '#f97316' },
  { id: 'corporate',  name: 'Corporativo', icon: '🏢',     description: 'Escala y procesos robustos. La estructura formal permite operar con consistencia.',   traits: ['Escala', 'Procesos', 'Consistencia'],       color: '#334155' },
  { id: 'social',     name: 'Social',      icon: '🌍',     description: 'Impacto comunitario como razón de ser. El valor incluye siempre lo social.',          traits: ['Comunidad', 'Bien común', 'ESG'],           color: '#16a34a' },
  { id: 'tech',       name: 'Tech-First',  icon: '⚙️',    description: 'Datos y tecnología en el centro de toda decisión. La automatización es cultura.',      traits: ['Datos', 'Automatización', 'Innovación'],    color: '#2563eb' },
]

export const CHALLENGE_CARDS: ChallengeCard[] = [
  { id: 'digital_transform',  name: 'Transformación Digital',   icon: '💻', description: 'Integrar tecnología en todos los procesos para crear nuevo valor y eficiencia.' },
  { id: 'cx',                 name: 'Experiencia de Cliente',    icon: '❤️', description: 'Diseñar cada punto de contacto para generar experiencias memorables.' },
  { id: 'efficiency',         name: 'Eficiencia Operacional',    icon: '⚙️', description: 'Eliminar desperdicios y optimizar procesos para hacer más con los mismos recursos.' },
  { id: 'expansion',          name: 'Expansión de Mercado',      icon: '🌎', description: 'Crecer hacia nuevos segmentos, geografías o canales de distribución.' },
  { id: 'talent',             name: 'Atracción de Talento',      icon: '🌟', description: 'Posicionarse como empleador de elección para atraer y retener los mejores perfiles.' },
  { id: 'innovation_culture', name: 'Cultura de Innovación',     icon: '💡', description: 'Crear condiciones para que toda la organización innove de forma sistemática.' },
  { id: 'esg',                name: 'Sostenibilidad ESG',        icon: '🌱', description: 'Integrar criterios ambientales, sociales y de gobernanza en la estrategia.' },
  { id: 'automation',         name: 'Automatización',            icon: '🤖', description: 'Liberar capacidad humana automatizando tareas repetitivas y de bajo valor.' },
  { id: 'data_intel',         name: 'Inteligencia de Datos',     icon: '📊', description: 'Transformar datos en decisiones mejores, más rápidas y más precisas.' },
  { id: 'cost',               name: 'Optimización de Costos',    icon: '💰', description: 'Reducir estructura de costos sin comprometer calidad ni crecimiento.' },
  { id: 'diversification',    name: 'Diversificación',           icon: '🎯', description: 'Ampliar portafolio para reducir riesgo y abrir nuevos mercados.' },
  { id: 'alliances',          name: 'Alianzas Estratégicas',     icon: '🤝', description: 'Desarrollar partnerships que multipliquen capacidades y alcance.' },
  { id: 'compliance',         name: 'Cumplimiento Regulatorio',  icon: '⚖️', description: 'Anticiparse a cambios normativos y operar con los más altos estándares.' },
  { id: 'remote',             name: 'Trabajo Híbrido',           icon: '🏡', description: 'Construir modelos de trabajo flexibles que mantengan cultura y productividad.' },
  { id: 'brand',              name: 'Posicionamiento de Marca',  icon: '✨', description: 'Fortalecer la percepción y reputación de la organización en el mercado.' },
  { id: 'competitive_intel',  name: 'Inteligencia Competitiva',  icon: '🔭', description: 'Monitorear y anticipar movimientos del mercado para mantener ventaja.' },
  { id: 'supply_chain',       name: 'Cadena de Suministro',      icon: '🔗', description: 'Hacer la cadena de valor más resiliente, eficiente y sostenible.' },
  { id: 'rd',                 name: 'I+D e Innovación',          icon: '🔬', description: 'Invertir en investigación y desarrollo para liderar con productos del futuro.' },
  { id: 'leadership_dev',     name: 'Desarrollo de Liderazgo',   icon: '🧭', description: 'Formar líderes capaces de guiar en entornos complejos y cambiantes.' },
  { id: 'wellbeing_org',      name: 'Bienestar Organizacional',  icon: '💚', description: 'Crear entornos que promuevan salud física, mental y emocional del equipo.' },
]
