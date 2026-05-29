import type { InfrastructureParams } from '../types/infrastructure.js';
import {
  MATERIAL_BASE_RATE,
  ARRHENIUS_K,
  UV_SENSITIVITY,
  GUM_UV_COEFFICIENT,
  BURIAL_FACTOR,
  FLOW_FACTOR,
} from './material-profiles.js';

/**
 * Thermal Degradation Index (TDI)
 *
 * Models Arrhenius-based thermal degradation of the pipe material
 * combined with water flow stagnation effects.
 */
export function calculateTDI(params: InfrastructureParams): number {
  const baseRate = MATERIAL_BASE_RATE[params.pipe_material] ?? 1.5;
  const k = ARRHENIUS_K[params.pipe_material] ?? 0.048;
  const flowFactor = FLOW_FACTOR[params.water_flow_rate] ?? 1.0;

  return (
    baseRate *
    Math.exp(k * (params.avg_temp_celsius - 25)) *
    params.installation_age_years *
    flowFactor
  );
}

/**
 * UV Degradation Index (UDI)
 *
 * Models photodegradation of the pipe polymer and joint sealant
 * accumulated over the installation lifetime.
 */
export function calculateUDI(params: InfrastructureParams): number {
  const uvSens = UV_SENSITIVITY[params.pipe_material] ?? 1.0;
  const gumCoeff = GUM_UV_COEFFICIENT[params.gum_type] ?? 1.2;
  const burialFactor = BURIAL_FACTOR[params.burial_status] ?? 0.0;

  return (
    params.daily_uv_hours *
    365 *
    params.installation_age_years *
    uvSens *
    (1 - burialFactor) *
    gumCoeff
  );
}
