import type { UserRegister } from '../types/agent.js';

const TECHNICAL_TERMS = [
  'upvc', 'cpvc', 'hdpe', 'pvc', 'psi', 'bar', 'diameter',
  'flow rate', 'uv', 'polymer', 'schedule 40', 'nominal bore',
  'solvent cement', 'compressive strength',
];

const UNCERTAINTY_MARKERS = [
  "don't know", "not sure", "no idea", "what do you mean",
  "i don't understand", "idk", "huh", "what's that",
  "never heard", "what is",
];

export function detectRegister(firstReply: string): UserRegister {
  const lower = firstReply.toLowerCase().trim();
  const wordCount = lower.split(/\s+/).length;

  if (TECHNICAL_TERMS.some(t => lower.includes(t))) {
    return 'technical';
  }

  if (UNCERTAINTY_MARKERS.some(m => lower.includes(m))) {
    return 'sensory';
  }

  if (wordCount <= 3) {
    return 'sensory';
  }

  if (wordCount >= 5) {
    return 'plain';
  }

  return 'undetected';
}
