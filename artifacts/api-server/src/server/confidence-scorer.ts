import type { PartialInfrastructureParams } from '../types/infrastructure.js';
import type { ScoreOutputFormat } from '../types/results.js';

const REQUIRED_PARAMS: Array<keyof PartialInfrastructureParams> = [
  'pipe_material', 'gum_type', 'installation_age_years',
  'avg_temp_celsius', 'daily_uv_hours', 'water_flow_rate',
  'burial_status', 'use_context',
];

export function getAverageConfidence(
  scores: Partial<Record<keyof PartialInfrastructureParams, number>>,
): number {
  const requiredScores = REQUIRED_PARAMS.map(p => scores[p] ?? 0.4);
  return requiredScores.reduce((a, b) => a + b, 0) / requiredScores.length;
}

export function getScoreOutputFormat(avgConfidence: number): ScoreOutputFormat {
  if (avgConfidence >= 0.85) return 'point';
  if (avgConfidence >= 0.65) return 'narrow-range';
  return 'wide-range';
}

export function applyConservativeDefaults(
  params: PartialInfrastructureParams,
  scores: Partial<Record<keyof PartialInfrastructureParams, number>>,
): {
  params: Required<Pick<PartialInfrastructureParams, typeof REQUIRED_PARAMS[number]>>;
  scores: Record<typeof REQUIRED_PARAMS[number], number>;
} {
  const defaults: Record<string, unknown> = {
    pipe_material: 'UNKNOWN',
    gum_type: 'UNKNOWN',
    installation_age_years: 15,
    avg_temp_celsius: 38,
    daily_uv_hours: 8,
    water_flow_rate: 'STAGNANT',
    burial_status: 'EXPOSED',
    use_context: 'DRINKING',
  };

  const filledParams: Record<string, unknown> = { ...params };
  const filledScores: Record<string, number> = { ...scores };

  for (const param of REQUIRED_PARAMS) {
    if (filledParams[param] === undefined) {
      filledParams[param] = defaults[param];
      filledScores[param] = 0.4;
    }
  }

  return {
    params: filledParams as Required<Pick<PartialInfrastructureParams, typeof REQUIRED_PARAMS[number]>>,
    scores: filledScores as Record<typeof REQUIRED_PARAMS[number], number>,
  };
}
