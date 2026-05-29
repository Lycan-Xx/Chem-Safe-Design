import type { InfrastructureParams } from './infrastructure.js';

export type RiskBand = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type ScoreOutputFormat = 'point' | 'narrow-range' | 'wide-range';

export interface RiskScoreResult {
  sessionId: string;
  score: number;
  scoreMin?: number;
  scoreMax?: number;
  outputFormat: ScoreOutputFormat;
  band: RiskBand;
  monthsToThreshold: number;
  actionRecommendation: string;
  params: InfrastructureParams;
  paramConfidence: Partial<Record<keyof InfrastructureParams, number>>;
  averageConfidence: number;
  source: 'form' | 'interview';
  generatedAt: number;
}

export interface TimelineDataPoint {
  month: number;
  leachateLevel: number;
  threshold: number;
}
