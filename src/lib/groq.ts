// Groq API client with logprob support — SERVER ONLY
// Player-supplied API keys route through this proxy

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export interface GroqLogprobToken {
  token: string;
  logprob: number;
  bytes?: number[];
  top_logprobs: Array<{
    token: string;
    logprob: number;
    bytes?: number[];
  }>;
}

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    logprobs: {
      content: GroqLogprobToken[];
    } | null;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_time: number;
    completion_time: number;
    total_time: number;
  };
}

export async function queryGroq(
  apiKey: string,
  messages: GroqMessage[],
  options?: {
    model?: string;
    logprobs?: boolean;
    topLogprobs?: number;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<GroqChatResponse> {
  const model = options?.model ?? 'llama-3.3-70b-versatile';
  const wantLogprobs = options?.logprobs ?? true;

  // Try with logprobs first; if the model doesn't support them, retry without.
  let response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      logprobs: wantLogprobs,
      top_logprobs: wantLogprobs ? (options?.topLogprobs ?? 10) : undefined,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    // If the model doesn't support logprobs, retry without them
    if (wantLogprobs && response.status === 400 && errorBody.includes('logprobs')) {
      response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 1024,
        }),
      });
      if (!response.ok) {
        const retryBody = await response.text();
        throw new Error(`Groq API error (${response.status}): ${retryBody}`);
      }
    } else {
      throw new Error(`Groq API error (${response.status}): ${errorBody}`);
    }
  }

  return response.json();
}

export async function validateGroqApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${GROQ_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getGroqModels(apiKey: string): Promise<string[]> {
  const response = await fetch(`${GROQ_BASE_URL}/models`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return (data.data || []).map((m: { id: string }) => m.id);
}

// Default models suitable for OP-ORACLE
// Note: logprob support varies by model on Groq. The queryGroq function
// auto-retries without logprobs if a model doesn't support them.
export const ORACLE_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', description: 'More capable, harder to extract' },
  { id: 'llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', description: 'Latest MoE, fast inference' },
  { id: 'llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B', description: 'Largest MoE, most complex' },
  { id: 'qwen3-32b', name: 'Qwen3 32B', description: 'Alibaba model, different architecture' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Google model, different training' },
] as const;
