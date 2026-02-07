/**
 * LLM service for generating learning stickies from a user-provided domain (area of interest).
 * User inputs a topic (e.g. "React hooks", "machine learning"); LLM returns key concepts
 * with definitions, examples, and related terms to display as stickies.
 */

import OpenAI from 'openai';

export interface LearningStickyItem {
  concept: string;
  definition: string;
  example: string | null;
  relatedTerms: string[];
}

export interface LearningStickiesGeneratorConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
}

export class LearningStickiesGenerator {
  private client: OpenAI;
  private model: string;
  private temperature: number;

  constructor(config: LearningStickiesGeneratorConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: 60000,
    });
    this.model = config.model ?? 'gpt-4o-mini';
    this.temperature = config.temperature ?? 0.5;
  }

  /**
   * Given a new area summary and existing domain names, return an existing domain that is
   * the same or very similar (so we can merge new stickies into it). Returns null if none match.
   */
  async findSimilarDomain(
    newAreaSummary: string,
    existingDomains: string[]
  ): Promise<string | null> {
    if (existingDomains.length === 0 || !newAreaSummary.trim()) return null;
    const normalizedNew = newAreaSummary.trim().toLowerCase();
    for (const d of existingDomains) {
      if (d.trim().toLowerCase() === normalizedNew) return d;
    }
    if (existingDomains.length === 1) return null;
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are a classifier. Given a list of existing learning area names and a new area name, say if the new one is the SAME or VERY SIMILAR topic as one of the existing ones (e.g. "React Hooks" vs "react hooks", "Driver's License" vs "Driving test"). Reply with exactly one line: the existing area name if there is a match, or the word "none" if no match. No explanation.`,
        },
        {
          role: 'user',
          content: `Existing areas: ${existingDomains.map((d) => `"${d}"`).join(', ')}.\nNew area: "${newAreaSummary}".\nSame or very similar existing area name, or "none"?`,
        },
      ],
      temperature: 0,
      max_tokens: 50,
    });
    const content = response.choices[0]?.message?.content?.trim().toLowerCase();
    if (!content || content === 'none') return null;
    const match = existingDomains.find((d) => d.trim().toLowerCase() === content);
    if (match) return match;
    const partialMatch = existingDomains.find((d) => content.includes(d.trim().toLowerCase()) || d.trim().toLowerCase().includes(content));
    return partialMatch ?? null;
  }

  /**
   * Generate learning stickies from a user request (topic, goal, or natural-language description).
   * Returns a short summarized area name (for display in the areas list) and the learning stickies.
   * The area summary is derived from the user prompt (e.g. "help me prepare for driver's license test" → "Driver's license test preparation").
   */
  async generateForDomain(domain: string): Promise<{ areaSummary: string; learningStickies: LearningStickyItem[] }> {
    const systemPrompt = `You are a helpful tutor. The user will describe what they want to learn in natural language. They might give:
- A topic or domain (e.g. "React hooks", "machine learning")
- A goal or request (e.g. "help me prepare for driver's license test", "I need to learn basics of investing")

Your job is to:
1. Summarize their request into a very short "area" title (2–4 words) for display in a list. Be concise: e.g. "Driver's License", "React Hooks", "Investing Basics". No long phrases—just a clean, scannable label.
2. Generate "learning stickies" that would actually help them—with SPECIFIC, actionable content, not generic definitions.

Return a JSON object with "areaSummary" (string) and "learningStickies" (array). Each sticky must have:
- concept: Short name of the concept (e.g. "Speed Limits (California)", "Yield Sign", "Parallel Parking")
- definition: A clear, SPECIFIC definition with concrete facts, numbers, or rules. Not a generic textbook definition.
- example: A brief example or concrete context (string), or null if not applicable
- relatedTerms: Array of 0–5 related terms or concepts (strings)

CRITICAL—Be specific, not generic:
- When the topic involves laws, rules, or location-dependent facts (driving, traffic, taxes, licensing), use a concrete jurisdiction. If the user does not specify a state/country, default to a common one (e.g. California for US driver's license, or say "typically in California" or "per California law") and give actual numbers and conditions.
- Example: For "speed limit" in a driver's test context, do NOT say "the maximum legal speed." DO say something like: "California: 25 mph in residential and business districts; 25 mph in school zones when children are present; 65 mph on most freeways (55 mph for trucks); 55 mph on two-lane undivided highways; 15 mph in alleys."
- Prefer stickies that teach concrete rules (e.g. "Right-of-Way at Uncontrolled T-Intersection (California): vehicle on the terminating road yields to traffic on the through road") over abstract concepts.
- For driving: include actual speed limits by road type, specific right-of-way rules, what signs mean in practice, and state-specific details where relevant.
- For other domains: use real numbers, named examples, or a specific framework/standard instead of vague descriptions.
- Definitions should be accurate, beginner-friendly, and immediately useful for the user's goal (e.g. passing a test or applying the knowledge).
- Cover 4–10 key concepts. Return valid JSON only; no markdown code fences.`;

    const userPrompt = `The user wants to learn something. Here is their request:

"${domain}"

1. First, summarize this into a clean, short area title (2–4 words only), e.g. "Driver's License", "React Hooks", "Investing Basics".
2. Then generate learning stickies that will help them. Use SPECIFIC facts and rules. Do not give generic definitions.

Return a JSON object with this exact structure:
{
  "areaSummary": "Short 2-4 word title",
  "learningStickies": [
    {
      "concept": "Concept name",
      "definition": "Clear definition.",
      "example": "Brief example or null",
      "relatedTerms": ["term1", "term2"]
    }
  ]
}`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.temperature,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from LLM');
    }

    const parsed = JSON.parse(content) as {
      areaSummary?: string;
      learningStickies?: unknown[];
    };
    if (!parsed.learningStickies || !Array.isArray(parsed.learningStickies)) {
      throw new Error('Invalid response format: missing learningStickies array');
    }

    const areaSummary =
      typeof parsed.areaSummary === 'string' && parsed.areaSummary.trim()
        ? parsed.areaSummary.trim()
        : domain.trim().slice(0, 80);

    const learningStickies: LearningStickyItem[] = [];
    for (const s of parsed.learningStickies) {
      const item = s as Record<string, unknown>;
      if (!item.concept || typeof item.concept !== 'string') continue;
      if (!item.definition || typeof item.definition !== 'string') continue;
      const example = item.example == null ? null : String(item.example);
      const relatedTerms = Array.isArray(item.relatedTerms)
        ? item.relatedTerms.map((t) => String(t))
        : [];
      learningStickies.push({
        concept: item.concept,
        definition: item.definition,
        example: example || null,
        relatedTerms,
      });
    }
    return { areaSummary, learningStickies };
  }
}

export function createLearningStickiesGenerator(): LearningStickiesGenerator {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Set it in your .env file.'
    );
  }
  return new LearningStickiesGenerator({
    apiKey,
    model: process.env.LEARNING_STICKIES_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.LEARNING_STICKIES_TEMPERATURE || '0.5'),
  });
}
