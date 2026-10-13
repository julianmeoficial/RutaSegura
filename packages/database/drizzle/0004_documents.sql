ALTER TYPE "public"."shipment_audit_event_type" ADD VALUE 'document_url_issued';--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"shipment_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_mime_type_allowed" CHECK ("documents"."mime_type" in ('application/pdf', 'image/jpeg', 'image/png')),
	CONSTRAINT "documents_size_valid" CHECK ("documents"."size_bytes" between 1 and 10485760),
	CONSTRAINT "documents_sha256_hex" CHECK ("documents"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "documents_file_name_length" CHECK (char_length("documents"."file_name") between 1 and 160)
);
--> statement-breakpoint
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "documents_public_id_unique" ON "documents" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_object_key_unique" ON "documents" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "documents_shipment_idx" ON "documents" USING btree ("shipment_id","created_at");--> statement-breakpoint
CREATE POLICY "documents_select" ON "documents" AS PERMISSIVE FOR SELECT TO public USING (exists (select 1 from shipments s where s.id = documents.shipment_id));--> statement-breakpoint
CREATE POLICY "documents_insert_operator" ON "documents" AS PERMISSIVE FOR INSERT TO public WITH CHECK (current_setting('app.mode', true) = 'operator');