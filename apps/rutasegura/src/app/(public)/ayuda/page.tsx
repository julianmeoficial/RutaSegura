import type { Metadata } from "next";
import type { ShipmentStatus } from "@rutasegura/contracts";
import { IconChevronDown } from "@/components/icons";
import { ButtonLink, Chip, Page, PageIntro, StatusBand } from "@/components/ui";
import { STATUS_INFO, STATUS_LABEL } from "@/lib/format";
import styles from "./ayuda.module.css";

export const metadata: Metadata = { title: "Ayuda" };

const STATUSES: ShipmentStatus[] = [
  "created",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "exception",
];

const FAQS: { question: string; answer: string }[] = [
  {
    question: "¿Dónde encuentro mi número de guía?",
    answer:
      "Está en el comprobante que te dieron al enviar el paquete o en el mensaje de confirmación. Empieza por RS y le siguen 10 dígitos.",
  },
  {
    question: "¿Por qué me piden los últimos 4 dígitos del teléfono?",
    answer:
      "Así solo quien espera el paquete puede ver su estado. Son los últimos 4 dígitos del teléfono de la persona que lo recibe.",
  },
  {
    question: "Escribí bien los datos y no aparece mi envío",
    answer:
      "Revisa que la guía y los dígitos correspondan al mismo envío. Por seguridad, no decimos cuál de los dos no coincide. Si sigue sin aparecer, espera unos minutos: a veces el envío tarda en registrarse.",
  },
  {
    question: "Me aparece «Demasiados intentos»",
    answer:
      "Después de varios intentos seguidos, pausamos las consultas por unos minutos para proteger los envíos. Verás una cuenta regresiva; cuando termine, puedes volver a intentarlo.",
  },
  {
    question: "¿Cómo agrego un envío a mi cuenta?",
    answer:
      "Entra a Mis envíos y usa «Agregar un envío» con la guía y los 4 dígitos. Desde ese momento lo verás en tu cuenta y nadie más podrá agregarlo.",
  },
  {
    question: "¿Puedo elegir cuándo me entregan el paquete?",
    answer:
      "Sí. En Mis envíos, pulsa «Agendar» y elige un día hábil y una franja de dos horas. Puedes cambiarla o cancelarla mientras el paquete no haya salido a reparto.",
  },
  {
    question: "El enlace de un documento ya no funciona",
    answer:
      "Por seguridad, cada enlace de descarga dura un minuto. Vuelve a Documentos y pulsa «Generar enlace» para obtener uno nuevo.",
  },
  {
    question: "Mi sesión se cerró sola",
    answer:
      "Cerramos la sesión después de un tiempo sin uso o si detectamos algo extraño. Vuelve a iniciar sesión; tus envíos siguen ahí.",
  },
];

const PRIVACY: string[] = [
  "En el rastreo público solo mostramos el estado, la ciudad y la fecha de cada movimiento. La guía aparece tapada y nunca mostramos nombres, direcciones ni teléfonos.",
  "Pedimos los últimos 4 dígitos del teléfono para confirmar que quien consulta espera el paquete.",
  "Los documentos se descargan con enlaces que duran un minuto y solo funcionan dentro de tu cuenta.",
  "Tu sesión se cierra sola tras un tiempo sin uso. Puedes cerrarla desde Seguridad en cualquier momento.",
];

const TERMS: string[] = [
  "RutaSegura es un servicio de seguimiento: la información del envío la reporta la transportadora y puede tardar unos minutos en actualizarse.",
  "Una guía solo puede quedar vinculada a una cuenta. Si alguien más la vinculó primero, no podrás agregarla a la tuya.",
  "Para proteger los envíos, limitamos las consultas seguidas. Si ves «Demasiados intentos», espera la cuenta regresiva.",
  "Las franjas de entrega se pueden cambiar mientras el paquete no haya salido a reparto.",
];

export default function HelpPage() {
  return (
    <Page>
      <PageIntro
        eyebrow="Ayuda"
        title="¿Cómo podemos ayudarte?"
        description="Qué significa cada estado de tu envío, respuestas a las preguntas más comunes y cómo cuidamos tus datos."
      />

      <section aria-labelledby="estados" className={styles.section}>
        <h2 id="estados" className={styles.sectionTitle}>
          Estados de un envío
        </h2>
        <ol className={styles.statuses}>
          {STATUSES.map((status) => (
            <li key={status} className={styles.status}>
              <Chip tone={STATUS_LABEL[status].tone}>{STATUS_LABEL[status].label}</Chip>
              <div>
                <p className={styles.statusTitle}>{STATUS_INFO[status].headline}</p>
                <p className={styles.statusText}>{STATUS_INFO[status].description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="preguntas" className={styles.section}>
        <h2 id="preguntas" className={styles.sectionTitle}>
          Preguntas frecuentes
        </h2>
        <div className={styles.faqs}>
          {FAQS.map((faq) => (
            <details key={faq.question} className={styles.faq}>
              <summary className={styles.question}>
                <span>{faq.question}</span>
                <IconChevronDown size={20} className={styles.chevron} />
              </summary>
              <p className={styles.answer}>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <div className={styles.legal}>
        <section aria-labelledby="privacidad" className={styles.legalBlock}>
          <h2 id="privacidad" className={styles.sectionTitle}>
            Privacidad
          </h2>
          <ul className={styles.legalList}>
            {PRIVACY.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="terminos" className={styles.legalBlock}>
          <h2 id="terminos" className={styles.sectionTitle}>
            Términos de uso
          </h2>
          <ul className={styles.legalList}>
            {TERMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <StatusBand
        tone="ink"
        title="¿Listo para rastrear?"
        action={
          <ButtonLink href="/rastreo" variant="primary">
            Rastrear un envío
          </ButtonLink>
        }
      >
        Solo necesitas la guía y los últimos 4 dígitos del teléfono.
      </StatusBand>
    </Page>
  );
}
