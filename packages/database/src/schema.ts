import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const userRole = pgEnum("user_role", ["customer", "operator", "admin"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("customer"),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockoutLevel: integer("lockout_level").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // El correo llega normalizado en minúsculas desde el contrato de registro.
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    check("users_email_lowercase", sql`${table.email} = lower(${table.email})`),
  ],
);

/**
 * Una fila por refresh token emitido. Al rotar, la fila vieja queda revocada y
 * apunta a su reemplazo; todas las de un mismo login comparten `family_id`.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    familyId: uuid("family_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    replacedBy: uuid("replaced_by"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt,
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_family_idx").on(table.familyId),
    index("sessions_user_idx").on(table.userId),
  ],
);

export const authEventType = pgEnum("auth_event_type", [
  "register_success",
  "register_duplicate",
  "login_success",
  "login_failure",
  "login_locked",
  "account_locked",
  "refresh",
  "refresh_reuse",
  "logout",
  "rate_limited",
  "tracking_success",
  "tracking_failure",
]);

/** Bitácora mínima: correo e IP solo como HMAC, nunca en claro. */
export const authEvents = pgTable(
  "auth_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: authEventType("type").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    subjectHash: text("subject_hash"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt,
  },
  (table) => [
    index("auth_events_user_idx").on(table.userId, table.createdAt),
    index("auth_events_type_idx").on(table.type, table.createdAt),
  ],
);

export const shipmentStatus = pgEnum("shipment_status", [
  "created",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "exception",
]);

/**
 * Contexto de RLS que el servidor fija por transacción con `set_config(..., true)`.
 * `app.mode` habilita los accesos que no dependen del dueño: rastreo público,
 * reclamo de una guía libre y cambios de estado del operador.
 */
const appUserId = sql`nullif(current_setting('app.user_id', true), '')::uuid`;
const appMode = sql`current_setting('app.mode', true)`;

export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** ULID expuesto por la API autenticada; se asigna al reclamar la guía. */
    publicId: text("public_id"),
    trackingNumber: text("tracking_number").notNull(),
    recipientName: text("recipient_name").notNull(),
    recipientPhoneLast4Hmac: text("recipient_phone_last4_hmac").notNull(),
    status: shipmentStatus("status").notNull().default("created"),
    /** `null` mientras nadie haya reclamado la guía. */
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    windowDate: date("window_date"),
    windowSlot: text("window_slot"),
    createdAt,
  },
  (table) => [
    uniqueIndex("shipments_tracking_number_unique").on(table.trackingNumber),
    uniqueIndex("shipments_public_id_unique").on(table.publicId),
    index("shipments_owner_idx").on(table.ownerId, table.createdAt),
    check(
      "shipments_window_slot_valid",
      sql`${table.windowSlot} is null or ${table.windowSlot} in ('08-10', '10-12', '12-14', '14-16', '16-18')`,
    ),
    check(
      "shipments_window_complete",
      sql`(${table.windowDate} is null) = (${table.windowSlot} is null)`,
    ),
    pgPolicy("shipments_select", {
      for: "select",
      using: sql`owner_id = ${appUserId} or ${appMode} in ('public_tracking', 'claim', 'operator')`,
    }),
    pgPolicy("shipments_update_owner", {
      for: "update",
      using: sql`owner_id = ${appUserId}`,
      withCheck: sql`owner_id = ${appUserId}`,
    }),
    pgPolicy("shipments_update_claim", {
      for: "update",
      using: sql`${appMode} = 'claim' and owner_id is null`,
      withCheck: sql`owner_id = ${appUserId}`,
    }),
    pgPolicy("shipments_update_operator", {
      for: "update",
      using: sql`${appMode} = 'operator'`,
      withCheck: sql`${appMode} = 'operator'`,
    }),
  ],
);

/**
 * Columnas que referencian un envío desde otra tabla. `sql.raw` solo recibe
 * estos literales fijos, así que ningún dato de una petición llega al SQL.
 */
type ShipmentReferenceColumn =
  "shipment_events.shipment_id" | "shipment_audit_events.shipment_id" | "documents.shipment_id";

/** Visible solo si el envío lo es: la subconsulta aplica la RLS de `shipments`. */
const shipmentVisible = (column: ShipmentReferenceColumn) =>
  // eslint-disable-next-line no-restricted-syntax -- identificador de un tipo literal cerrado, sin entrada externa.
  sql.raw(`exists (select 1 from shipments s where s.id = ${column})`);

export const shipmentEvents = pgTable(
  "shipment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    status: shipmentStatus("status").notNull(),
    city: text("city").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("shipment_events_shipment_idx").on(table.shipmentId, table.occurredAt),
    pgPolicy("shipment_events_select", {
      for: "select",
      using: shipmentVisible("shipment_events.shipment_id"),
    }),
    pgPolicy("shipment_events_insert_operator", {
      for: "insert",
      withCheck: sql`${appMode} = 'operator'`,
    }),
  ],
);

export const shipmentAuditEventType = pgEnum("shipment_audit_event_type", [
  "claimed",
  "scheduled",
  "rescheduled",
  "status_changed",
  "unscheduled",
  "document_url_issued",
]);

/**
 * Bitácora de envíos. Sin IP, correo, guía ni nombre: solo quién (id interno),
 * qué y cuándo. Retención prevista de 365 días.
 */
export const shipmentAuditEvents = pgTable(
  "shipment_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    type: shipmentAuditEventType("type").notNull(),
    fromStatus: shipmentStatus("from_status"),
    toStatus: shipmentStatus("to_status"),
    createdAt,
  },
  (table) => [
    index("shipment_audit_events_shipment_idx").on(table.shipmentId, table.createdAt),
    index("shipment_audit_events_actor_idx").on(table.actorUserId, table.createdAt),
    pgPolicy("shipment_audit_events_select", {
      for: "select",
      using: sql`actor_user_id = ${appUserId} or ${shipmentVisible("shipment_audit_events.shipment_id")}`,
    }),
    pgPolicy("shipment_audit_events_insert", {
      for: "insert",
      withCheck: shipmentVisible("shipment_audit_events.shipment_id"),
    }),
  ],
);

/**
 * Soportes de un envío guardados en el bucket privado. La fila solo guarda la
 * clave opaca del objeto, nunca una URL: cada descarga pide una URL firmada.
 * Tipos PDF, JPEG y PNG, de 10 MiB como máximo.
 */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** ULID expuesto por la API. */
    publicId: text("public_id").notNull(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    createdAt,
  },
  (table) => [
    uniqueIndex("documents_public_id_unique").on(table.publicId),
    uniqueIndex("documents_object_key_unique").on(table.objectKey),
    index("documents_shipment_idx").on(table.shipmentId, table.createdAt),
    check(
      "documents_mime_type_allowed",
      sql`${table.mimeType} in ('application/pdf', 'image/jpeg', 'image/png')`,
    ),
    check("documents_size_valid", sql`${table.sizeBytes} between 1 and 10485760`),
    check("documents_sha256_hex", sql`${table.sha256} ~ '^[0-9a-f]{64}$'`),
    check("documents_file_name_length", sql`char_length(${table.fileName}) between 1 and 160`),
    pgPolicy("documents_select", {
      for: "select",
      using: shipmentVisible("documents.shipment_id"),
    }),
    pgPolicy("documents_insert_operator", {
      for: "insert",
      withCheck: sql`${appMode} = 'operator'`,
    }),
  ],
);

export const notificationKind = pgEnum("notification_kind", [
  "shipment_scheduled",
  "shipment_rescheduled",
  "shipment_status_changed",
  "shipment_unscheduled",
]);

/** Avisos simulados. El cuerpo es una plantilla fija, sin datos del envío. */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: notificationKind("kind").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    index("notifications_user_idx").on(table.userId, table.createdAt),
    index("notifications_user_unread_idx")
      .on(table.userId)
      .where(sql`${table.readAt} is null`),
    pgPolicy("notifications_select", {
      for: "select",
      using: sql`user_id = ${appUserId}`,
    }),
    pgPolicy("notifications_update_owner", {
      for: "update",
      using: sql`user_id = ${appUserId}`,
      withCheck: sql`user_id = ${appUserId}`,
    }),
    pgPolicy("notifications_insert", {
      for: "insert",
      withCheck: sql`user_id = ${appUserId} or ${appMode} = 'operator'`,
    }),
  ],
);
