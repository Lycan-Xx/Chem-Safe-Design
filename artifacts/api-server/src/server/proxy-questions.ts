import type { PartialInfrastructureParams } from '../types/infrastructure.js';

interface ProxyQuestion {
  parameter: keyof PartialInfrastructureParams;
  question: string;
  confidenceReduction: number;
  quickReplies: string[];
}

export const PROXY_QUESTIONS: Record<keyof PartialInfrastructureParams, ProxyQuestion[]> = {
  pipe_material: [
    {
      parameter: 'pipe_material',
      question: "Can you press your fingernail into the pipe? " +
                "Does it leave a small dent, or is the surface too hard to mark?",
      confidenceReduction: 0.2,
      quickReplies: ['Leaves a dent', 'Too hard to dent', 'Not sure'],
    },
    {
      parameter: 'pipe_material',
      question: "What colour is the pipe — white, grey, black, or something else?",
      confidenceReduction: 0.25,
      quickReplies: ['White', 'Grey', 'Black', 'Other colour'],
    },
  ],
  gum_type: [
    {
      parameter: 'gum_type',
      question: "What did you use to join the pipes together — " +
                "a glue or cement, rubber rings, or something else?",
      confidenceReduction: 0.2,
      quickReplies: ['Glue or cement', 'Rubber rings', 'Not sure', 'Something else'],
    },
  ],
  installation_age_years: [
    {
      parameter: 'installation_age_years',
      question: "Was this pipe installed before or after your last harvest season? " +
                "Or do you know roughly what year it went in?",
      confidenceReduction: 0.25,
      quickReplies: ['Before last harvest', 'After last harvest',
                     'More than 5 years ago', 'More than 10 years ago'],
    },
    {
      parameter: 'installation_age_years',
      question: "If you tap the pipe firmly, does it feel brittle or crack easily? " +
                "Heavy brittleness usually means 10+ years of sun exposure.",
      confidenceReduction: 0.35,
      quickReplies: ['Feels brittle', 'Still flexible', 'Not sure'],
    },
  ],
  avg_temp_celsius: [
    {
      parameter: 'avg_temp_celsius',
      question: "In the hottest part of the year, how would you " +
                "describe the weather where the pipe is?",
      confidenceReduction: 0.2,
      quickReplies: ['Very hot — too hot to stand in',
                     'Hot but manageable', 'Warm', 'Mild'],
    },
  ],
  daily_uv_hours: [
    {
      parameter: 'daily_uv_hours',
      question: "Is the pipe in direct sunlight for most of the day, " +
                "partially shaded, or mostly underground?",
      confidenceReduction: 0.2,
      quickReplies: ['Direct sun all day', 'Some shade', 'Mostly underground', 'Mixed'],
    },
  ],
  water_flow_rate: [
    {
      parameter: 'water_flow_rate',
      question: "Does water run through this pipe every day, " +
                "only when you irrigate or water animals, " +
                "or does it mostly sit still?",
      confidenceReduction: 0.15,
      quickReplies: ['Every day', 'Only sometimes', 'Mostly still'],
    },
  ],
  burial_status: [
    {
      parameter: 'burial_status',
      question: "Is most of the pipe above ground and visible, " +
                "buried underground, or a mix of both?",
      confidenceReduction: 0.1,
      quickReplies: ['Above ground', 'Underground', 'Both'],
    },
  ],
  use_context: [
    {
      parameter: 'use_context',
      question: "What is this water mainly used for?",
      confidenceReduction: 0.0,
      quickReplies: ['Drinking water', 'Watering crops', 'Fish pond', 'Livestock'],
    },
  ],
  pipe_diameter_mm: [],
  population_served: [],
};

export function getProxyQuestion(
  parameter: keyof PartialInfrastructureParams,
  attemptNumber = 0,
): ProxyQuestion | null {
  const questions = PROXY_QUESTIONS[parameter];
  if (!questions || questions.length === 0) return null;
  return questions[Math.min(attemptNumber, questions.length - 1)];
}
