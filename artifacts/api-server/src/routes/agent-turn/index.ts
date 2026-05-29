import { Router, type IRouter } from 'express';
import { processInterviewTurn } from '../../server/intake-agent.js';
import { analyzeImageForInterview } from '../../server/image-analyzer.js';
import type { AgentTurnRequest, AgentTurnResponse } from '../../types/agent.js';

const router: IRouter = Router();

router.post('/agent-turn', async (req, res): Promise<void> => {
  const body = req.body as AgentTurnRequest;

  if (
    !body ||
    typeof body.turnCount !== 'number' ||
    !Array.isArray(body.conversationHistory)
  ) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  // Coerce missing fields to safe defaults so partial payloads don't crash
  body.userMessage = body.userMessage ?? '';
  body.currentParams = body.currentParams ?? {};
  body.confidenceScores = body.confidenceScores ?? {};
  body.register = body.register ?? 'undetected';
  body.sessionId = body.sessionId ?? 'unknown';

  try {
    let turnResult: AgentTurnResponse;

    if (body.imageData) {
      const imageResult = await analyzeImageForInterview(
        body.imageData.base64,
        body.imageData.mimeType,
      );

      turnResult = {
        agentMessage: imageResult.agentMessage,
        extractedParam: imageResult.extraction,
        updatedRegister: body.register,
        isComplete: false,
        quickReplies: ["Yes, that's right", "No, that's wrong"],
        triggerImageUpload: false,
      };
    } else {
      turnResult = await processInterviewTurn(body);
    }

    res.json(turnResult);
  } catch (error) {
    req.log.error({ error }, 'agent-turn error');

    const fallback: AgentTurnResponse = {
      agentMessage:
        "I'm having trouble right now. Your progress has been saved. " +
        "You can continue on the expert form if you prefer.",
      updatedRegister: 'undetected',
      isComplete: false,
      quickReplies: ['Use the expert form', 'Try again'],
      error: error instanceof Error ? error.message : 'Unknown server error',
    };

    res.json(fallback);
  }
});

export default router;
