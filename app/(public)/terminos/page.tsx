'use client';

import Link from 'next/link';
import { C, FF } from '@/lib/tokens';

/* ─── Section data ───────────────────────────────────────────────────────── */
const SECTIONS = [
  {
    id: 'aceptacion',
    title: '1. Aceptación de los Términos',
    content: [
      {
        subtitle: '1.1 Acuerdo vinculante',
        body: 'Al acceder, registrarse o utilizar KultuRH (en adelante, "el Servicio" o "la Plataforma"), usted, en su nombre y en representación de la empresa u organización que representa (en adelante, "el Cliente"), acepta quedar vinculado por estos Términos y Condiciones de Uso (en adelante, "los Términos"), nuestra Política de Privacidad y cualquier política adicional publicada en la plataforma.\n\nSi no está de acuerdo con alguna parte de estos Términos, no deberá acceder ni utilizar el Servicio.',
      },
      {
        subtitle: '1.2 Capacidad legal',
        body: 'Al aceptar estos Términos, usted declara que: (a) tiene al menos 18 años de edad; (b) tiene capacidad legal para celebrar contratos vinculantes bajo la ley ecuatoriana; y (c) si actúa en nombre de una empresa, cuenta con autorización suficiente para obligar a dicha empresa.',
      },
      {
        subtitle: '1.3 Modificaciones',
        body: 'KultuRH se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios materiales serán notificados con al menos 30 días de anticipación mediante correo electrónico o aviso en la plataforma. El uso continuado del Servicio tras la entrada en vigor de los cambios constituye aceptación de los Términos modificados.',
      },
    ],
  },
  {
    id: 'descripcion-servicio',
    title: '2. Descripción del Servicio',
    content: [
      {
        subtitle: '2.1 Funcionalidades',
        body: 'KultuRH es una plataforma SaaS (Software como Servicio) de gestión del talento humano diseñada para empresas ecuatorianas. Entre sus funcionalidades se incluyen: publicación y gestión de vacantes de empleo; recepción y administración de postulaciones de candidatos; evaluaciones psicométricas (16PF); perfiles de cultura organizacional; gestión de equipos con control de acceso basado en roles (propietario, administrador, especialista en RRHH, gerente, empleado); módulo de reconocimiento entre colaboradores (momentos); e invitaciones y gestión de membresías en espacios de trabajo.',
      },
      {
        subtitle: '2.2 Disponibilidad',
        body: 'KultuRH se esfuerza por mantener una disponibilidad del servicio del 99,5 % mensual, excluyendo mantenimientos programados notificados con anticipación. Sin embargo, no garantizamos disponibilidad ininterrumpida. Podemos suspender temporalmente el Servicio por mantenimiento, actualizaciones o causas de fuerza mayor sin incurrir en responsabilidad.',
      },
      {
        subtitle: '2.3 Actualizaciones',
        body: 'KultuRH puede agregar, modificar o eliminar funcionalidades del Servicio a su entera discreción. Cuando una modificación implique la eliminación de una funcionalidad material, notificaremos al Cliente con al menos 30 días de anticipación.',
      },
    ],
  },
  {
    id: 'cuentas',
    title: '3. Cuentas de usuario y Workspaces',
    content: [
      {
        subtitle: '3.1 Registro y seguridad',
        body: 'Para usar KultuRH debe crear una cuenta con información veraz, precisa y actualizada. Usted es responsable de mantener la confidencialidad de sus credenciales de acceso y de todas las actividades que se realicen bajo su cuenta. Notifique inmediatamente a info@kulturh.app ante cualquier uso no autorizado de su cuenta.',
      },
      {
        subtitle: '3.2 Workspaces y roles',
        body: 'Cada organización opera dentro de un espacio de trabajo (workspace). El propietario del workspace es responsable de: (a) gestionar los roles y permisos de los miembros del equipo; (b) asegurarse de que el uso del Servicio por parte de los miembros del equipo cumpla estos Términos; y (c) mantener la suscripción activa según el plan contratado. Los roles disponibles son: propietario (owner), administrador (admin), especialista de RRHH (hr_specialist), gerente (manager) y empleado (employee), con niveles de acceso diferenciados.',
      },
      {
        subtitle: '3.3 Una cuenta, un usuario',
        body: 'Las cuentas son personales e intransferibles. No está permitido compartir credenciales de acceso entre múltiples personas. Cada usuario debe contar con su propia cuenta. El número de usuarios simultáneos puede estar limitado según el plan de suscripción contratado.',
      },
      {
        subtitle: '3.4 Cancelación y suspensión',
        body: 'KultuRH se reserva el derecho de suspender o cancelar cuentas que violen estos Términos, realicen actividades fraudulentas o generen daños a terceros o a la plataforma. En caso de cancelación por incumplimiento, no se realizarán reembolsos. El Cliente puede cancelar su suscripción en cualquier momento desde la configuración de su cuenta.',
      },
    ],
  },
  {
    id: 'uso-aceptable',
    title: '4. Uso aceptable',
    content: [
      {
        subtitle: '4.1 Uso permitido',
        body: 'El Cliente se compromete a utilizar KultuRH exclusivamente para fines legítimos de gestión de talento humano dentro de su organización, de conformidad con la legislación ecuatoriana y estos Términos.',
      },
      {
        subtitle: '4.2 Usos prohibidos',
        body: 'Queda expresamente prohibido: (a) publicar vacantes o contenido falso, engañoso o discriminatorio; (b) recopilar datos de candidatos para fines distintos a los procesos de selección declarados; (c) acceder o intentar acceder a cuentas o datos de otros clientes; (d) realizar ingeniería inversa, descompilar o desensamblar el software; (e) utilizar el Servicio para enviar comunicaciones no solicitadas (spam); (f) introducir virus, malware o cualquier código dañino; (g) realizar pruebas de penetración o vulnerabilidades sin autorización escrita previa de KultuRH; (h) sublicenciar, revender o transferir el Servicio a terceros sin autorización.',
      },
      {
        subtitle: '4.3 Responsabilidad sobre el contenido',
        body: 'El Cliente es el único responsable del contenido que publique o cargue en la plataforma (vacantes, descripciones de puestos, evaluaciones, reconocimientos, etc.) y garantiza que dicho contenido no viola derechos de terceros, la legislación laboral ecuatoriana ni ninguna normativa aplicable.',
      },
    ],
  },
  {
    id: 'planes-pagos',
    title: '5. Planes, precios y facturación',
    content: [
      {
        subtitle: '5.1 Planes disponibles',
        body: 'KultuRH ofrece diferentes planes de suscripción cuyos precios y características se describen en la página de precios de la plataforma. Los precios están expresados en dólares estadounidenses (USD) e incluyen impuestos aplicables según la normativa tributaria ecuatoriana.',
      },
      {
        subtitle: '5.2 Facturación y renovación',
        body: 'Las suscripciones se renuevan automáticamente al final de cada período de facturación (mensual o anual) salvo cancelación previa. El Cliente autoriza a KultuRH a cobrar el monto correspondiente al método de pago registrado. Los cargos no son reembolsables salvo disposición expresa en estos Términos o mandato legal.',
      },
      {
        subtitle: '5.3 Cambios de precio',
        body: 'KultuRH puede modificar sus precios con 60 días de aviso previo. Si el Cliente no acepta el nuevo precio, puede cancelar su suscripción antes de la fecha de renovación sin costo adicional.',
      },
    ],
  },
  {
    id: 'propiedad-intelectual',
    title: '6. Propiedad intelectual',
    content: [
      {
        subtitle: '6.1 Titularidad de KultuRH',
        body: 'KultuRH y sus licenciantes son titulares exclusivos de todos los derechos de propiedad intelectual sobre la plataforma, incluyendo: el software, el código fuente, los algoritmos, el diseño visual, las metodologías de evaluación, las marcas, los logotipos y cualquier otro contenido generado por KultuRH. Nada en estos Términos transfiere derechos de propiedad intelectual al Cliente.',
      },
      {
        subtitle: '6.2 Licencia de uso',
        body: 'KultuRH otorga al Cliente una licencia limitada, no exclusiva, intransferible y revocable para acceder y utilizar el Servicio durante el período de suscripción activa, exclusivamente para los fines previstos en estos Términos.',
      },
      {
        subtitle: '6.3 Datos del Cliente',
        body: 'El Cliente conserva todos los derechos sobre los datos y contenido que introduce en la plataforma ("Datos del Cliente"). KultuRH no reclama derechos de propiedad sobre los Datos del Cliente. El Cliente otorga a KultuRH una licencia limitada para tratar los Datos del Cliente únicamente en la medida necesaria para prestar el Servicio.',
      },
      {
        subtitle: '6.4 Retroalimentación',
        body: 'Si el Cliente proporciona sugerencias, ideas o comentarios sobre el Servicio, KultuRH podrá utilizarlos libremente para mejorar la plataforma sin obligación de compensación.',
      },
    ],
  },
  {
    id: 'privacidad-datos',
    title: '7. Privacidad y protección de datos',
    content: [
      {
        subtitle: '7.1 Tratamiento de datos',
        body: 'El tratamiento de datos personales se rige por nuestra Política de Privacidad, disponible en /privacidad, que forma parte integral de estos Términos. El Cliente, en su calidad de responsable del tratamiento de los datos de sus empleados y candidatos, garantiza que cuenta con las bases legales necesarias para el tratamiento de dichos datos en KultuRH.',
      },
      {
        subtitle: '7.2 Acuerdo de tratamiento de datos',
        body: 'KultuRH actúa como encargado del tratamiento respecto de los datos personales de los empleados y candidatos del Cliente. En su condición de encargado, KultuRH se compromete a: tratar los datos únicamente según las instrucciones documentadas del Cliente; implementar medidas técnicas y organizativas adecuadas; asistir al Cliente en el cumplimiento de sus obligaciones bajo la LOPDP; y eliminar o devolver los datos al término del contrato.',
      },
    ],
  },
  {
    id: 'limitacion-responsabilidad',
    title: '8. Limitación de responsabilidad',
    content: [
      {
        subtitle: '8.1 Exclusión de garantías',
        body: 'El Servicio se presta "tal como está" y "según disponibilidad". KultuRH no otorga garantías, expresas o implícitas, sobre la idoneidad para un propósito particular, la exactitud de los resultados de las evaluaciones psicométricas, la adecuación de los candidatos presentados o la continuidad ininterrumpida del Servicio.',
      },
      {
        subtitle: '8.2 Límite de responsabilidad',
        body: 'En la máxima medida permitida por la legislación ecuatoriana aplicable, la responsabilidad total de KultuRH por cualquier reclamación derivada del uso del Servicio estará limitada al monto total pagado por el Cliente durante los 12 meses anteriores al evento que originó la reclamación. En ningún caso KultuRH será responsable por daños indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo pérdida de beneficios o datos.',
      },
      {
        subtitle: '8.3 Responsabilidad del Cliente',
        body: 'El Cliente es exclusivamente responsable de las decisiones de contratación, gestión de personal y cualquier otro acto derivado del uso de la información generada por KultuRH. Los resultados de las evaluaciones psicométricas y los perfiles de cultura organizacional son herramientas de apoyo a la decisión y no determinan por sí solos la idoneidad de un candidato o empleado.',
      },
    ],
  },
  {
    id: 'indemnizacion',
    title: '9. Indemnización',
    content: [
      {
        subtitle: '',
        body: 'El Cliente se compromete a indemnizar, defender y mantener indemne a KultuRH, sus directivos, empleados y socios frente a cualquier reclamación, daño, pérdida, costo o gasto (incluidos honorarios legales razonables) derivados de: (a) el uso del Servicio por parte del Cliente o sus usuarios; (b) el incumplimiento de estos Términos; (c) la violación de derechos de terceros; o (d) el contenido publicado por el Cliente en la plataforma.',
      },
    ],
  },
  {
    id: 'confidencialidad',
    title: '10. Confidencialidad',
    content: [
      {
        subtitle: '',
        body: 'Cada parte se compromete a mantener confidencial cualquier información de la otra parte que sea designada como confidencial o que, dadas las circunstancias, deba razonablemente entenderse como tal. Esta obligación no aplica a información que: sea de dominio público sin culpa de la parte receptora; haya sido conocida con anterioridad a su divulgación; haya sido obtenida legítimamente de un tercero sin restricciones; o deba divulgarse por mandato legal o resolución judicial.',
      },
    ],
  },
  {
    id: 'ley-aplicable',
    title: '11. Ley aplicable y resolución de controversias',
    content: [
      {
        subtitle: '11.1 Ley aplicable',
        body: 'Estos Términos se rigen e interpretan conforme a las leyes de la República del Ecuador, incluyendo el Código de Comercio, la Ley de Comercio Electrónico, Firmas y Mensajes de Datos, la Ley Orgánica de Protección de Datos Personales (LOPDP) y demás normativa aplicable.',
      },
      {
        subtitle: '11.2 Resolución de controversias',
        body: 'En caso de controversia derivada de estos Términos, las partes se comprometen a intentar resolverla amistosamente en un plazo de 30 días desde la notificación del conflicto. De no alcanzarse un acuerdo, las controversias se someterán a la jurisdicción de los tribunales competentes de la ciudad de Quito, Ecuador, renunciando las partes a cualquier otro fuero que pudiera corresponderles.',
      },
      {
        subtitle: '11.3 Divisibilidad',
        body: 'Si alguna disposición de estos Términos fuera declarada inválida o inaplicable por un tribunal competente, dicha disposición se modificará en la medida mínima necesaria para hacerla válida, y las demás disposiciones continuarán en plena vigencia.',
      },
    ],
  },
  {
    id: 'disposiciones-generales',
    title: '12. Disposiciones generales',
    content: [
      {
        subtitle: '12.1 Acuerdo completo',
        body: 'Estos Términos, junto con la Política de Privacidad y cualquier acuerdo de nivel de servicio (SLA) aplicable, constituyen el acuerdo completo entre las partes respecto al uso del Servicio y sustituyen cualquier acuerdo o entendimiento previo.',
      },
      {
        subtitle: '12.2 No renuncia',
        body: 'El hecho de que KultuRH no ejerza o haga valer algún derecho o disposición de estos Términos no constituirá una renuncia a dicho derecho o disposición.',
      },
      {
        subtitle: '12.3 Notificaciones',
        body: 'Las notificaciones a KultuRH deberán enviarse a info@kulturh.app. Las notificaciones al Cliente se enviarán al correo electrónico registrado en la cuenta. Las notificaciones se considerarán recibidas 24 horas después de su envío por correo electrónico.',
      },
      {
        subtitle: '12.4 Contacto',
        body: 'Para cualquier consulta sobre estos Términos, puede contactarnos en:\n\nKultuRH\nCorreo electrónico: info@kulturh.app\nAsunto: "Consulta sobre Términos y Condiciones"',
      },
    ],
  },
];

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function TerminosPage() {
  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; font-family: ${FF}; color: ${C.text}; -webkit-font-smoothing: antialiased; }
        .term-nav-link:hover { opacity: 0.75; }
        .term-toc-link { color: ${C.primary}; text-decoration: none; font-size: 13px; line-height: 1.7; display: block; padding: 3px 0; transition: color 0.15s; }
        .term-toc-link:hover { color: ${C.primaryLight}; text-decoration: underline; }
        .term-section { animation: fadeIn 0.35s ease both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .term-layout { flex-direction: column !important; }
          .term-sidebar { display: none !important; }
          .term-main { padding: 24px 16px !important; }
        }
      `}</style>

      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        boxShadow: C.shadow,
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          padding: '0 24px',
          height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <Link href="/vacantes" className="term-nav-link" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            textDecoration: 'none',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: `linear-gradient(135deg, ${C.primary} 0%, #5580FF 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 2px 8px ${C.primaryGlow}`,
            }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: FF }}>K</span>
            </div>
            <span style={{ fontFamily: FF, fontWeight: 700, fontSize: 18, color: C.text, letterSpacing: '-0.3px' }}>
              KultuRH
            </span>
          </Link>

          {/* Back link */}
          <Link href="/vacantes" className="term-nav-link" style={{
            textDecoration: 'none',
            color: C.primary,
            fontFamily: FF,
            fontSize: 14,
            fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Volver a vacantes
          </Link>
        </div>
      </nav>

      {/* Page body */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: C.secondaryDim, borderRadius: 20,
            padding: '4px 14px', marginBottom: 16,
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm1 3h6M5 8h6M5 11h4" stroke={C.secondary} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ color: C.secondary, fontFamily: FF, fontSize: 12, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Legal
            </span>
          </div>
          <h1 style={{ fontFamily: FF, fontWeight: 700, fontSize: 32, color: C.text, lineHeight: 1.2, marginBottom: 12 }}>
            Términos y Condiciones
          </h1>
          <p style={{ fontFamily: FF, fontSize: 15, color: C.textSecondary, lineHeight: 1.6 }}>
            Última actualización: marzo de 2026 &nbsp;·&nbsp; KultuRH &nbsp;·&nbsp;
            <a href="mailto:info@kulturh.app" style={{ color: C.primary, textDecoration: 'none' }}>info@kulturh.app</a>
          </p>
          <p style={{ fontFamily: FF, fontSize: 14, color: C.textMuted, lineHeight: 1.7, marginTop: 16, maxWidth: 720 }}>
            Estos Términos y Condiciones regulan el acceso y uso de la plataforma KultuRH. Al utilizar el Servicio, usted acepta quedar vinculado por los presentes Términos. Si tiene alguna pregunta, no dude en contactarnos en{' '}
            <a href="mailto:info@kulturh.app" style={{ color: C.primary, textDecoration: 'none' }}>info@kulturh.app</a>.
          </p>
        </div>

        {/* Layout: sidebar TOC + main content */}
        <div className="term-layout" style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
          {/* Sidebar Table of Contents */}
          <aside className="term-sidebar" style={{
            width: 240, flexShrink: 0,
            position: 'sticky', top: 80,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '20px',
            boxShadow: C.shadow,
          }}>
            <p style={{ fontFamily: FF, fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 12 }}>
              Contenido
            </p>
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="term-toc-link">
                {s.title}
              </a>
            ))}
          </aside>

          {/* Main content */}
          <main className="term-main" style={{ flex: 1, minWidth: 0 }}>
            {SECTIONS.map((section, idx) => (
              <section
                key={section.id}
                id={section.id}
                className="term-section"
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: '28px 32px',
                  marginBottom: 20,
                  animationDelay: `${idx * 0.03}s`,
                }}
              >
                <h2 style={{
                  fontFamily: FF, fontWeight: 700, fontSize: 18, color: C.text,
                  marginBottom: 20, paddingBottom: 14,
                  borderBottom: `1px solid ${C.borderLight}`,
                  lineHeight: 1.3,
                }}>
                  {section.title}
                </h2>
                {section.content.map((block, bIdx) => (
                  <div key={bIdx} style={{ marginBottom: bIdx < section.content.length - 1 ? 20 : 0 }}>
                    {block.subtitle && (
                      <h3 style={{
                        fontFamily: FF, fontWeight: 600, fontSize: 14, color: C.text,
                        marginBottom: 8,
                      }}>
                        {block.subtitle}
                      </h3>
                    )}
                    <p style={{
                      fontFamily: FF, fontSize: 14, color: C.textSecondary,
                      lineHeight: 1.75, whiteSpace: 'pre-line',
                    }}>
                      {block.body}
                    </p>
                  </div>
                ))}
              </section>
            ))}

            {/* Footer note */}
            <div style={{
              background: C.secondaryDim,
              border: `1px solid rgba(20,184,166,0.2)`,
              borderRadius: 12,
              padding: '20px 24px',
              display: 'flex', gap: 14, alignItems: 'flex-start',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="10" cy="10" r="9" stroke={C.secondary} strokeWidth="1.5"/>
                <path d="M10 9v5M10 6.5v.5" stroke={C.secondary} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p style={{ fontFamily: FF, fontSize: 13, color: C.textSecondary, lineHeight: 1.7 }}>
                Al usar KultuRH, confirma que ha leído y acepta estos Términos y Condiciones. Para dudas legales, escriba a{' '}
                <a href="mailto:info@kulturh.app" style={{ color: C.primary, fontWeight: 600, textDecoration: 'none' }}>info@kulturh.app</a>.
                También puede consultar nuestra{' '}
                <Link href="/privacidad" style={{ color: C.primary, fontWeight: 600, textDecoration: 'none' }}>Política de Privacidad</Link>.
              </p>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${C.border}`,
        background: C.surface,
        padding: '24px',
        textAlign: 'center',
      }}>
        <p style={{ fontFamily: FF, fontSize: 13, color: C.textMuted }}>
          © {new Date().getFullYear()} KultuRH · Todos los derechos reservados ·{' '}
          <Link href="/privacidad" style={{ color: C.primary, textDecoration: 'none' }}>Privacidad</Link>
          {' '}·{' '}
          <Link href="/terminos" style={{ color: C.primary, textDecoration: 'none' }}>Términos</Link>
        </p>
      </footer>
    </>
  );
}
