'use client';

import Link from 'next/link';
import { C, FF, KEYFRAMES } from '@/lib/tokens';

/* ─── Section data ───────────────────────────────────────────────────────── */
const SECTIONS = [
  {
    id: 'datos-recopilados',
    title: '1. Datos personales que recopilamos',
    content: [
      {
        subtitle: '1.1 Datos proporcionados directamente',
        body: 'Al registrarse y usar KultuRH, recopilamos: nombre completo, dirección de correo electrónico, número de teléfono, cargo y empresa. Para candidatos que postulan a vacantes: currículum vítae, historial laboral, formación académica, habilidades y competencias declaradas.',
      },
      {
        subtitle: '1.2 Datos generados por el uso de la plataforma',
        body: 'Registros de acceso (dirección IP, navegador, sistema operativo, hora y fecha de conexión), interacciones dentro de la plataforma (módulos consultados, acciones realizadas), resultados de evaluaciones psicométricas 16PF, perfiles de cultura organizacional generados, reconocimientos (momentos) emitidos y recibidos, y datos de configuración de espacios de trabajo (workspaces).',
      },
      {
        subtitle: '1.3 Datos de facturación',
        body: 'En caso de contratación de planes de pago: razón social, RUC, dirección fiscal y datos de método de pago. Los datos de tarjetas bancarias son procesados directamente por nuestro proveedor de pagos y nunca son almacenados en los servidores de KultuRH.',
      },
    ],
  },
  {
    id: 'uso-de-datos',
    title: '2. Finalidad y uso de los datos',
    content: [
      {
        subtitle: '2.1 Prestación del servicio',
        body: 'Utilizamos sus datos para: crear y gestionar cuentas de usuario y espacios de trabajo; publicar y administrar vacantes de empleo; procesar postulaciones de candidatos; generar evaluaciones psicométricas y perfiles de cultura organizacional; facilitar el reconocimiento entre colaboradores; y enviar notificaciones operativas del servicio.',
      },
      {
        subtitle: '2.2 Mejora del servicio',
        body: 'Analizamos de forma agregada y anonimizada el uso de la plataforma para identificar áreas de mejora, detectar errores técnicos y desarrollar nuevas funcionalidades. En ningún caso vendemos datos personales a terceros ni los utilizamos con fines publicitarios ajenos al servicio.',
      },
      {
        subtitle: '2.3 Cumplimiento legal',
        body: 'Podemos tratar sus datos para cumplir obligaciones legales aplicables en Ecuador, incluyendo requerimientos de autoridades competentes cuando exista mandato legal expreso conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP).',
      },
      {
        subtitle: '2.4 Comunicaciones',
        body: 'Con su consentimiento, podemos enviarle comunicaciones sobre actualizaciones del producto, nuevas funcionalidades y contenido relevante para la gestión del talento humano. Puede revocar este consentimiento en cualquier momento desde la configuración de su cuenta o escribiendo a info@kulturh.app.',
      },
    ],
  },
  {
    id: 'almacenamiento',
    title: '3. Almacenamiento y seguridad de los datos',
    content: [
      {
        subtitle: '3.1 Infraestructura',
        body: 'KultuRH utiliza Supabase como plataforma de base de datos y autenticación, respaldado por Amazon Web Services (AWS) con servidores ubicados en la región us-east-1 (Virginia del Norte, EE.UU.). Todos los datos se transmiten mediante cifrado TLS 1.2 o superior y se almacenan con cifrado en reposo (AES-256).',
      },
      {
        subtitle: '3.2 Medidas de seguridad',
        body: 'Implementamos controles de acceso basados en roles (RBAC) a nivel de base de datos mediante Row Level Security (RLS) de PostgreSQL; autenticación multifactor disponible para todos los usuarios; auditorías periódicas de acceso; y políticas de retención y eliminación segura de datos. Sin embargo, ningún sistema de transmisión o almacenamiento electrónico es 100 % seguro; en caso de brecha de seguridad que afecte sus datos, le notificaremos en los plazos previstos por la LOPDP.',
      },
      {
        subtitle: '3.3 Retención de datos',
        body: 'Conservamos los datos personales mientras su cuenta permanezca activa. Tras la cancelación de la cuenta o la solicitud de eliminación, eliminamos o anonimizamos los datos en un plazo máximo de 90 días, salvo obligación legal de conservación más extensa. Los datos de candidatos en procesos de selección se conservan durante el período activo de la vacante y hasta 12 meses adicionales, salvo instrucción contraria del empleador responsable.',
      },
    ],
  },
  {
    id: 'cookies',
    title: '4. Cookies y tecnologías de rastreo',
    content: [
      {
        subtitle: '4.1 Cookies esenciales',
        body: 'Utilizamos cookies estrictamente necesarias para el funcionamiento de la plataforma: tokens de sesión de autenticación, preferencias de interfaz y configuraciones de workspace. Estas cookies no pueden desactivarse sin afectar la funcionalidad del servicio.',
      },
      {
        subtitle: '4.2 Cookies analíticas',
        body: 'Con su consentimiento, utilizamos herramientas de análisis de uso (como Vercel Analytics) que recopilan datos anonimizados sobre navegación dentro de la plataforma para mejorar la experiencia de usuario. No empleamos cookies de seguimiento publicitario de terceros.',
      },
      {
        subtitle: '4.3 Gestión de cookies',
        body: 'Puede configurar su navegador para rechazar o eliminar cookies en cualquier momento. Tenga en cuenta que deshabilitar las cookies esenciales puede impedir el correcto funcionamiento de la plataforma.',
      },
    ],
  },
  {
    id: 'transferencias',
    title: '5. Transferencia internacional de datos',
    content: [
      {
        subtitle: '5.1 Proveedores de servicios',
        body: 'Para operar KultuRH, compartimos datos con proveedores de servicios de confianza que actúan como encargados del tratamiento bajo nuestras instrucciones: Supabase Inc. (infraestructura de base de datos), Amazon Web Services (computación en la nube), Vercel Inc. (alojamiento de la aplicación) y proveedores de servicios de correo electrónico transaccional. Todos estos proveedores cuentan con políticas de privacidad y certificaciones de seguridad adecuadas.',
      },
      {
        subtitle: '5.2 Base legal para transferencias',
        body: 'Las transferencias internacionales de datos se realizan con base en cláusulas contractuales estándar y las garantías adecuadas previstas en el artículo 55 de la LOPDP y su reglamento de aplicación. No vendemos, arrendamos ni compartimos sus datos personales con terceros para fines comerciales propios de esos terceros.',
      },
    ],
  },
  {
    id: 'derechos',
    title: '6. Derechos de los titulares de datos',
    content: [
      {
        subtitle: '6.1 Sus derechos bajo la LOPDP',
        body: 'Conforme a la Ley Orgánica de Protección de Datos Personales del Ecuador (Registro Oficial Suplemento 459, 26 de mayo de 2021) y su reglamento, usted tiene derecho a: (a) Acceso — conocer qué datos personales suyos tratamos; (b) Rectificación — corregir datos inexactos o incompletos; (c) Eliminación — solicitar la supresión de sus datos cuando hayan dejado de ser necesarios; (d) Oposición — oponerse al tratamiento de sus datos para finalidades específicas; (e) Portabilidad — recibir sus datos en formato estructurado y de uso común; (f) Limitación — solicitar la restricción del tratamiento en determinadas circunstancias; (g) No ser objeto de decisiones automatizadas — incluyendo elaboración de perfiles con efectos jurídicos significativos.',
      },
      {
        subtitle: '6.2 Cómo ejercer sus derechos',
        body: 'Para ejercer cualquiera de estos derechos, envíe una solicitud escrita a info@kulturh.app indicando: su nombre completo, dirección de correo electrónico registrada, descripción del derecho que desea ejercer y documentación de identidad. Responderemos en un plazo máximo de 15 días hábiles. Si no queda satisfecho con nuestra respuesta, puede presentar una reclamación ante la Autoridad de Protección de Datos Personales del Ecuador.',
      },
    ],
  },
  {
    id: 'menores',
    title: '7. Datos de menores de edad',
    content: [
      {
        subtitle: '',
        body: 'KultuRH es una plataforma destinada exclusivamente a empresas y profesionales mayores de 18 años. No recopilamos conscientemente datos personales de menores de edad. Si tiene conocimiento de que un menor ha proporcionado datos en nuestra plataforma sin el consentimiento de su representante legal, le pedimos que nos lo comunique a info@kulturh.app para proceder a su eliminación inmediata.',
      },
    ],
  },
  {
    id: 'cambios',
    title: '8. Cambios a esta política',
    content: [
      {
        subtitle: '',
        body: 'Podemos actualizar esta Política de Privacidad periódicamente para reflejar cambios en nuestras prácticas o en la legislación aplicable. Notificaremos los cambios materiales con al menos 30 días de anticipación mediante correo electrónico o aviso destacado en la plataforma. El uso continuado del servicio tras la entrada en vigor de los cambios implicará la aceptación de la política actualizada.',
      },
    ],
  },
  {
    id: 'contacto',
    title: '9. Contacto y responsable del tratamiento',
    content: [
      {
        subtitle: '',
        body: 'El responsable del tratamiento de sus datos personales es KultuRH. Para cualquier consulta, solicitud o reclamación relacionada con el tratamiento de sus datos personales, puede contactarnos en:\n\nCorreo electrónico: info@kulturh.app\nAsunto: "Protección de datos personales"\n\nNos comprometemos a dar respuesta en un plazo máximo de 15 días hábiles.',
      },
    ],
  },
];

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function PrivacidadPage() {
  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; font-family: ${FF}; color: ${C.text}; -webkit-font-smoothing: antialiased; }
        .priv-nav-link:hover { opacity: 0.75; }
        .priv-toc-link { color: ${C.primary}; text-decoration: none; font-size: 14px; line-height: 1.7; display: block; padding: 3px 0; transition: color 0.15s; }
        .priv-toc-link:hover { color: ${C.primaryLight}; text-decoration: underline; }
        .priv-section { animation: fadeIn 0.35s ease both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .priv-layout { flex-direction: column !important; }
          .priv-sidebar { display: none !important; }
          .priv-main { padding: 24px 16px !important; }
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
          <Link href="/vacantes" className="priv-nav-link" style={{
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
          <Link href="/vacantes" className="priv-nav-link" style={{
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
            background: C.primaryDim, borderRadius: 20,
            padding: '4px 14px', marginBottom: 16,
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1a5 5 0 0 0-5 5v1H2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1V6a5 5 0 0 0-5-5zm3 6H5V6a3 3 0 1 1 6 0v1z" fill={C.primary}/>
            </svg>
            <span style={{ color: C.primary, fontFamily: FF, fontSize: 12, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Privacidad
            </span>
          </div>
          <h1 style={{ fontFamily: FF, fontWeight: 700, fontSize: 32, color: C.text, lineHeight: 1.2, marginBottom: 12 }}>
            Política de Privacidad
          </h1>
          <p style={{ fontFamily: FF, fontSize: 15, color: C.textSecondary, lineHeight: 1.6 }}>
            Última actualización: marzo de 2026 &nbsp;·&nbsp; KultuRH &nbsp;·&nbsp;
            <a href="mailto:info@kulturh.app" style={{ color: C.primary, textDecoration: 'none' }}>info@kulturh.app</a>
          </p>
          <p style={{ fontFamily: FF, fontSize: 14, color: C.textMuted, lineHeight: 1.7, marginTop: 16, maxWidth: 720 }}>
            En KultuRH nos comprometemos a proteger su privacidad y a tratar sus datos personales con transparencia y responsabilidad, de conformidad con la{' '}
            <strong style={{ color: C.textSecondary }}>Ley Orgánica de Protección de Datos Personales (LOPDP)</strong> del Ecuador y demás normativa aplicable.
            Le invitamos a leer detenidamente esta política antes de usar nuestra plataforma.
          </p>
        </div>

        {/* Layout: sidebar TOC + main content */}
        <div className="priv-layout" style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
          {/* Sidebar Table of Contents */}
          <aside className="priv-sidebar" style={{
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
              <a key={s.id} href={`#${s.id}`} className="priv-toc-link">
                {s.title}
              </a>
            ))}
          </aside>

          {/* Main content */}
          <main className="priv-main" style={{ flex: 1, minWidth: 0, padding: '0 0 0 0' }}>
            {SECTIONS.map((section, idx) => (
              <section
                key={section.id}
                id={section.id}
                className="priv-section"
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: '28px 32px',
                  marginBottom: 20,
                  animationDelay: `${idx * 0.04}s`,
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
              background: C.primaryDim,
              border: `1px solid ${C.primaryGlow}`,
              borderRadius: 12,
              padding: '20px 24px',
              display: 'flex', gap: 14, alignItems: 'flex-start',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="10" cy="10" r="9" stroke={C.primary} strokeWidth="1.5"/>
                <path d="M10 9v5M10 6.5v.5" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p style={{ fontFamily: FF, fontSize: 13, color: C.textSecondary, lineHeight: 1.7 }}>
                Esta política aplica a todos los datos tratados por KultuRH en el contexto de la prestación de sus servicios de gestión del talento humano. Para dudas específicas sobre el tratamiento de sus datos, contacte a{' '}
                <a href="mailto:info@kulturh.app" style={{ color: C.primary, fontWeight: 600, textDecoration: 'none' }}>info@kulturh.app</a>.
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
