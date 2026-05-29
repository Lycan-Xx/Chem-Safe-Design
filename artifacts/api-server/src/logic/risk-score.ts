import type { InfrastructureParams } from '../types/infrastructure.js';
import type { RiskBand, ScoreOutputFormat } from '../types/results.js';
import { calculateTDI, calculateUDI } from './polymer-degradation.js';
import { USE_THRESHOLD_FACTOR } from './material-profiles.js';
import { getRiskBand, getWHOBreachThreshold, getActionRecommendation } from './toxicity-thresholds.js';

export interface RiskScoreOutput {
  score: number;
  scoreMin?: number;
  scoreMax?: number;
  outputFormat: ScoreOutputFormat;
  band: RiskBand;
  monthsToThreshold: number;
  tdi: number;
  udi: number;
  actionRecommendation: string;
}

/**
 * Main scoring function. Takes fully-populated InfrastructureParams
 * and returns a 0–100 risk score with associated metadata.
 *
 * avgConfidence drives the output format:
 *   >= 0.85  → point score
 *   0.65–0.84 → narrow range (±8%)
 *   < 0.65   → wide range (±15%)
 */
export function calculateRiskScore(
  params: InfrastructureParams,
  avgConfidence = 1.0,
): RiskScoreOutput {
  const useThreshold = USE_THRESHOLD_FACTOR[params.use_context] ?? 1.0;

  const tdi = calculateTDI(params);
  const udi = calculateUDI(params);

  const rawScore = (tdi * 15 + udi * 0.0008) / useThreshold;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  const band = getRiskBand(score);
  const breachThreshold = getWHOBreachThreshold(params.use_context);

  let monthsToThreshold: number;
  if (score >= breachThreshold) {
    monthsToThreshold = 0;
  } else {
    const gap = breachThreshold - score;
    const annualGrowthRate = (tdi * 15 * 0.05 + udi * 0.0008 * 0.05) / useThreshold;
    monthsToThreshold = Math.max(
      1,
      Math.round((gap / Math.max(0.1, annualGrowthRate)) * 12),
    );
    monthsToThreshold = Math.min(monthsToThreshold, 240);
  }

  const actionRecommendation = getActionRecommendation(band, params.use_context, monthsToThreshold);

  let outputFormat: ScoreOutputFormat;
  let scoreMin: number | undefined;
  let scoreMax: number | undefined;

  if (avgConfidence >= 0.85) {
    outputFormat = 'point';
  } else if (avgConfidence >= 0.65) {
    outputFormat = 'narrow-range';
    scoreMin = Math.max(0, score - Math.round(score * 0.08));
    scoreMax = Math.min(100, score + Math.round(score * 0.08));
  } else {
    outputFormat = 'wide-range';
    scoreMin = Math.max(0, score - Math.round(score * 0.15));
    scoreMax = Math.min(100, score + Math.round(score * 0.15));
  }

  return {
    score,
    scoreMin,
    scoreMax,
    outputFormat,
    band,
    monthsToThreshold,
    tdi: Math.round(tdi * 100) / 100,
    udi: Math.round(udi * 10) / 10,
    actionRecommendation,
  };
}
