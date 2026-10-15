"use client";

import { useState, type FormEvent } from "react";
import { PASSWORD_MIN_LENGTH, registerRequestSchema } from "@rutasegura/contracts";
import { IconCheck } from "@/components/icons";
import { Button, ButtonLink, Field, Form, Muted } from "@/components/ui";
import { apiRequest } from "@/lib/api-client";
import {
  ApiErrorAlert,
  useRateLimitActive,
  type ApiFailure,
} from "@/features/shared/api-error-alert";
import { PasswordField } from "./password-field";
import styles from "./auth.module.css";

type Errors = Partial<Record<"fullName" | "email" | "password", string>>;

export function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const limited = useRateLimitActive(failure);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = registerRequestSchema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      const fields = new Set(parsed.error.issues.map((issue) => issue.path[0]));
      setErrors({
        fullName: fields.has("fullName") ? "Escribe tu nombre (2 a 120 caracteres)." : undefined,
        email: fields.has("email") ? "Escribe un correo válido." : undefined,
        password: fields.has("password")
          ? `Usa de ${PASSWORD_MIN_LENGTH} a 128 caracteres. Evita contraseñas comunes o tu correo.`
          : undefined,
      });
      return;
    }
    setErrors({});
    setPending(true);
    const result = await apiRequest<{ status: "accepted" }>("/api/v1/auth/register", {
      method: "POST",
      body: parsed.data,
      refreshOnUnauthorized: false,
    });
    setPending(false);
    if (result.ok) {
      setDone(true);
      setPassword("");
    } else {
      setFailure({ ...result, at: Date.now() });
    }
  }

  if (done) {
    return (
      <div className={styles.success} role="status">
        <span className={styles.successIcon}>
          <IconCheck size={28} />
        </span>
        <p>
          <strong>Recibimos tu registro.</strong> Si el correo es válido, ya puedes iniciar sesión.
        </p>
        <ButtonLink href="/ingresar" variant="primary" block>
          Iniciar sesión
        </ButtonLink>
      </div>
    );
  }

  return (
    <Form onSubmit={onSubmit} label="Crear cuenta">
      <Field
        id="fullName"
        label="Nombre completo"
        name="fullName"
        autoComplete="name"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        error={errors.fullName}
        required
      />
      <Field
        id="email"
        label="Correo electrónico"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="tu@correo.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors.email}
        required
      />
      <PasswordField
        id="password"
        label="Contraseña"
        name="password"
        autoComplete="new-password"
        hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres. Una frase larga es fácil de recordar y difícil de adivinar.`}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.password}
        required
      />
      <ApiErrorAlert failure={failure} context="register" />
      <Button type="submit" block disabled={pending || limited} loading={pending}>
        {pending ? "Creando…" : "Crear cuenta"}
      </Button>
      <Muted small>Es gratis. Solo usamos tu correo para que entres a tu cuenta.</Muted>
    </Form>
  );
}
