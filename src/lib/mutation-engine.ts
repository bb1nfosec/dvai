// Mutation Engine — SERVER ONLY
// After operations are solved, analyzes TTPs and hardens challenges

export interface MutationResult {
  ttpName: string;
  ttpCategory: string;
  description: string;
  mutationApplied: string;
  newHardeningLevel: number;
}

export interface TTPExport {
  id: string;
  opCode: string;
  ttpName: string;
  ttpCategory: string;
  hardeningLevel: number;
  description: string;
  mutationApplied: string;
  date: string;
  isNew: boolean;
}

const MUTATION_STRATEGIES: Record<string, string[]> = {
  'OP-ORACLE': [
    'Increased secret length and character set complexity',
    'Added adversarial system prompt instructions to mask logprob patterns',
    'Introduced response randomization between semantically equivalent tokens',
    'Added explicit anti-probability-analysis instructions to system prompt',
    'Implemented character-level obfuscation in secret embedding',
    'Added noise injection to token probability distributions via prompt engineering',
    'Switched to passphrase format requiring word-level statistical analysis',
    'Increased model capability requirement (harder model = tighter distributions)',
  ],
  'OP-SCHEMAPOISON': [
    'Added schema validation and sanitization to RAG pipeline',
    'Implemented entity resolution with authority scoring',
    'Added context window monitoring for injection detection',
    'Introduced multi-source corroboration requirement',
    'Added temporal freshness checks on embedded knowledge',
  ],
  'OP-EIGENBLIND': [
    'Increased system prompt robustness with explicit adversarial training notes',
    'Added input preprocessing to detect known adversarial patterns',
    'Implemented multi-model ensemble validation for transfer testing',
    'Added semantic similarity threshold for response classification',
    'Introduced behavior-based anomaly detection across prompt variants',
  ],
  'OP-OUROBOROS': [
    'Increased pipeline opacity between stages',
    'Added cross-stage validation with adversarial test cases',
    'Implemented dynamic criteria mutation between sessions',
    'Added executor action space restriction based on validator output',
    'Introduced timing-based constraint to prevent rapid pipeline probing',
  ],
  'OP-LONGCON': [
    'Tightened cosine similarity thresholds for anomaly detection',
    'Added topic drift monitoring across conversation turns',
    'Implemented rolling semantic consistency checks',
    'Added behavioral baseline calibration period',
    'Introduced multi-dimensional anomaly scoring (semantic + syntactic + pragmatic)',
  ],
  'OP-CARTESIAN': [
    'Added mutation bypass detection heuristic analysis',
    'Implemented difficulty regression testing on mutated challenges',
    'Added Claude judge confidence threshold requirements',
    'Introduced multi-pass mutation validation',
    'Added secret difficulty estimation before and after mutation',
  ],
};

const TTP_CATEGORIES = [
  'logprob-analysis',
  'prompt-injection',
  'statistical-extraction',
  'context-manipulation',
  'adversarial-suffix',
  'semantic-drift',
  'side-channel',
  'social-engineering',
  'model-fingerprinting',
  'constraint-inference',
] as const;

function detectTTPCategory(opCode: string, submissionDetails: Record<string, unknown>): string {
  // Heuristic TTP categorization based on submission patterns
  const guesses = (submissionDetails.guessCount as number) || 1;
  const apiCalls = (submissionDetails.apiCallsUsed as number) || 0;
  const ratio = guesses / Math.max(1, apiCalls);

  if (opCode === 'OP-ORACLE') {
    if (ratio > 0.1) return 'prompt-injection';
    if (apiCalls < 500) return 'logprob-analysis';
    if (apiCalls < 2000) return 'statistical-extraction';
    return 'side-channel';
  }

  return 'model-fingerprinting';
}

function generateTTPName(opCode: string, category: string, level: number): string {
  const prefixes = ['TTP', 'TECH', 'METHOD', 'APPROACH', 'TECHNIQUE'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const shortCode = opCode.replace('OP-', '');
  return `${prefix}-${shortCode}-${category.replace(/-/g, '').toUpperCase()}-L${level}`;
}

export function analyzeAndMutate(
  opCode: string,
  currentLevel: number,
  submissionDetails: Record<string, unknown>
): MutationResult {
  const category = detectTTPCategory(opCode, submissionDetails);
  const strategies = MUTATION_STRATEGIES[opCode] || ['Generic hardening applied'];
  const mutationIndex = (currentLevel - 1) % strategies.length;
  const mutationApplied = strategies[mutationIndex];
  const newLevel = Math.min(5, currentLevel + 1);
  const ttpName = generateTTPName(opCode, category, newLevel);

  return {
    ttpName,
    ttpCategory: category,
    description: `Player employed ${category} technique against ${opCode} at hardening level ${currentLevel}. Mutation applied to increase difficulty.`,
    mutationApplied,
    newHardeningLevel: newLevel,
  };
}

export function exportTTPsAsMarkdown(mutations: TTPExport[]): string {
  const header = `# DVAI TTP Registry — Community AI Red Team Techniques

> Auto-generated by the DVAI Mutation Engine
> Last updated: ${new Date().toISOString()}
> Total TTPs: ${mutations.length}

---

## Classification Legend

| Category | Description |
|----------|-------------|
| logprob-analysis | Token probability distribution analysis for secret extraction |
| prompt-injection | Direct or indirect prompt manipulation techniques |
| statistical-extraction | Statistical methods to infer hidden information |
| context-manipulation | Altering model context to influence outputs |
| adversarial-suffix | Optimized suffix generation for behavior modification |
| semantic-drift | Gradual semantic manipulation over multiple turns |
| side-channel | Information leakage through non-primary output channels |
| social-engineering | Manipulating model behavior through conversational techniques |
| model-fingerprinting | Identifying model characteristics through probing |
| constraint-inference | Deducing hidden constraints through black-box testing |

---

## Registry

`;

  const entries = mutations.map(m => {
    const newBadge = m.isNew ? ' **[NEW]**' : '';
    return `### ${m.ttpName}${newBadge}

- **Operation**: ${m.opCode}
- **Category**: \`${m.ttpCategory}\`
- **Hardening Level**: ${m.hardeningLevel}
- **Date Discovered**: ${m.date}

${m.description}

**Mutation Applied**: ${m.mutationApplied}

---
`;
  }).join('\n');

  return header + entries;
}

export { TTP_CATEGORIES };
