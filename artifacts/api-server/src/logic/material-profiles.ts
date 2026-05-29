import type { PipeMaterial, GumType, FlowRate, BurialStatus, UseContext } from '../types/infrastructure.js';

export const MATERIAL_BASE_RATE: Record<PipeMaterial, number> = {
  UPVC: 1.2,
  CPVC: 0.9,
  HDPE: 0.4,
  FLEXIBLE_PVC: 1.5,
  UNKNOWN: 1.5,
};

export const ARRHENIUS_K: Record<PipeMaterial, number> = {
  UPVC: 0.042,
  CPVC: 0.031,
  HDPE: 0.018,
  FLEXIBLE_PVC: 0.048,
  UNKNOWN: 0.048,
};

export const UV_SENSITIVITY: Record<PipeMaterial, number> = {
  UPVC: 0.8,
  CPVC: 0.6,
  HDPE: 0.3,
  FLEXIBLE_PVC: 1.0,
  UNKNOWN: 1.0,
};

export const GUM_UV_COEFFICIENT: Record<GumType, number> = {
  SOLVENT_CEMENT: 1.2,
  RUBBER_GASKET: 0.9,
  PVC_ADHESIVE: 1.1,
  UNKNOWN: 1.2,
};

export const BURIAL_FACTOR: Record<BurialStatus, number> = {
  BURIED: 0.95,
  EXPOSED: 0.0,
  MIXED: 0.4,
};

export const FLOW_FACTOR: Record<FlowRate, number> = {
  CONTINUOUS: 0.8,
  INTERMITTENT: 1.0,
  STAGNANT: 1.3,
};

export const USE_THRESHOLD_FACTOR: Record<UseContext, number> = {
  DRINKING: 0.6,
  IRRIGATION: 1.0,
  AQUACULTURE: 0.85,
  LIVESTOCK: 1.0,
};

export const WHO_BREACH_THRESHOLD: Record<UseContext, number> = {
  DRINKING: 65,
  AQUACULTURE: 70,
  LIVESTOCK: 80,
  IRRIGATION: 80,
};
