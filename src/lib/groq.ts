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
  const model = options?.model ?? 'llama-3.1-8b-instant';
  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      logprobs: options?.logprobs ?? true,
      top_logprobs: options?.topLogprobs ?? 10,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorBody}`);
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

// Default models suitable for OP-ORACLE (support logprobs)
export const ORACLE_MODELS = [
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', description: 'Fast, ideal for statistical analysis' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', description: 'More capable, harder to extract' },
  { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile', description: 'Previous gen, still powerful' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'MoE architecture, unique patterns' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Google model, different training' },
] as const;
