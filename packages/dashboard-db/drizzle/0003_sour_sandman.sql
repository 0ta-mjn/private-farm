CREATE TABLE "discord_channels" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organization_id" varchar(255) NOT NULL,
	"channel_id" text NOT NULL,
	"channel_name" text NOT NULL,
	"guild_id" text NOT NULL,
	"guild_name" text DEFAULT '' NOT NULL,
	"webhook_id" text,
	"webhook_token_enc" text,
	"mention_role_id" text,
	"notification_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_org_channel" UNIQUE("organization_id","channel_id")
);
--> statement-breakpoint
ALTER TABLE "discord_channels" ADD CONSTRAINT "discord_channels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discord_channels_organization_idx" ON "discord_channels" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "discord_channels_guild_idx" ON "discord_channels" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "discord_channels_channel_idx" ON "discord_channels" USING btree ("channel_id");