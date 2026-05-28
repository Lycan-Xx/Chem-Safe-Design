import { Router, type IRouter } from "express";
import { db, assessmentsTable } from "@workspace/db";
import { CreateAssessmentBody, GetAssessmentParams } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";
import { calculateRisk } from "../../lib/risk-engine";

const router: IRouter = Router();

function formatRow(r: typeof assessmentsTable.$inferSelect) {
  return {
    id: String(r.id),
    pipe_material: r.pipe_material,
    gum_type: r.gum_type,
    installation_age_years: r.installation_age_years,
    pipe_diameter_mm: r.pipe_diameter_mm ?? null,
    avg_temp_celsius: r.avg_temp_celsius,
    daily_uv_hours: r.daily_uv_hours,
    water_flow_rate: r.water_flow_rate,
    buried_or_exposed: r.buried_or_exposed,
    use_context: r.use_context,
    population_served: r.population_served ?? null,
    source: r.source,
    risk_score: r.risk_score,
    risk_band: r.risk_band,
    score_min: r.score_min ?? null,
    score_max: r.score_max ?? null,
    months_to_threshold: r.months_to_threshold,
    tdi: r.tdi,
    udi: r.udi,
    avg_confidence: r.avg_confidence ?? null,
    confidence_scores: r.confidence_scores ?? null,
    action_recommendation: r.action_recommendation,
    conversation_id: r.conversation_id ?? null,
    created_at: r.created_at.toISOString(),
  };
}

router.get("/assessments", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(assessmentsTable)
    .orderBy(desc(assessmentsTable.created_at))
    .limit(50);
  res.json(rows.map(formatRow));
});

router.post("/assessments", async (req, res): Promise<void> => {
  const parsed = CreateAssessmentBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid assessment input");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = parsed.data;
  const confidenceMap = input.confidence_scores as Record<string, number> | null | undefined;
  const avgConfidence = confidenceMap
    ? Object.values(confidenceMap).reduce((a, b) => a + b, 0) /
      Object.values(confidenceMap).length
    : undefined;

  const riskResult = calculateRisk({
    pipe_material: input.pipe_material,
    gum_type: input.gum_type,
    installation_age_years: input.installation_age_years,
    avg_temp_celsius: input.avg_temp_celsius,
    daily_uv_hours: input.daily_uv_hours,
    water_flow_rate: input.water_flow_rate,
    buried_or_exposed: input.buried_or_exposed,
    use_context: input.use_context,
    avg_confidence: avgConfidence,
  });

  const [row] = await db
    .insert(assessmentsTable)
    .values({
      pipe_material: input.pipe_material,
      gum_type: input.gum_type,
      installation_age_years: input.installation_age_years,
      pipe_diameter_mm: input.pipe_diameter_mm ?? null,
      avg_temp_celsius: input.avg_temp_celsius,
      daily_uv_hours: input.daily_uv_hours,
      water_flow_rate: input.water_flow_rate,
      buried_or_exposed: input.buried_or_exposed,
      use_context: input.use_context,
      population_served: input.population_served ?? null,
      source: input.source,
      confidence_scores: confidenceMap ?? null,
      avg_confidence: avgConfidence ?? null,
      conversation_id: input.conversation_id ?? null,
      ...riskResult,
    })
    .returning();

  req.log.info({ id: row.id, risk_score: row.risk_score }, "Assessment created");
  res.status(201).json(formatRow(row));
});

router.get("/assessments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetAssessmentParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db
    .select()
    .from(assessmentsTable)
    .where(eq(assessmentsTable.id, parseInt(params.data.id, 10)));

  if (!row) {
    res.status(404).json({ error: "Assessment not found" });
    return;
  }

  res.json(formatRow(row));
});

export default router;
