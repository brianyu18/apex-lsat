CREATE TYPE "public"."attempt_mode" AS ENUM('drill', 'timed', 'pt', 'br', 'check');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('sure', 'leaning', 'guess');--> statement-breakpoint
CREATE TYPE "public"."error_type" AS ENUM('misread', 'logic_gap', 'trap', 'time_pressure', 'careless', 'guessed_right');--> statement-breakpoint
CREATE TYPE "public"."lesson_status" AS ENUM('not_started', 'in_progress', 'complete');--> statement-breakpoint
CREATE TYPE "public"."plan_phase" AS ENUM('foundations', 'lr', 'rc', 'mixed', 'protect');--> statement-breakpoint
CREATE TYPE "public"."section" AS ENUM('LR', 'RC');--> statement-breakpoint
CREATE TYPE "public"."session_kind" AS ENUM('drill', 'section', 'pt', 'check', 'skip_trainer', 'writing');--> statement-breakpoint
CREATE TYPE "public"."skill_dimension" AS ENUM('section', 'type', 'tag', 'rc_style', 'rc_qtype');--> statement-breakpoint
CREATE TYPE "public"."question_source" AS ENUM('original', 'official_ref');--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text,
	"question_id" text NOT NULL,
	"mode" "attempt_mode" NOT NULL,
	"position" integer,
	"answer" text,
	"correct" boolean,
	"seconds" real,
	"passage_seconds" real,
	"confidence" "confidence",
	"guess_flag" boolean DEFAULT false NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"changed_from" text,
	"br_answer" text,
	"br_correct" boolean,
	"prediction" text,
	"skipped" boolean DEFAULT false NOT NULL,
	"skill_level_at_time" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons_progress" (
	"lesson_id" text PRIMARY KEY NOT NULL,
	"status" "lesson_status" DEFAULT 'not_started' NOT NULL,
	"check_score" integer,
	"check_total" integer,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "misses" (
	"attempt_id" text PRIMARY KEY NOT NULL,
	"question_id" text NOT NULL,
	"error_type" "error_type",
	"error_suggested" "error_type",
	"trap_subtype" text,
	"why_chose" text,
	"why_rejected_right" text,
	"how_predict" text,
	"killing_words" text,
	"avoid_next_time" text,
	"takeaway" text,
	"reviewed" boolean DEFAULT false NOT NULL,
	"reviewed_at" timestamp with time zone,
	"srs_box" integer DEFAULT 1 NOT NULL,
	"next_due" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passages" (
	"id" text PRIMARY KEY NOT NULL,
	"source" "question_source" DEFAULT 'original' NOT NULL,
	"pt" integer,
	"section_number" integer,
	"passage_index" integer,
	"style" text,
	"topic" text,
	"comparative" boolean DEFAULT false NOT NULL,
	"title" text,
	"paragraphs" jsonb,
	"paragraphs_b" jsonb,
	"role_map" jsonb,
	"low_res_summary" text,
	"word_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan" (
	"id" text PRIMARY KEY NOT NULL,
	"test_date" date,
	"provisional" boolean DEFAULT false NOT NULL,
	"hours_per_week" real NOT NULL,
	"days_per_week" integer NOT NULL,
	"phases" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_days" (
	"plan_id" text NOT NULL,
	"day" date NOT NULL,
	"phase" "plan_phase" NOT NULL,
	"blocks" jsonb NOT NULL,
	"minutes" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_minutes" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "plan_days_plan_id_day_pk" PRIMARY KEY("plan_id","day")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"source" "question_source" DEFAULT 'original' NOT NULL,
	"section" "section" NOT NULL,
	"pt" integer,
	"section_number" integer,
	"number" integer,
	"type" text NOT NULL,
	"logic_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"difficulty" integer NOT NULL,
	"difficulty_calibrated" real,
	"trap_patterns" jsonb,
	"passage_id" text,
	"stimulus" text,
	"stem" text,
	"choices" jsonb,
	"answer" text,
	"explanations" jsonb,
	"key_takeaway" text,
	"prediction_hint" text,
	"reserved_for_timed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "session_kind" NOT NULL,
	"section" "section",
	"pt_ref" integer,
	"timed" boolean DEFAULT false NOT NULL,
	"duration_sec" integer,
	"elapsed_sec" integer,
	"n_questions" integer,
	"score_raw" integer,
	"score_scaled" integer,
	"br_raw" integer,
	"br_scaled" integer,
	"settings" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"test_date" date,
	"goal_score" integer DEFAULT 175 NOT NULL,
	"hours_per_week" real DEFAULT 10 NOT NULL,
	"days_per_week" integer DEFAULT 6 NOT NULL,
	"start_date" date,
	"diagnostic" jsonb,
	"drill_prefs" jsonb,
	"onboarded" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"dimension" "skill_dimension" NOT NULL,
	"key" text NOT NULL,
	"rating" real DEFAULT 1450 NOT NULL,
	"n" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_dimension_key_pk" PRIMARY KEY("dimension","key")
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "misses" ADD CONSTRAINT "misses_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "misses" ADD CONSTRAINT "misses_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_days" ADD CONSTRAINT "plan_days_plan_id_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_question_idx" ON "attempts" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "attempts_session_idx" ON "attempts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "attempts_created_idx" ON "attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "misses_next_due_idx" ON "misses" USING btree ("next_due");--> statement-breakpoint
CREATE INDEX "misses_question_idx" ON "misses" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "questions_section_type_idx" ON "questions" USING btree ("section","type");--> statement-breakpoint
CREATE INDEX "questions_difficulty_idx" ON "questions" USING btree ("difficulty");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_official_ref_uq" ON "questions" USING btree ("pt","section_number","number");--> statement-breakpoint
CREATE INDEX "sessions_kind_started_idx" ON "sessions" USING btree ("kind","started_at");