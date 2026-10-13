import type { Metadata } from "next";
import type { ReactNode } from "react";
import { API_ERRORS } from "@rutasegura/contracts";
import {
  ButtonLink,
  Card,
  CardTitle,
  Chip,
  Grid,
  Muted,
  Page,
  PageIntro,
  type Tone,
} from "@/components/ui";

export const metadata: Metadata = { title: "Estados y errores" };

type StateCard = {
  id: string;
  title: string;
  description: string;
  chip?: { tone: Tone; label: string };
  action?: ReactNode;
};

/**
 * Catálogo de respuestas seguras (vista 4 de Figma). Los mensajes salen de los
 * mismos códigos que usa la API, así que lo que se ve aquí es lo que ve el usuario.
 */
const STATES: StateCard[] = [
  {
    id: "ok",
    title: "Consulta válida",
    description: "Estado mínimo, ciudad y fecha de cada evento. Sin datos del destinatario.",
    chip: { tone: "success", label: "200 ok" },
  },
  {
    id: "unverifiable",
    title: "Datos no verificables",
    description: `"${API_ERRORS.tracking_not_found.message}" Guía inexistente y segundo dato incorrecto responden igual.`,
    chip: { tone: "danger", label: "404 uniforme" },
  },
  {
    id: "unauthorized",
    title: "Sesión no verificable",
    description: `"${API_ERRORS.unauthorized.message}" Te pedimos iniciar sesión otra vez, sin decir por qué falló.`,
    chip: { tone: "danger", label: "401 uniforme" },
  },
  {
    id: "forbidden",
    title: "Recurso ajeno",
    description: `"${API_ERRORS.not_found.message}" Un envío o documento ajeno se ve igual que uno inexistente, y el intento queda en el log de seguridad.`,
    chip: { tone: "danger", label: "404 + auditoría" },
  },
  {
    id: "rate-limited",
    title: "Demasiados intentos",
    description:
      'Espera visible: "Vuelve a intentar en 02:00", calculada con la cabecera Retry-After.',
    chip: { tone: "warning", label: "429 + Retry-After" },
  },
  {
    id: "expired-link",
    title: "Enlace expirado",
    description:
      "La URL firmada de un documento dura 60 s. Al vencer, el almacenamiento responde 403 y te ofrecemos generar una nueva.",
    action: (
      <ButtonLink href="/portal/documentos" variant="soft">
        Generar enlace
      </ButtonLink>
    ),
  },
  {
    id: "empty",
    title: "Sin envíos",
    description: "Estado vacío con acceso directo al rastreo seguro, sin asumir un error.",
    action: (
      <ButtonLink href="/rastreo" variant="soft">
        Rastrear guía
      </ButtonLink>
    ),
  },
];

export default function StatesPage() {
  return (
    <Page>
      <PageIntro
        eyebrow="Estados obligatorios · RNF-07 / RNF-08"
        title="Panel de estados y respuestas seguras"
        description="Los casos de error son parte del diseño. Informan qué hacer sin filtrar la existencia de cuentas, guías ni recursos."
      />
      <Grid columns={2}>
        {STATES.map((state) => (
          <Card key={state.id} as="article" labelledBy={`state-${state.id}`}>
            <CardTitle id={`state-${state.id}`} level={2}>
              {state.title}
            </CardTitle>
            <Muted>{state.description}</Muted>
            {state.chip ? (
              <div>
                <Chip tone={state.chip.tone} dot={false}>
                  {state.chip.label}
                </Chip>
              </div>
            ) : null}
            {state.action}
          </Card>
        ))}
      </Grid>
    </Page>
  );
}
