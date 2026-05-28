/**
 * ChemSafe Risk Engine
 *
 * Calculates Thermal Degradation Index (TDI) and UV Degradation Index (UDI)
 * for PVC pipe infrastructure, combining them into a 0–100 risk score.
 *
 * Based on polymer degradation chemistry grounded in WHO SDG 3.9 thresholds.
 */

export type PipeMaterial = "UPVC" | "CPVC" | "HDPE" | "PVC" | "Unknown";
export type GumType = "solvent_cement" | "rubber_ring" | "unknown";
export type FlowRate = "continuous" | "intermittent" | "stagnant";
export type BurialStatus = "buried" | "exposed" | "mixed";
export type UseContext = "drinking" | "irrigation" | "fish_pond" | "livestock";
export type RiskBand = "low" | "moderate" | "high" | "critical";

interface RiskInputs {
  pipe_material: string;
  gum_type: string;
  installation_age_years: number;
  avg_temp_celsius: number;
  daily_uv_hours: number;
  water_flow_rate: string;
  buried_or_exposed: string;
  use_context: string;
  avg_confidence?: number;
}

interface RiskResult {
  risk_score: number;
  risk_band: RiskBand;
  score_min: number | null;
  score_max: number | null;
  months_to_threshold: number;
  tdi: number;
  udi: number;
  action_recommendation: string;
}

// Arrhenius constants per material
const MATERIAL_BASE_RATE: Record<string, number> = {
  UPVC: 1.2,
  CPVC: 0.9,
  HDPE: 0.4,
  PVC: 1.5,
  Unknown: 1.5, // worst case
};

const ARRHENIUS_K: Record<string, number> = {
  UPVC: 0.042,
  CPVC: 0.031,
  HDPE: 0.018,
  PVC: 0.048,
  Unknown: 0.048,
};

const UV_SENSITIVITY: Record<string, number> = {
  UPVC: 0.8,
  CPVC: 0.6,
  HDPE: 0.3,
  PVC: 1.0,
  Unknown: 1.0,
};

const GUM_UV_COEFFICIENT: Record<string, number> = {
  solvent_cement: 1.2,
  rubber_ring: 0.9,
  unknown: 1.2,
};

const BURIAL_FACTOR: Record<string, number> = {
  buried: 0.95,
  exposed: 0.0,
  mixed: 0.4,
};

const FLOW_FACTOR: Record<string, number> = {
  continuous: 0.8,
  intermittent: 1.0,
  stagnant: 1.3,
};

// WHO threshold multiplier by use context (drinking water most sensitive)
const USE_THRESHOLD_FACTOR: Record<string, number> = {
  drinking: 0.6,
  irrigation: 1.0,
  fish_pond: 0.85,
  livestock: 1.0,
};

const ACTIONS: Record<RiskBand, (useContext: string) => string> = {
  low: () => "Monitor annually. Document infrastructure details for future reference. Schedule inspection in 12 months.",
  moderate: (use) =>
    use === "drinking"
      ? "Inspect joints and fittings within 3 months. Begin planning for partial replacement. Consider testing water samples."
      : "Inspect infrastructure within 6 months. Monitor for signs of degradation (discolouration, brittleness). Schedule replacement planning.",
  high: (use) =>
    use === "drinking" || use === "fish_pond"
      ? "Replace gum joints and degraded sections before next operational season. Do not use this supply for sensitive use without testing."
      : "Replace pipe joints and UV-exposed sections within 3 months. Transition to non-UV-exposed routing where possible.",
  critical: () =>
    "Act immediately. Replace degraded infrastructure before continued use. WHO threshold breach is projected imminently. Seek independent water testing now.",
};

export function calculateRisk(inputs: RiskInputs): RiskResult {
  const material = inputs.pipe_material;
  const baseRate = MATERIAL_BASE_RATE[material] ?? 1.5;
  const k = ARRHENIUS_K[material] ?? 0.048;
  const uvSens = UV_SENSITIVITY[material] ?? 1.0;
  const gumCoeff = GUM_UV_COEFFICIENT[inputs.gum_type] ?? 1.2;
  const burialFactor = BURIAL_FACTOR[inputs.buried_or_exposed] ?? 0.0;
  const flowFactor = FLOW_FACTOR[inputs.water_flow_rate] ?? 1.0;
  const useThreshold = USE_THRESHOLD_FACTOR[inputs.use_context] ?? 1.0;

  // Thermal Degradation Index
  const tdi =
    baseRate *
    Math.exp(k * (inputs.avg_temp_celsius - 25)) *
    inputs.installation_age_years *
    flowFactor;

  // UV Degradation Index
  const udi =
    inputs.daily_uv_hours *
    365 *
    inputs.installation_age_years *
    uvSens *
    (1 - burialFactor) *
    gumCoeff;

  // Combined risk score (normalised to 0–100)
  const rawScore = (tdi * 15 + udi * 0.0008) / useThreshold;
  const risk_score = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Score range based on confidence
  const conf = inputs.avg_confidence ?? 1.0;
  let score_min: number | null = null;
  let score_max: number | null = null;
  if (conf < 0.65) {
    score_min = Math.max(0, risk_score - Math.round(risk_score * 0.15));
    score_max = Math.min(100, risk_score + Math.round(risk_score * 0.15));
  } else if (conf < 0.85) {
    score_min = Math.max(0, risk_score - Math.round(risk_score * 0.08));
    score_max = Math.min(100, risk_score + Math.round(risk_score * 0.08));
  }

  // Risk band
  let risk_band: RiskBand;
  if (risk_score <= 30) risk_band = "low";
  else if (risk_score <= 60) risk_band = "moderate";
  else if (risk_score <= 80) risk_band = "high";
  else risk_band = "critical";

  // Months to WHO threshold breach (project forward)
  // Threshold is considered breached at score 70 for sensitive uses, 85 otherwise
  const breachThreshold = inputs.use_context === "drinking" ? 65 : 80;
  let months_to_threshold: number;
  if (risk_score >= breachThreshold) {
    months_to_threshold = 0;
  } else {
    const gap = breachThreshold - risk_score;
    const annualGrowthRate = (tdi * 15 * 0.05 + udi * 0.0008 * 0.05) / useThreshold;
    months_to_threshold = Math.max(
      1,
      Math.round((gap / Math.max(0.1, annualGrowthRate)) * 12),
    );
    months_to_threshold = Math.min(months_to_threshold, 240); // cap at 20 years
  }

  const action_recommendation = ACTIONS[risk_band](inputs.use_context);

  return {
    risk_score,
    risk_band,
    score_min,
    score_max,
    months_to_threshold,
    tdi: Math.round(tdi * 100) / 100,
    udi: Math.round(udi * 10) / 10,
    action_recommendation,
  };
}
