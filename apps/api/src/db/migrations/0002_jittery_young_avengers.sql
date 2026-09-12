CREATE TABLE IF NOT EXISTS "tenant_column_display" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"table_name" text NOT NULL,
	"column_name" text NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant_column_display" ADD CONSTRAINT "tenant_column_display_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_column_display_column_unique" ON "tenant_column_display" USING btree ("workspace_id","table_name","column_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenant_column_display_table_idx" ON "tenant_column_display" USING btree ("workspace_id","table_name");