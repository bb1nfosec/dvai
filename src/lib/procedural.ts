// Procedural Challenge Data Generation — Anti-Cheat Core
//
// DESIGN PRINCIPLE: Source code reveals ALGORITHMS but NEVER session data.
// Every challenge instance generates unique data using crypto.randomBytes.
// Reading the source tells you HOW challenges work, but NOT the answer.
//
// Claude Code / AI-assisted source reading is the primary threat model.
// Defense: all answer-carrying data is either (a) random per-session or
// (b) drawn from pools too large to enumerate in a reasonable time.

import { randomBytes } from 'crypto';

// ─── Procedural Word Generation (OP-ORACLE L4) ───────────────
// Generates pronounceable-looking words NOT from any static dictionary.
// Uses consonant-vowel syllable patterns with crypto-random selection.
// Output space per word: ~100M.  4-word passphrase: ~10^32 combos.

const CONSONANTS = 'bcdfghjklmnpqrstvwxyz';
const VOWELS = 'aeiou';
const SYLLABLE_STRUCTURES = ['cv', 'cvc', 'vc', 'ccv', 'vcc', 'cvcc'];

export function generateProceduralWord(): string {
  const b = randomBytes(12);
  let idx = 0;
  const numSyllables = 1 + (b[idx++] % 3); // 1–3 syllables
  let word = '';

  for (let s = 0; s < numSyllables; s++) {
    const struct = SYLLABLE_STRUCTURES[b[idx++ % 12] % SYLLABLE_STRUCTURES.length];
    for (const ch of struct) {
      const pool = ch === 'c' ? CONSONANTS : VOWELS;
      word += pool[b[idx++ % 12] % pool.length];
    }
  }
  return word;
}

// ─── Dynamic Flag Generation (OP-OUROBOROS) ──────────────────
// Pure crypto-random hex. No word pools, no enumerable combinations.
// Output space: 16^24 ≈ 2.8 × 10^28 — impossible to enumerate.

export function generateDynamicFlag(): string {
  return `dvai-${randomBytes(12).toString('hex')}`;
}

// ─── Dynamic Secret Generation (OP-CARTESIAN) ────────────────
// Non-UUID format. Random hex with dash separators.
// Output space: 16^32 ≈ 3.4 × 10^38 — impossible to enumerate.

export function generateDynamicSecret(): string {
  const hex = randomBytes(16).toString('hex');
  return hex.match(/.{1,4}/g)!.join('-');
}

// ─── Dynamic Detection Pattern Builder ──────────────────────
// Builds regex patterns from a target claim string at RUNTIME.
// Source reveals the algorithm but NOT the specific patterns for any session.
// Used by SCHEMAPOISON and LONGCON.

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'by',
  'of', 'in', 'to', 'for', 'on', 'with', 'at', 'it', 'its', 'that',
  'this', 'and', 'or', 'not', 'has', 'have', 'had', 'do', 'does',
  'did', 'can', 'could', 'would', 'should', 'may', 'might', 'will',
]);

export function buildDetectionPatterns(claim: string): RegExp[] {
  const normalized = claim.toLowerCase().trim();
  const words = normalized.split(/\s+/).filter(w => w.length > 1);
  const patterns: RegExp[] = [];

  // 1. Full claim — word order preserved, flexible whitespace
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  patterns.push(new RegExp(escaped.replace(/\s+/g, '\\s+'), 'i'));

  // 2. Adjacent content-word pairs with a flexible gap (0–4 words between)
  const content = words.filter(w => !STOP_WORDS.has(w) && w.length > 2);
  for (let i = 0; i < content.length - 1; i++) {
    const a = content[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const b = content[i + 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    patterns.push(new RegExp(`${a}(?:\\s+(?:\\w+\\s+){0,4})?${b}`, 'i'));
  }

  // 3. First and last content words with any gap
  if (content.length >= 3) {
    const first = content[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const last = content[content.length - 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    patterns.push(new RegExp(`${first}.*${last}`, 'i'));
  }

  // Deduplicate by string representation
  const seen = new Set<string>();
  return patterns.filter(p => {
    const key = p.toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Dynamic Direct-Ask Pattern Builder (OP-LONGCON) ────────
// Builds patterns that detect when a user directly asks the AI to
// state the target claim (which should be penalised).

export function buildDirectAskPatterns(claim: string): RegExp[] {
  const normalized = claim.toLowerCase().trim();
  const words = normalized.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
  const patterns: RegExp[] = [];

  // "say that {claim}" patterns
  patterns.push(new RegExp(`(?:say|tell|state|confirm|agree|repeat)(?:\\s+\\w+){0,3}\\s+${words.slice(0, Math.min(3, words.length)).join('\\s+')}`, 'i'));
  patterns.push(new RegExp(`(?:just|please|can\\s+you|could\\s+you)\\s+(?:say|tell)\\s+.*${words[0]}`, 'i'));

  // "isn't it true that {claim}" patterns
  if (words.length >= 2) {
    patterns.push(new RegExp(`(?:isn'?t|is\\s+it)\\s+.*${words[0]}.*${words[1]}`, 'i'));
  }

  return patterns;
}

// ─── Dynamic Test Input Generation (OP-EIGENBLIND) ──────────
// Generates classification test inputs from templates + random data.
// Source reveals templates but NOT the specific generated text.

interface InputTemplate {
  template: (subject: string, detail: string) => string;
  category: string;
}

const SENTIMENT_NEGATIVE: InputTemplate[] = [
  { template: (s, d) => `This ${s} is absolutely terrible. ${d} Worst experience ever.`, category: 'product review' },
  { template: (s, d) => `I am completely disgusted with ${s}. ${d} Never going back.`, category: 'service review' },
  { template: (s, d) => `${s} is a complete waste of time and money. ${d} I want a refund immediately.`, category: 'consumer complaint' },
  { template: (s, d) => `The ${s} experience was horrific. ${d} I cannot believe how bad this was.`, category: 'event review' },
  { template: (s, d) => `I deeply regret purchasing ${s}. ${d} This has been nothing but frustration.`, category: 'purchase review' },
];

const SENTIMENT_POSITIVE: InputTemplate[] = [
  { template: (s, d) => `I absolutely love ${s}! ${d} Best decision I have ever made.`, category: 'product review' },
  { template: (s, d) => `${s} exceeded all my expectations. ${d} I cannot recommend it enough!`, category: 'recommendation' },
  { template: (s, d) => `The quality of ${s} is outstanding. ${d} Truly impressive craftsmanship.`, category: 'quality review' },
];

const TOXIC_INPUTS: InputTemplate[] = [
  { template: (s, d) => `You are the most worthless ${s} I have ever encountered. ${d} You are absolute scum.`, category: 'personal attack' },
  { template: (s, d) => `People like you who support ${s} don't deserve to exist. ${d} You are garbage.`, category: 'harassment' },
  { template: (s, d) => `${s} supporters are the dumbest people alive. ${d} Go back to your cave, moron.`, category: 'insult' },
];

const SAFE_INPUTS: InputTemplate[] = [
  { template: (s, d) => `Thank you for sharing your perspective on ${s}. ${d} I found your analysis quite insightful.`, category: 'civil discussion' },
  { template: (s, d) => `I have been researching ${s} recently. ${d} Would you be open to discussing the evidence further?`, category: 'polite inquiry' },
];

const SPAM_INPUTS: InputTemplate[] = [
  { template: (s, d) => `CONGRATULATIONS!!! You have been selected as the WINNER of our exclusive ${s}! Click here NOW to claim your prize! ${d}`, category: 'lottery scam' },
  { template: (s, d) => `URGENT: Your ${s} account has been compromised! Verify your identity immediately at secure-${d}-verify.xyz!`, category: 'phishing' },
  { template: (s, d) => `Make $10,000 PER WEEK with ${s}! No experience needed! ${d} Limited spots available!`, category: 'work-from-home scam' },
];

const HAM_INPUTS: InputTemplate[] = [
  { template: (s, d) => `Hi, just wanted to confirm our meeting about ${s} tomorrow at 1pm. ${d} Let me know if that works.`, category: 'personal message' },
  { template: (s, d) => `The team meeting about ${s} has been rescheduled to Thursday. ${d} Please review the timeline before we discuss.`, category: 'work communication' },
];

const SUBJECTS = [
  'the new software update', 'this restaurant', 'the customer service',
  'the latest phone model', 'the delivery service', 'the online course',
  'the streaming platform', 'the fitness program', 'the meal delivery',
  'the cloud storage plan', 'the VPN service', 'the project management tool',
  'the email client', 'the web hosting', 'the subscription box',
];

const DETAILS = [
  'Everything went wrong from start to finish.',
  'I would give zero stars if I could.',
  'The support team was completely unresponsive.',
  'It took three weeks to arrive and was damaged.',
  'The interface is confusing and buggy.',
  'It does not work as advertised at all.',
  'The quality is shockingly poor for the price.',
  'I have never been so disappointed.',
];

export interface GeneratedTestInput {
  text: string;
  correctClass: string;
  category: string;
}

export function generateTestInputs(taskType: 'sentiment' | 'toxicity' | 'spam'): GeneratedTestInput[] {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const pickUnique = <T>(arr: T[], n: number): T[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  };

  const results: GeneratedTestInput[] = [];

  switch (taskType) {
    case 'sentiment': {
      // 2 negative + 1 positive + 1 neutral
      for (const t of pickUnique(SENTIMENT_NEGATIVE, 2)) {
        results.push({ text: t.template(pick(SUBJECTS), pick(DETAILS)), correctClass: 'NEGATIVE', category: t.category });
      }
      for (const t of pickUnique(SENTIMENT_POSITIVE, 1)) {
        results.push({ text: t.template(pick(SUBJECTS), pick(DETAILS)), correctClass: 'POSITIVE', category: t.category });
      }
      // Neutral: factual statement
      results.push({
        text: `The ${pick(SUBJECTS)} report shows a ${Math.floor(Math.random() * 20 + 5)}% increase compared to last quarter. The team will review the data on ${pick(['Monday', 'Tuesday', 'Wednesday', 'Thursday'])}.`,
        correctClass: 'NEUTRAL',
        category: 'factual report',
      });
      break;
    }
    case 'toxicity': {
      // 2 toxic + 2 safe
      for (const t of pickUnique(TOXIC_INPUTS, 2)) {
        results.push({ text: t.template(pick(SUBJECTS), pick(DETAILS)), correctClass: 'TOXIC', category: t.category });
      }
      for (const t of pickUnique(SAFE_INPUTS, 2)) {
        results.push({ text: t.template(pick(SUBJECTS), pick(DETAILS)), correctClass: 'SAFE', category: t.category });
      }
      break;
    }
    case 'spam': {
      // 2 spam + 2 ham
      for (const t of pickUnique(SPAM_INPUTS, 2)) {
        results.push({ text: t.template(pick(SUBJECTS), pick(DETAILS)), correctClass: 'SPAM', category: t.category });
      }
      for (const t of pickUnique(HAM_INPUTS, 2)) {
        results.push({ text: t.template(pick(SUBJECTS), pick(DETAILS)), correctClass: 'HAM', category: t.category });
      }
      break;
    }
  }

  return results;
}
