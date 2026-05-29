import { Router, type IRouter } from 'express';
import { db, assessmentsTable } from '@workspace/db';
import { calculateRiskScore } from '../../logic/risk-score.js';
import { applyConservativeDefaults, getAverageConfidence } from '../../server/confidence-scorer.js';
import type { InfrastructureParams, PartialInfrastructureParams } from '../../types/infrastructure.js';
import type { RiskScoreResult } from '../../types/results.js';

const router: IRouter = Router();

interface CalculateRiskRequest {
  params: PartialInfrastructureParams;
  confidenceScores: Partial<Record<keyof PartialInfrastructureParams, number>>;
  source: 'form' | 'interview';
}

/**
 * Map the new spec's enum values to the existing DB / risk-engine values.
 * The DB stores lowercase strings; the spec uses uppercase enums.
 */
function toDbBurialStatus(b: string): string {
  const map: Record<string, string> = {
    EXPOSED: 'exposed',
    BURIED: 'buried',
    MIXED: 'mixed',
  };
  return map[b] ?? 'exposed';
}

function toDbFlowRate(f: string): string {
  const map: Record<string, string> = {
    CONTINUOUS: 'continuous',
    INTERMITTENT: 'intermittent',
    STAGNANT: 'stagnant',
  };
  return map[f] ?? 'stagnant';
}

function toDbGumType(g: string): string {
  const map: Record<string, string> = {
    SOLVENT_CEMENT: 'solvent_cement',
    RUBBER_GASKET: 'rubber_ring',
    PVC_ADHESIVE: 'rubber_ring',
    UNKNOWN: 'unknown',
  };
  return map[g] ?? 'unknown';
}

function toDbUseContext(u: string): string {
  const map: Record<string, string> = {
    DRINKING: 'drinking',
    IRRIGATION: 'irrigation',
    AQUACULTURE: 'fish_pond',
    LIVESTOCK: 'livestock',
  };
  return map[u] ?? 'irrigation';
}

function toDbMaterial(m: string): string {
  const map: Record<string, string> = {
    UPVC: 'UPVC',
    CPVC: 'CPVC',
    HDPE: 'HDPE',
    FLEXIBLE_PVC: 'PVC',
    UNKNOWN: 'Unknown',
  };
  return map[m] ?? 'Unknown';
}

router.post('/calculate-risk', async (req, res): Promise<void> => {
  const body = req.body as CalculateRiskRequest;

  if (!body || !body.params) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  try {
    const { params: filledParams, scores: filledScores } = applyConservativeDefaults(
      body.params,
      body.confidenceScores ?? {},
    );

    const avgConfidence = getAverageConfidence(filledScores);
    const params = filledParams as InfrastructureParams;

    const output = calculateRiskScore(params, avgConfidence);

    const scoreRange =
      output.outputFormat !== 'point'
        ? { score_min: output.scoreMin ?? null, score_max: output.scoreMax ?? null }
        : { score_min: null, score_max: null };

    const [row] = await db
      .insert(assessmentsTable)
      .values({
        pipe_material: toDbMaterial(params.pipe_material),
        gum_type: toDbGumType(params.gum_type),
        installation_age_years: params.installation_age_years,
        pipe_diameter_mm: params.pipe_diameter_mm ?? null,
        avg_temp_celsius: params.avg_temp_celsius,
        daily_uv_hours: params.daily_uv_hours,
        water_flow_rate: toDbFlowRate(params.water_flow_rate),
        buried_or_exposed: toDbBurialStatus(params.burial_status),
        use_context: toDbUseContext(params.use_context),
        population_served: params.population_served ?? null,
        source: body.source,
        risk_score: output.score,
        risk_band: output.band.toLowerCase(),
        ...scoreRange,
        months_to_threshold: output.monthsToThreshold,
        tdi: output.tdi,
        udi: output.udi,
        avg_confidence: avgConfidence,
        confidence_scores: filledScores as Record<string, number>,
        action_recommendation: output.actionRecommendation,
        conversation_id: null,
      })
      .returning();

    req.log.info({ id: row.id, score: output.score, band: output.band }, 'Risk calculated');

    const result: RiskScoreResult = {
      sessionId: String(row.id),
      score: output.score,
      scoreMin: output.scoreMin,
      scoreMax: output.scoreMax,
      outputFormat: output.outputFormat,
      band: output.band,
      monthsToThreshold: output.monthsToThreshold,
      actionRecommendation: output.actionRecommendation,
      params,
      paramConfidence: filledScores,
      averageConfidence: avgConfidence,
      source: body.source,
      generatedAt: Date.now(),
    };

    res.json(result);
  } catch (error) {
    req.log.error({ error }, 'calculate-risk error');
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Calculation failed',
    });
  }
});

export default router;
