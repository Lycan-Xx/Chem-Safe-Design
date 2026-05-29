import type { ParameterExtraction } from '../types/agent.js';
import type { PartialInfrastructureParams } from '../types/infrastructure.js';

const EXTRACT_PATTERN = /\[EXTRACT\]([\s\S]*?)\[\/EXTRACT\]/;

export function parseExtraction(rawResponse: string): {
  displayText: string;
  extraction: ParameterExtraction | null;
} {
  const match = rawResponse.match(EXTRACT_PATTERN);

  const displayText = rawResponse.replace(EXTRACT_PATTERN, '').trim();

  if (!match) {
    return { displayText, extraction: null };
  }

  try {
    const raw = JSON.parse(match[1].trim());

    if (!raw.parameter || raw.value === undefined || raw.confidence === undefined) {
      return { displayText, extraction: null };
    }

    return {
      displayText,
      extraction: {
        parameter: raw.parameter as keyof PartialInfrastructureParams,
        value: raw.value,
        confidence: Math.min(1.0, Math.max(0.0, Number(raw.confidence))),
        method: raw.method || 'description_inference',
      },
    };
  } catch {
    return { displayText, extraction: null };
  }
}
