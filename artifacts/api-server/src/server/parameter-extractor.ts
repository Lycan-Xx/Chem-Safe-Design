import { logger } from '../lib/logger.js';
import type { ParameterExtraction } from '../types/agent.js';
import type { PartialInfrastructureParams } from '../types/infrastructure.js';

const EXTRACT_PATTERN = /\[EXTRACT\]([\s\S]*?)\[\/EXTRACT\]/g;

export function parseExtraction(rawResponse: string): {
  displayText: string;
  extraction: ParameterExtraction | null;
} {
  const allMatches = [...rawResponse.matchAll(EXTRACT_PATTERN)];
  const match = allMatches[0] ?? null;

  // Strip ALL [EXTRACT] blocks from display text — even if DeepSeek emitted several
  const displayText = rawResponse.replace(EXTRACT_PATTERN, '').trim();

  if (!match) {
    logger.info("No [EXTRACT] block found in AI response");
    return { displayText, extraction: null };
  }

  try {
    const raw = JSON.parse(match[1].trim());

    if (!raw.parameter || raw.value === undefined || raw.confidence === undefined) {
      logger.warn({ raw }, "Invalid [EXTRACT] block format or missing fields");
      return { displayText, extraction: null };
    }

    const extraction: ParameterExtraction = {
      parameter: raw.parameter as keyof PartialInfrastructureParams,
      value: raw.value,
      confidence: Math.min(1.0, Math.max(0.0, Number(raw.confidence))),
      method: raw.method || 'description_inference',
    };

    logger.info({ extraction }, "Successfully parsed parameter [EXTRACT] block");
    return { displayText, extraction };
  } catch (err) {
    logger.error({ err, matchText: match[1] }, "Failed to parse [EXTRACT] block JSON");
    return { displayText, extraction: null };
  }
}
