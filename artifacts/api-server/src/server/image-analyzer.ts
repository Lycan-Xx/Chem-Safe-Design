import { aiRouter } from './ai-router.js';
import type { ParameterExtraction } from '../types/agent.js';
import type { PartialInfrastructureParams } from '../types/infrastructure.js';

export interface ImageAnalysisAgentResult {
  agentMessage: string;
  extraction?: ParameterExtraction;
  triggerProxyQuestion?: boolean;
}

export async function analyzeImageForInterview(
  base64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<ImageAnalysisAgentResult> {
  const result = await aiRouter.analyzeImageDirect(base64, mimeType);

  if (result.pipe_material_confidence >= 0.75 && result.pipe_material !== 'UNKNOWN') {
    const gumPart =
      result.gum_type !== 'UNKNOWN' && result.gum_type_confidence >= 0.6
        ? ` with **${formatGumType(result.gum_type)}** joints`
        : '';

    return {
      agentMessage:
        `Based on the photo, this looks like **${result.pipe_material}** pipe` +
        `${gumPart}. Does that sound right?`,
      extraction: {
        parameter: 'pipe_material' as keyof PartialInfrastructureParams,
        value: result.pipe_material,
        confidence: result.pipe_material_confidence * 0.9,
        method: 'image_analysis',
      },
    };
  }

  if (result.pipe_material_confidence >= 0.5 && result.pipe_material !== 'UNKNOWN') {
    return {
      agentMessage:
        `The photo is a bit unclear, but it looks like it might be ` +
        `**${result.pipe_material}** — though I'm not fully certain. ` +
        `Does that match what you know about it?`,
      extraction: {
        parameter: 'pipe_material' as keyof PartialInfrastructureParams,
        value: result.pipe_material,
        confidence: result.pipe_material_confidence * 0.7,
        method: 'image_analysis',
      },
    };
  }

  return {
    agentMessage:
      "I couldn't make that out clearly from the photo. " +
      "Could you try pressing your fingernail into the pipe — " +
      "does it leave a dent, or is the surface too hard to mark?",
    triggerProxyQuestion: true,
  };
}

function formatGumType(gumType: string): string {
  const labels: Record<string, string> = {
    SOLVENT_CEMENT: 'solvent cement',
    RUBBER_GASKET: 'rubber gasket',
    PVC_ADHESIVE: 'PVC adhesive',
  };
  return labels[gumType] ?? gumType.toLowerCase();
}
