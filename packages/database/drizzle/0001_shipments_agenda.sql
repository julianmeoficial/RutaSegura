CREATE TYPE "public"."notification_kind" AS ENUM('shipment_scheduled', 'shipment_rescheduled', 'shipment_status_changed');--> statement-breakpoint
CREATE TYPE "public"."shipment_audit_event_type" AS ENUM('claimed', 'scheduled', 'rescheduled', 'status_changed');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "shipment_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"type" "shipment_audit_event_type" NOT NULL,
	"from_status" "shipment_status",
	"to_status" "shipment_status",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shipment_audit_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shipment_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shipments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "public_id" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "window_date" date;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "window_slot" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_audit_events" ADD CONSTRAINT "shipment_audit_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_audit_events" ADD CONSTRAINT "shipment_audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "shipment_audit_events_shipment_idx" ON "shipment_audit_events" USING btree ("shipment_id","created_at");--> statement-breakpoint
CREATE INDEX "shipment_audit_events_actor_idx" ON "shipment_audit_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_public_id_unique" ON "shipments" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "shipments_owner_idx" ON "shipments" USING btree ("owner_id","created_at");--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_window_slot_valid" CHECK ("shipments"."window_slot" is null or "shipments"."window_slot" in ('08-10', '10-12', '12-14', '14-16', '16-18'));--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_window_complete" CHECK (("shipments"."window_date" is null) = ("shipments"."window_slot" is null));--> statement-breakpoint
CREATE POLICY "shipment_events_select" ON "shipment_events" AS PERMISSIVE FOR SELECT TO public USING (exists (select 1 from shipments s where s.id = shipment_events.shipment_id));--> statement-breakpoint
CREATE POLICY "shipment_events_insert_operator" ON "shipment_events" AS PERMISSIVE FOR INSERT TO public WITH CHECK (current_setting('app.mode', true) = 'operator');--> statement-breakpoint
CREATE POLICY "shipments_select" ON "shipments" AS PERMISSIVE FOR SELECT TO public USING (owner_id = nullif(current_setting('app.user_id', true), '')::uuid or current_setting('app.mode', true) in ('public_tracking', 'claim', 'operator'));--> statement-breakpoint
CREATE POLICY "shipments_update_owner" ON "shipments" AS PERMISSIVE FOR UPDATE TO public USING (owner_id = nullif(current_setting('app.user_id', true), '')::uuid) WITH CHECK (owner_id = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "shipments_update_claim" ON "shipments" AS PERMISSIVE FOR UPDATE TO public USING (current_setting('app.mode', true) = 'claim' and owner_id is null) WITH CHECK (owner_id = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "shipments_update_operator" ON "shipments" AS PERMISSIVE FOR UPDATE TO public USING (current_setting('app.mode', true) = 'operator') WITH CHECK (current_setting('app.mode', true) = 'operator');--> statement-breakpoint
CREATE POLICY "notifications_select" ON "notifications" AS PERMISSIVE FOR SELECT TO public USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "notifications_insert" ON "notifications" AS PERMISSIVE FOR INSERT TO public WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid or current_setting('app.mode', true) = 'operator');--> statement-breakpoint
CREATE POLICY "shipment_audit_events_select" ON "shipment_audit_events" AS PERMISSIVE FOR SELECT TO public USING (actor_user_id = nullif(current_setting('app.user_id', true), '')::uuid or exists (select 1 from shipments s where s.id = shipment_audit_events.shipment_id));--> statement-breakpoint
CREATE POLICY "shipment_audit_events_insert" ON "shipment_audit_events" AS PERMISSIVE FOR INSERT TO public WITH CHECK (exists (select 1 from shipments s where s.id = shipment_audit_events.shipment_id));