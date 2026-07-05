CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"icon" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "goal_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"weight" numeric DEFAULT '1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goal_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_type" text NOT NULL,
	"target_value" numeric,
	"period" text,
	"starts_on" date,
	"ends_on" date,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_target_type_check" CHECK ("goals"."target_type" in ('count','streak','minutes'))
);
--> statement-breakpoint
ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"occurrence_date" date NOT NULL,
	"reminder_key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "task_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"occurrence_date" date NOT NULL,
	"status" text DEFAULT 'done' NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_completions_status_check" CHECK ("task_completions"."status" in ('done','skipped','partial'))
);
--> statement-breakpoint
ALTER TABLE "task_completions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "task_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"occurrence_date" date NOT NULL,
	"title" text,
	"description" text,
	"time_of_day" time,
	"category_id" uuid,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_overrides" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"starts_on" date NOT NULL,
	"time_of_day" time,
	"timezone" text NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_rule" jsonb,
	"priority" text DEFAULT 'medium' NOT NULL,
	"estimated_minutes" integer,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_priority_check" CHECK ("tasks"."priority" in ('low','medium','high'))
);
--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_tasks" ADD CONSTRAINT "goal_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_tasks" ADD CONSTRAINT "goal_tasks_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_tasks" ADD CONSTRAINT "goal_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_overrides" ADD CONSTRAINT "task_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_overrides" ADD CONSTRAINT "task_overrides_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_overrides" ADD CONSTRAINT "task_overrides_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "goal_tasks_goal_task_uq" ON "goal_tasks" USING btree ("goal_id","task_id");--> statement-breakpoint
CREATE INDEX "goal_tasks_goal_id_idx" ON "goal_tasks" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_tasks_task_id_idx" ON "goal_tasks" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "goals_user_id_idx" ON "goals" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_logs_task_date_key_uq" ON "notification_logs" USING btree ("task_id","occurrence_date","reminder_key");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_user_endpoint_uq" ON "push_subscriptions" USING btree ("user_id","endpoint");--> statement-breakpoint
CREATE UNIQUE INDEX "task_completions_task_date_uq" ON "task_completions" USING btree ("task_id","occurrence_date");--> statement-breakpoint
CREATE INDEX "task_completions_user_date_idx" ON "task_completions" USING btree ("user_id","occurrence_date");--> statement-breakpoint
CREATE UNIQUE INDEX "task_overrides_task_date_uq" ON "task_overrides" USING btree ("task_id","occurrence_date");--> statement-breakpoint
CREATE INDEX "tasks_user_id_idx" ON "tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_user_starts_on_idx" ON "tasks" USING btree ("user_id","starts_on");--> statement-breakpoint
CREATE INDEX "tasks_category_id_idx" ON "tasks" USING btree ("category_id");--> statement-breakpoint
CREATE POLICY "categories_select" ON "categories" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "categories"."user_id");--> statement-breakpoint
CREATE POLICY "categories_insert" ON "categories" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "categories"."user_id");--> statement-breakpoint
CREATE POLICY "categories_update" ON "categories" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "categories"."user_id") WITH CHECK ((select auth.uid()) = "categories"."user_id");--> statement-breakpoint
CREATE POLICY "categories_delete" ON "categories" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "categories"."user_id");--> statement-breakpoint
CREATE POLICY "goal_tasks_select" ON "goal_tasks" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "goal_tasks"."user_id");--> statement-breakpoint
CREATE POLICY "goal_tasks_insert" ON "goal_tasks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "goal_tasks"."user_id");--> statement-breakpoint
CREATE POLICY "goal_tasks_update" ON "goal_tasks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "goal_tasks"."user_id") WITH CHECK ((select auth.uid()) = "goal_tasks"."user_id");--> statement-breakpoint
CREATE POLICY "goal_tasks_delete" ON "goal_tasks" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "goal_tasks"."user_id");--> statement-breakpoint
CREATE POLICY "goals_select" ON "goals" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "goals"."user_id");--> statement-breakpoint
CREATE POLICY "goals_insert" ON "goals" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "goals"."user_id");--> statement-breakpoint
CREATE POLICY "goals_update" ON "goals" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "goals"."user_id") WITH CHECK ((select auth.uid()) = "goals"."user_id");--> statement-breakpoint
CREATE POLICY "goals_delete" ON "goals" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "goals"."user_id");--> statement-breakpoint
CREATE POLICY "notification_logs_select" ON "notification_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "notification_logs"."user_id");--> statement-breakpoint
CREATE POLICY "notification_logs_insert" ON "notification_logs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "notification_logs"."user_id");--> statement-breakpoint
CREATE POLICY "notification_logs_update" ON "notification_logs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "notification_logs"."user_id") WITH CHECK ((select auth.uid()) = "notification_logs"."user_id");--> statement-breakpoint
CREATE POLICY "notification_logs_delete" ON "notification_logs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "notification_logs"."user_id");--> statement-breakpoint
CREATE POLICY "profiles_select" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "profiles"."id");--> statement-breakpoint
CREATE POLICY "profiles_insert" ON "profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "profiles"."id");--> statement-breakpoint
CREATE POLICY "profiles_update" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "profiles"."id") WITH CHECK ((select auth.uid()) = "profiles"."id");--> statement-breakpoint
CREATE POLICY "profiles_delete" ON "profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "profiles"."id");--> statement-breakpoint
CREATE POLICY "push_subscriptions_select" ON "push_subscriptions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "push_subscriptions"."user_id");--> statement-breakpoint
CREATE POLICY "push_subscriptions_insert" ON "push_subscriptions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "push_subscriptions"."user_id");--> statement-breakpoint
CREATE POLICY "push_subscriptions_update" ON "push_subscriptions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "push_subscriptions"."user_id") WITH CHECK ((select auth.uid()) = "push_subscriptions"."user_id");--> statement-breakpoint
CREATE POLICY "push_subscriptions_delete" ON "push_subscriptions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "push_subscriptions"."user_id");--> statement-breakpoint
CREATE POLICY "task_completions_select" ON "task_completions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "task_completions"."user_id");--> statement-breakpoint
CREATE POLICY "task_completions_insert" ON "task_completions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "task_completions"."user_id");--> statement-breakpoint
CREATE POLICY "task_completions_update" ON "task_completions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "task_completions"."user_id") WITH CHECK ((select auth.uid()) = "task_completions"."user_id");--> statement-breakpoint
CREATE POLICY "task_completions_delete" ON "task_completions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "task_completions"."user_id");--> statement-breakpoint
CREATE POLICY "task_overrides_select" ON "task_overrides" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "task_overrides"."user_id");--> statement-breakpoint
CREATE POLICY "task_overrides_insert" ON "task_overrides" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "task_overrides"."user_id");--> statement-breakpoint
CREATE POLICY "task_overrides_update" ON "task_overrides" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "task_overrides"."user_id") WITH CHECK ((select auth.uid()) = "task_overrides"."user_id");--> statement-breakpoint
CREATE POLICY "task_overrides_delete" ON "task_overrides" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "task_overrides"."user_id");--> statement-breakpoint
CREATE POLICY "tasks_select" ON "tasks" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "tasks"."user_id");--> statement-breakpoint
CREATE POLICY "tasks_insert" ON "tasks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "tasks"."user_id");--> statement-breakpoint
CREATE POLICY "tasks_update" ON "tasks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "tasks"."user_id") WITH CHECK ((select auth.uid()) = "tasks"."user_id");--> statement-breakpoint
CREATE POLICY "tasks_delete" ON "tasks" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "tasks"."user_id");