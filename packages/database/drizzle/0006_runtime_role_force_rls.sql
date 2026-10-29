-- Runtime no dueño: la app conecta como rutasegura_app (sin BYPASSRLS).
-- Las migraciones y la semilla siguen con el dueño. FORCE RLS aplica las
-- políticas también al dueño (no al superusuario).
DO $$
BEGIN
  CREATE ROLE rutasegura_app WITH
    LOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOBYPASSRLS
    PASSWORD 'local_only_change_me_app';
EXCEPTION
  WHEN duplicate_object THEN
    -- No tocar la contraseña: en producción se fijó fuera de la migración.
    ALTER ROLE rutasegura_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
END
$$;--> statement-breakpoint
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shipments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shipment_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shipment_audit_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "documents" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO rutasegura_app;--> statement-breakpoint
GRANT USAGE ON TYPE "public"."user_role" TO rutasegura_app;--> statement-breakpoint
GRANT USAGE ON TYPE "public"."auth_event_type" TO rutasegura_app;--> statement-breakpoint
GRANT USAGE ON TYPE "public"."shipment_status" TO rutasegura_app;--> statement-breakpoint
GRANT USAGE ON TYPE "public"."shipment_audit_event_type" TO rutasegura_app;--> statement-breakpoint
GRANT USAGE ON TYPE "public"."notification_kind" TO rutasegura_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "users" TO rutasegura_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "sessions" TO rutasegura_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "auth_events" TO rutasegura_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "shipments" TO rutasegura_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "shipment_events" TO rutasegura_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "shipment_audit_events" TO rutasegura_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "documents" TO rutasegura_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "notifications" TO rutasegura_app;--> statement-breakpoint
-- Auth sin políticas en 0005: sin estas el rol no dueño no puede autenticar.
-- Solo rutasegura_app; anon/authenticated de Supabase siguen sin acceso.
CREATE POLICY "users_app_all" ON "users" AS PERMISSIVE FOR ALL TO rutasegura_app USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sessions_app_all" ON "sessions" AS PERMISSIVE FOR ALL TO rutasegura_app USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "auth_events_app_all" ON "auth_events" AS PERMISSIVE FOR ALL TO rutasegura_app USING (true) WITH CHECK (true);
