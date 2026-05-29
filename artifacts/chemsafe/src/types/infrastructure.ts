export type PipeMaterial =
  | 'UPVC' | 'CPVC' | 'HDPE' | 'FLEXIBLE_PVC' | 'UNKNOWN';

export type GumType =
  | 'SOLVENT_CEMENT' | 'RUBBER_GASKET' | 'PVC_ADHESIVE' | 'UNKNOWN';

export type FlowRate =
  | 'CONTINUOUS' | 'INTERMITTENT' | 'STAGNANT';

export type UseContext =
  | 'DRINKING' | 'IRRIGATION' | 'AQUACULTURE' | 'LIVESTOCK';

export type BurialStatus = 'EXPOSED' | 'BURIED' | 'MIXED';

export interface InfrastructureParams {
  pipe_material: PipeMaterial;
  gum_type: GumType;
  installation_age_years: number;
  pipe_diameter_mm?: number;
  avg_temp_celsius: number;
  daily_uv_hours: number;
  water_flow_rate: FlowRate;
  burial_status: BurialStatus;
  use_context: UseContext;
  population_served?: number;
}

export type PartialInfrastructureParams = Partial<InfrastructureParams>;
