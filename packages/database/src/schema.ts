import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgEnum,
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

export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    trackingNumber: text("tracking_number").notNull(),
    recipientName: text("recipient_name").notNull(),
    recipientPhoneLast4Hmac: text("recipient_phone_last4_hmac").notNull(),
    status: shipmentStatus("status").notNull().default("created"),
    windowDate: date("window_date"),
    windowSlot: text("window_slot"),
    createdAt,
  },
  (table) => [
    uniqueIndex("shipments_tracking_number_unique").on(table.trackingNumber),
    uniqueIndex("shipments_public_id_unique").on(table.publicId),
    index("shipments_owner_idx").on(table.ownerId),
    check(
      "shipments_window_slot_allowed",
      sql`${table.windowSlot} is null or ${table.windowSlot} in ('08-10', '10-12', '12-14', '14-16', '16-18')`,
    ),
    check(
      "shipments_window_complete",
      sql`(${table.windowDate} is null) = (${table.windowSlot} is null)`,
    ),
  ],
);

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
  (table) => [index("shipment_events_shipment_idx").on(table.shipmentId, table.occurredAt)],
);

export const shipmentAuditType = pgEnum("shipment_audit_type", [
  "claimed",
  "scheduled",
  "rescheduled",
  "status_changed",
]);

/**
 * Bitácora de agenda y de estado. Sin guía, correo, IP ni nombre: solo ids
 * internos y el tipo de evento. Consultable por envío y por actor. Retención
 * prevista: 365 días (purga fuera de este sprint).
 */
export const shipmentAuditEvents = pgTable(
  "shipment_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    type: shipmentAuditType("type").notNull(),
    fromStatus: shipmentStatus("from_status"),
    toStatus: shipmentStatus("to_status"),
    createdAt,
  },
  (table) => [
    index("shipment_audit_shipment_idx").on(table.shipmentId, table.createdAt),
    index("shipment_audit_actor_idx").on(table.actorUserId, table.createdAt),
  ],
);

export const notificationKind = pgEnum("notification_kind", [
  "shipment_scheduled",
  "shipment_status_changed",
]);

/** Avisos simulados: el cuerpo es una plantilla fija, sin datos del envío. */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: notificationKind("kind").notNull(),
    body: text("body").notNull(),
    createdAt,
  },
  (table) => [index("notifications_user_idx").on(table.userId, table.createdAt)],
);
