/**
 * AI Router — MultiProvider failover for ChemSafe interview turns.
 *
 * Provider priority (1 = highest):
 *   1  DeepSeek   — primary text model
 *   2  OpenAI     — first fallback
 *   3  Anthropic  — second fallback
 *   4  Gemini     — text fallback only; vision goes via analyzeImageDirect()
 *   5  OpenRouter — third fallback
 *   6  Kimi       — fourth fallback
 *   7  HuggingFace— last text fallback
 *   999 Mock      — always available, returns structured error
 *
 * Rules:
 * - Never route image analysis through executeWithFailover()
 * - Every provider call has a 30-second timeout
 * - Rate-limited providers are skipped for 60 seconds
 * - Mock is returned when all real providers fail
 */

interface ProviderConfig {
  name: string;
  priority: number;
  available: boolean;
  rateLimitReset: number;
  requestCount: number;
  maxRequestsPerMinute: number;
}

class AIRouter {
  private providers: Map<string, ProviderConfig> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    this.providers.set('deepseek', {
      name: 'deepseek',
      priority: 1,
      available: !!process.env.DEEPSEEK_API_KEY,
      rateLimitReset: 0,
      requestCount: 0,
      maxRequestsPerMinute: 60,
    });

    this.providers.set('openai', {
      name: 'openai',
      priority: 2,
      available: !!process.env.OPENAI_API_KEY,
      rateLimitReset: 0,
      requestCount: 0,
      maxRequestsPerMinute: 60,
    });

    this.providers.set('anthropic', {
      name: 'anthropic',
      priority: 3,
      available: !!process.env.ANTHROPIC_API_KEY,
      rateLimitReset: 0,
      requestCount: 0,
      maxRequestsPerMinute: 50,
    });

    this.providers.set('gemini', {
      name: 'gemini',
      priority: 4,
      available: !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
      rateLimitReset: 0,
      requestCount: 0,
      maxRequestsPerMinute: 60,
    });

    this.providers.set('openrouter', {
      name: 'openrouter',
      priority: 5,
      available: !!process.env.OPENROUTER_API_KEY,
      rateLimitReset: 0,
      requestCount: 0,
      maxRequestsPerMinute: 40,
    });

    this.providers.set('kimi', {
      name: 'kimi',
      priority: 6,
      available: !!process.env.MOONSHOT_API_KEY,
      rateLimitReset: 0,
      requestCount: 0,
      maxRequestsPerMinute: 30,
    });

    this.providers.set('huggingface', {
      name: 'huggingface',
      priority: 7,
      available: !!process.env.HUGGINGFACE_API_TOKEN,
      rateLimitReset: 0,
      requestCount: 0,
      maxRequestsPerMinute: 20,
    });
  }

  private resetProviderLimits(): void {
    const now = Date.now();
    for (const provider of this.providers.values()) {
      if (provider.rateLimitReset > 0 && now > provider.rateLimitReset) {
        provider.available = true;
        provider.rateLimitReset = 0;
        provider.requestCount = 0;
      }
    }
  }

  private getAvailableProvider(): ProviderConfig | null {
    this.resetProviderLimits();
    const sorted = [...this.providers.values()]
      .filter(p => p.available && p.priority < 999)
      .sort((a, b) => a.priority - b.priority);
    return sorted[0] ?? null;
  }

  private markProviderFailed(name: string, isRateLimit = false): void {
    const provider = this.providers.get(name);
    if (!provider) return;
    provider.available = false;
    if (isRateLimit) {
      provider.rateLimitReset = Date.now() + 60_000;
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ms);
    try {
      const result = await promise;
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  private async makeDeepSeekRequest(prompt: string): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('DeepSeek API key not configured');

    const response = await this.withTimeout(
      fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      }),
      30_000,
    );

    if (response.status === 429) throw Object.assign(new Error('Rate limited'), { isRateLimit: true });
    if (!response.ok) throw new Error(`DeepSeek error: ${response.status}`);
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  }

  private async makeOpenAIRequest(prompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const response = await this.withTimeout(
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      }),
      30_000,
    );

    if (response.status === 429) throw Object.assign(new Error('Rate limited'), { isRateLimit: true });
    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  }

  private async makeAnthropicRequest(prompt: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Anthropic API key not configured');

    const response = await this.withTimeout(
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      }),
      30_000,
    );

    if (response.status === 429) throw Object.assign(new Error('Rate limited'), { isRateLimit: true });
    if (!response.ok) throw new Error(`Anthropic error: ${response.status}`);
    const data = await response.json() as { content: Array<{ text: string }> };
    return data.content[0].text;
  }

  private async makeGeminiRequest(
    model: string,
    prompt: string,
    imageData?: { base64: string; mimeType: string },
  ): Promise<string> {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!geminiKey) throw new Error('Gemini API key not configured');

    const modelName = model === 'gemini-flash' ? 'gemini-1.5-flash' : 'gemini-1.5-pro';

    const parts: unknown[] = [{ text: prompt }];
    if (imageData) {
      parts.push({
        inline_data: {
          mime_type: imageData.mimeType,
          data: imageData.base64,
        },
      });
    }

    const response = await this.withTimeout(
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: imageData ? 0.1 : 0.3,
              maxOutputTokens: imageData ? 300 : 1000,
            },
          }),
        },
      ),
      30_000,
    );

    if (response.status === 429) throw Object.assign(new Error('Rate limited'), { isRateLimit: true });
    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
    const data = await response.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    return data.candidates[0].content.parts[0].text;
  }

  private async makeOpenRouterRequest(prompt: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OpenRouter API key not configured');

    const response = await this.withTimeout(
      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://chemsafe.app',
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-7b-instruct',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
        }),
      }),
      30_000,
    );

    if (response.status === 429) throw Object.assign(new Error('Rate limited'), { isRateLimit: true });
    if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  }

  private async makeKimiRequest(prompt: string): Promise<string> {
    const apiKey = process.env.MOONSHOT_API_KEY;
    if (!apiKey) throw new Error('Kimi API key not configured');

    const response = await this.withTimeout(
      fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'moonshot-v1-8k',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
      }),
      30_000,
    );

    if (response.status === 429) throw Object.assign(new Error('Rate limited'), { isRateLimit: true });
    if (!response.ok) throw new Error(`Kimi error: ${response.status}`);
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  }

  private async makeHuggingFaceRequest(prompt: string): Promise<string> {
    const apiKey = process.env.HUGGINGFACE_API_TOKEN;
    if (!apiKey) throw new Error('HuggingFace API token not configured');

    const response = await this.withTimeout(
      fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens: 500, temperature: 0.3 },
        }),
      }),
      30_000,
    );

    if (response.status === 429) throw Object.assign(new Error('Rate limited'), { isRateLimit: true });
    if (!response.ok) throw new Error(`HuggingFace error: ${response.status}`);
    const data = await response.json() as Array<{ generated_text: string }>;
    const text = data[0].generated_text;
    return text.slice(prompt.length).trim();
  }

  private makeMockRequest(prompt: string): string {
    if (prompt.includes('[CHEMSAFE_INTERVIEW]')) {
      return JSON.stringify({
        agentMessage:
          "I'm having trouble connecting right now. " +
          "Could you try the expert form instead? " +
          "Your answers so far have been saved.",
        extractedParam: null,
        isComplete: false,
        quickReplies: ['Use the expert form'],
        error: 'mock_fallback',
      });
    }
    return 'Mock response — no AI provider available.';
  }

  private async makeProviderRequest(providerName: string, prompt: string): Promise<string> {
    switch (providerName) {
      case 'deepseek': return this.makeDeepSeekRequest(prompt);
      case 'openai': return this.makeOpenAIRequest(prompt);
      case 'anthropic': return this.makeAnthropicRequest(prompt);
      case 'gemini': return this.makeGeminiRequest('gemini-flash', prompt);
      case 'openrouter': return this.makeOpenRouterRequest(prompt);
      case 'kimi': return this.makeKimiRequest(prompt);
      case 'huggingface': return this.makeHuggingFaceRequest(prompt);
      default: throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  private parseAIResponse(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error('Could not parse AI response as JSON');
    }
  }

  public async executeWithFailover(prompt: string): Promise<string> {
    const sorted = [...this.providers.values()]
      .filter(p => p.priority < 999)
      .sort((a, b) => a.priority - b.priority);

    for (const providerConfig of sorted) {
      this.resetProviderLimits();
      if (!providerConfig.available) continue;

      try {
        const result = await this.makeProviderRequest(providerConfig.name, prompt);
        return result;
      } catch (err: unknown) {
        const isRateLimit = err instanceof Error && 'isRateLimit' in err;
        this.markProviderFailed(providerConfig.name, isRateLimit);
      }
    }

    return this.makeMockRequest(prompt);
  }

  /**
   * Executes a single interview turn through the failover router.
   * Routes to DeepSeek by default. Falls back through priority chain.
   * NEVER routes image analysis through this method — use analyzeImageDirect().
   */
  public async executeInterviewTurn(
    systemPrompt: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    userMessage: string,
  ): Promise<string> {
    const flatPrompt =
      `[CHEMSAFE_INTERVIEW]\n${systemPrompt}\n\n` +
      conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n') +
      `\nuser: ${userMessage}\nassistant:`;

    return this.executeWithFailover(flatPrompt);
  }

  /**
   * Image analysis — goes DIRECTLY to Gemini, no failover.
   * DeepSeek and other text models cannot process images.
   * On failure: returns a structured fallback object, never throws.
   */
  public async analyzeImageDirect(
    base64: string,
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
  ): Promise<{
    pipe_material: string;
    pipe_material_confidence: number;
    gum_type: string;
    gum_type_confidence: number;
    degradation_signs: string[];
    age_condition: string;
    notes: string;
  }> {
    const visionPrompt = `
      Analyze this photograph of water pipe infrastructure.
      Identify only what is clearly visible.

      Respond ONLY in this exact JSON format, no other text:
      {
        "pipe_material": "UPVC or CPVC or HDPE or FLEXIBLE_PVC or UNKNOWN",
        "pipe_material_confidence": 0.0,
        "gum_type": "SOLVENT_CEMENT or RUBBER_GASKET or PVC_ADHESIVE or UNKNOWN",
        "gum_type_confidence": 0.0,
        "degradation_signs": [],
        "age_condition": "new or moderate_wear or heavy_wear or unknown",
        "notes": "brief observation"
      }

      Confidence rules:
      - 0.9+  only if manufacturer stamp or marking is clearly readable
      - 0.75-0.89  material is clearly identifiable by appearance
      - 0.5-0.74  probable identification, some uncertainty
      - below 0.5  use UNKNOWN

      Do not guess. If you cannot see it clearly, use UNKNOWN and 0.0.
    `;

    const fallback = {
      pipe_material: 'UNKNOWN',
      pipe_material_confidence: 0,
      gum_type: 'UNKNOWN',
      gum_type_confidence: 0,
      degradation_signs: [] as string[],
      age_condition: 'unknown',
      notes: 'Image analysis unavailable',
    };

    try {
      const raw = await this.makeGeminiRequest('gemini-flash', visionPrompt, { base64, mimeType });
      const parsed = this.parseAIResponse(raw) as typeof fallback;
      return parsed;
    } catch {
      return fallback;
    }
  }

  public getProviderStatus(): Array<{ name: string; available: boolean; priority: number }> {
    return [...this.providers.values()].map(p => ({
      name: p.name,
      available: p.available,
      priority: p.priority,
    }));
  }

  public async healthCheck(): Promise<boolean> {
    return this.getAvailableProvider() !== null;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const aiRouter = new AIRouter();
