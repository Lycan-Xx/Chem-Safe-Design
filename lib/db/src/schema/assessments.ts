import { pgTable, text, serial, timestamp, real, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assessmentsTable = pgTable("assessments", {
  id: serial("id").primaryKey(),
  pipe_material: text("pipe_material").notNull(),
  gum_type: text("gum_type").notNull(),
  installation_age_years: real("installation_age_years").notNull(),
  pipe_diameter_mm: real("pipe_diameter_mm"),
  avg_temp_celsius: real("avg_temp_celsius").notNull(),
  daily_uv_hours: real("daily_uv_hours").notNull(),
  water_flow_rate: text("water_flow_rate").notNull(),
  buried_or_exposed: text("buried_or_exposed").notNull(),
  use_context: text("use_context").notNull(),
  population_served: real("population_served"),
  source: text("source").notNull().default("form"),
  risk_score: real("risk_score").notNull(),
  risk_band: text("risk_band").notNull(),
  score_min: real("score_min"),
  score_max: real("score_max"),
  months_to_threshold: real("months_to_threshold").notNull(),
  tdi: real("tdi").notNull(),
  udi: real("udi").notNull(),
  avg_confidence: real("avg_confidence"),
  confidence_scores: jsonb("confidence_scores"),
  action_recommendation: text("action_recommendation").notNull(),
  conversation_id: integer("conversation_id"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssessmentSchema = createInsertSchema(assessmentsTable).omit({
  id: true,
  created_at: true,
});
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessmentsTable.$inferSelect;
