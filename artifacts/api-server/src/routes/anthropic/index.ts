import { Router, type IRouter } from "express";
import { db, conversations, messages } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  CreateAnthropicConversationBody,
  GetAnthropicConversationParams,
  DeleteAnthropicConversationParams,
  ListAnthropicMessagesParams,
  SendAnthropicMessageParams,
  SendAnthropicMessageBody,
} from "@workspace/api-zod";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

const CHEMSAFE_SYSTEM_PROMPT = `You are ChemSafe's intake agent — a conversational parameter collection assistant for water infrastructure risk assessments.

Your role: Conduct a structured interview to collect 10 infrastructure parameters required by the risk-score engine, without requiring technical knowledge from the user.

REGISTER SYSTEM:
You operate across three adaptive registers, selected automatically based on the complexity and vocabulary of the user's first 1-2 responses:
- Technical: assumes domain vocabulary (UPVC, Arrhenius, flow rate)
- Plain language: everyday terms, no jargon
- Sensory/Observational: physical interaction proxies (fingernail test, visual inspection) for users with no technical reference

CONVERSATION RULES:
- One question per turn, never two
- "I don't know" quick-reply always available
- Maximum 18 turns before closing with conservative defaults
- Full conversation history sent on every API call (stateless model)
- After confirming a parameter, acknowledge it briefly and move to the next
- Be warm but efficient — users are often in the field

PARAMETERS TO COLLECT (10 total):
1. pipe_material — UPVC, CPVC, HDPE, PVC, or Unknown
2. gum_type — solvent_cement, rubber_ring, or unknown (joint type)
3. installation_age_years — how old the pipe installation is
4. pipe_diameter_mm — optional, can skip
5. avg_temp_celsius — average temperature at the pipe location
6. daily_uv_hours — hours of direct sunlight per day
7. water_flow_rate — continuous, intermittent, or stagnant
8. buried_or_exposed — is the pipe buried, exposed to sun, or mixed
9. use_context — drinking, irrigation, fish_pond, or livestock
10. population_served — optional, can skip

PROXY QUESTIONS (use when user doesn't know):
- pipe_material: "Press your fingernail into the pipe. Does it leave a dent, or is it too hard?" (soft=PVC/flexible, hard=UPVC/CPVC)
- installation_age_years: "Was it installed before or after your last harvest season?" OR "Does the pipe crack easily when you tap it?"
- avg_temp_celsius: "Is the pipe in direct sun all day, partial shade, or mostly underground?" Map to: Full sun hot climate=38C, warm=30C, mild=22C
- daily_uv_hours: "Is this pipe in direct sunlight all day, half the day, or mostly shaded?"
- water_flow_rate: "Does water run through this pipe every day, only when you irrigate, or does it sit still most of the time?"

FIRST MESSAGE (always send this verbatim):
"I'm going to ask you 8 short questions about your water pipes. You don't need to know technical details — I'll guide you through it. If you're not sure about something, just say so and I'll help. Ready?"

CONFIDENCE SCORING:
- 1.0 = User stated value directly
- 0.8 = Inferred from clear description
- 0.6 = Inferred from sensory proxy
- 0.4 = Conservative default after "I don't know"

When you have collected all required parameters (pipe_material, gum_type, installation_age_years, avg_temp_celsius, daily_uv_hours, water_flow_rate, buried_or_exposed, use_context), send a confirmation message summarising what was collected, then on the VERY NEXT turn (or if user confirms), output EXACTLY this format at the end of your message:

ASSESSMENT_READY:{"pipe_material":"UPVC","gum_type":"solvent_cement","installation_age_years":12,"pipe_diameter_mm":null,"avg_temp_celsius":35,"daily_uv_hours":8,"water_flow_rate":"intermittent","buried_or_exposed":"exposed","use_context":"irrigation","population_served":null,"confidence_scores":{"pipe_material":0.8,"gum_type":0.6,"installation_age_years":1.0,"avg_temp_celsius":0.8,"daily_uv_hours":0.8,"water_flow_rate":1.0,"buried_or_exposed":1.0,"use_context":1.0}}

Use the actual collected values and confidence scores. Do not output this until you have all required parameters confirmed.`;

router.get("/anthropic/conversations", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(conversations)
    .orderBy(asc(conversations.createdAt));
  res.json(rows.map((r) => ({ id: r.id, title: r.title, createdAt: r.createdAt })));
});

router.post("/anthropic/conversations", async (req, res): Promise<void> => {
  const parsed = CreateAnthropicConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(conversations)
    .values({ title: parsed.data.title })
    .returning();
  res.status(201).json({ id: row.id, title: row.title, createdAt: row.createdAt });
});

router.get("/anthropic/conversations/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetAnthropicConversationParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [convo] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, params.data.id));
  if (!convo) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convo.id))
    .orderBy(asc(messages.createdAt));
  res.json({
    id: convo.id,
    title: convo.title,
    createdAt: convo.createdAt,
    messages: msgs.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  });
});

router.delete("/anthropic/conversations/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteAnthropicConversationParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(messages).where(eq(messages.conversationId, params.data.id));
  const [deleted] = await db
    .delete(conversations)
    .where(eq(conversations.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/anthropic/conversations/:id/messages", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ListAnthropicMessagesParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(asc(messages.createdAt));
  res.json(
    msgs.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  );
});

router.post("/anthropic/conversations/:id/messages", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramsResult = SendAnthropicMessageParams.safeParse({ id: parseInt(rawId, 10) });
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyResult = SendAnthropicMessageBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: bodyResult.error.message });
    return;
  }

  const conversationId = paramsResult.data.id;

  const [convo] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));
  if (!convo) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({
    conversationId,
    role: "user",
    content: bodyResult.data.content,
  });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  const chatMessages = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: CHEMSAFE_SYSTEM_PROMPT,
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: unknown) {
    req.log.error({ err }, "Anthropic stream error");
    res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
    res.end();
  }
});

export default router;
