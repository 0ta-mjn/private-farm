CREATE TABLE "discord_channels" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"installation_id" varchar NOT NULL,
	"channel_id" text NOT NULL,
	"channel_name" text NOT NULL,
	"webhook_id" text,
	"webhook_token_enc" text,
	"mention_role_id" text,
	"notification_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_installation_channel" UNIQUE("installation_id","channel_id")
);
--> statement-breakpoint
CREATE TABLE "discord_installations" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organization_id" varchar(255) NOT NULL,
	"guild_id" text NOT NULL,
	"guild_name" text DEFAULT '' NOT NULL,
	"bot_user_id" text,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"refresh_in_progress" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_org_guild" UNIQUE("organization_id","guild_id")
);
--> statement-breakpoint
ALTER TABLE "discord_channels" ADD CONSTRAINT "discord_channels_installation_id_discord_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."discord_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_installations" ADD CONSTRAINT "discord_installations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discord_channels_installation_idx" ON "discord_channels" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "discord_channels_channel_idx" ON "discord_channels" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "discord_installations_guild_idx" ON "discord_installations" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "discord_installations_organization_idx" ON "discord_installations" USING btree ("organization_id");