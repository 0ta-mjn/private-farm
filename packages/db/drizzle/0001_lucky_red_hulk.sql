CREATE TABLE "user_external_accounts" (
	"user_id" varchar(255) NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"display_name" varchar(255),
	CONSTRAINT "user_external_accounts_provider_provider_user_id_pk" PRIMARY KEY("provider","provider_user_id")
);
--> statement-breakpoint
ALTER TABLE "user_external_accounts" ADD CONSTRAINT "user_external_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_provider_unique" ON "user_external_accounts" USING btree ("user_id","provider");
