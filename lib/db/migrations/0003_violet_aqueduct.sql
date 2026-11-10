ALTER TYPE "public"."question_source" ADD VALUE 'private';--> statement-breakpoint
CREATE TABLE "custom_tests" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"sections" jsonb NOT NULL,
	"n_questions" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
