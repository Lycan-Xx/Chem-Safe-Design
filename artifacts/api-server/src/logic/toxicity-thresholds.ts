import type { UseContext } from '../types/infrastructure.js';
import type { RiskBand } from '../types/results.js';
import { WHO_BREACH_THRESHOLD } from './material-profiles.js';

/**
 * WHO SDG 3.9 thresholds mapped to risk score bands.
 *
 * Drinking water has the strictest thresholds; irrigation
 * and livestock have more permissive limits.
 */
export function getRiskBand(score: number): RiskBand {
  if (score <= 30) return 'LOW';
  if (score <= 60) return 'MODERATE';
  if (score <= 80) return 'HIGH';
  return 'CRITICAL';
}

export function getWHOBreachThreshold(useContext: UseContext): number {
  return WHO_BREACH_THRESHOLD[useContext] ?? 80;
}

export function getActionRecommendation(
  band: RiskBand,
  useContext: UseContext,
  monthsToThreshold: number,
): string {
  const contextLabel =
    useContext === 'AQUACULTURE' ? 'fish pond' :
    useContext === 'IRRIGATION' ? 'crop irrigation system' :
    useContext === 'LIVESTOCK' ? 'livestock water supply' :
    'drinking water supply';

  switch (band) {
    case 'CRITICAL':
      return `Replace gum joints and inspect all pipe connections in your ` +
             `${contextLabel} immediately. Do not use this water for its ` +
             `current purpose until replacement is confirmed.`;
    case 'HIGH':
      return `Plan replacement of gum joints in your ${contextLabel} within ` +
             `the next ${Math.min(3, Math.ceil(monthsToThreshold))} months. ` +
             `Monitor for discolouration or unusual taste or smell.`;
    case 'MODERATE':
      return `Schedule an inspection of your ${contextLabel} pipe joints ` +
             `within 6 months. Consider replacing any joints showing visible ` +
             `cracking or discolouration.`;
    case 'LOW':
      return `Your ${contextLabel} infrastructure is within safe parameters. ` +
             `Re-assess annually or after any major heat season.`;
    default:
      return 'Re-assess your infrastructure with a qualified technician.';
  }
}
