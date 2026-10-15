"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { loginRequestSchema, type AuthUser } from "@rutasegura/contracts";
import { IconLock } from "@/components/icons";
import { Alert, Button, Field, Form, Spinner } from "@/components/ui";
import { apiRequest } from "@/lib/api-client";
import {
  ApiErrorAlert,
  useRateLimitActive,
  type ApiFailure,
} from "@/features/shared/api-error-alert";
import { PasswordField } from "./password-field";
import styles from "./auth.module.css";

export function LoginForm({ next, expired }: { next: string; expired: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [pending, setPending] = useState(false);
  const [restoring, setRestoring] = useState(expired);
  const limited = useRateLimitActive(failure);

  // Si el portal redirigió aquí porque venció el acceso corto, intenta renovar
  // la sesión antes de pedir credenciales.
  useEffect(() => {
    if (!expired) return;
    let cancelled = false;
    apiRequest<{ user: AuthUser }>("/api/v1/auth/refresh", {
      method: "POST",
      refreshOnUnauthorized: false,
    }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        router.replace(next);
        router.refresh();
      } else {
        setRestoring(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [expired, next, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = loginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setPending(true);
    const result = await apiRequest<{ user: AuthUser }>("/api/v1/auth/login", {
      method: "POST",
      body: parsed.data,
      refreshOnUnauthorized: false,
    });
    if (result.ok) {
      router.replace(next);
      router.refresh();
      return;
    }
    setPending(false);
    setFailure({ ...result, at: Date.now() });
  }

  if (restoring) {
    return (
      <Alert live>
        <span className={styles.note}>
          <Spinner />
          Recuperando tu sesión…
        </span>
      </Alert>
    );
  }

  return (
    <Form onSubmit={onSubmit} label="Iniciar sesión">
      {expired ? <Alert>Inicia sesión para continuar donde ibas.</Alert> : null}
      <Field
        id="email"
        label="Correo electrónico"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="tu@correo.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <PasswordField
        id="password"
        label="Contraseña"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      {invalid ? <Alert tone="error">Escribe un correo válido y tu contraseña.</Alert> : null}
      <ApiErrorAlert failure={failure} context="login" />
      <Button type="submit" block disabled={pending || limited} loading={pending}>
        {pending ? "Ingresando…" : "Iniciar sesión"}
      </Button>
      <p className={styles.note}>
        <IconLock size={16} />
        <span>Si fallas 5 veces seguidas, tu cuenta se pausa unos minutos para protegerla.</span>
      </p>
    </Form>
  );
}
