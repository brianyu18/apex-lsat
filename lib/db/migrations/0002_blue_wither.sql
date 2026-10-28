ALTER TABLE "questions" ADD COLUMN "gist" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "gpa" real;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "target_schools" jsonb;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "official_pts" jsonb;