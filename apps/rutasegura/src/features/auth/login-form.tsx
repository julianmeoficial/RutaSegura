"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { loginRequestSchema, type AuthUser } from "@rutasegura/contracts";
import { Actions, Alert, Button, Field, Form, Muted } from "@/components/ui";
import { apiRequest } from "@/lib/api-client";
import {
  ApiErrorAlert,
  useRateLimitActive,
  type ApiFailure,
} from "@/features/shared/api-error-alert";

export function LoginForm({ next, expired }: { next: string; expired: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [pending, setPending] = useState(false);
  const [restoring, setRestoring] = useState(expired);
  const limited = useRateLimitActive(failure);

  // Si el portal redirigió aquí porque venció el JWT de 15 min, intenta renovar
  // la sesión con el refresh token (cookie HttpOnly) antes de pedir credenciales.
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
        <span>Recuperando tu sesión…</span>
      </Alert>
    );
  }

  return (
    <Form onSubmit={onSubmit} label="Iniciar sesión">
      {expired ? (
        <Alert>Inicia sesión para continuar. Si tu sesión venció, vuelve a ingresar.</Alert>
      ) : null}
      <Field
        id="email"
        label="Correo electrónico"
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <Field
        id="password"
        label="Contraseña"
        type="password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      {invalid ? <Alert tone="error">Escribe un correo válido y tu contraseña.</Alert> : null}
      <ApiErrorAlert failure={failure} context="login" />
      <Actions>
        <Button type="submit" disabled={pending || limited}>
          {pending ? "Ingresando…" : "Iniciar sesión"}
        </Button>
      </Actions>
      <Muted>
        ¿No tienes cuenta? <Link href="/registro">Crear una cuenta</Link>
      </Muted>
    </Form>
  );
}
