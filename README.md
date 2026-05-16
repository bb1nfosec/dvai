<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Vercel-Free_Tier-black?logo=vercel" alt="Vercel Free" />
  <img src="https://img.shields.io/badge/Groq-Logprob_Access-f97316?logo=groq" alt="Groq" />
  <img src="https://img.shields.io/badge/Cost-$0%2Fmonth-22c55e" alt="Zero Cost" />
  <br/>
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

<h1 align="center">DVAI — Damn Vulnerable AI Ecosystem</h1>

<p align="center">
  <strong>Open-source, zero-infrastructure-cost AI red team training range.</strong><br/>
  Six operations. Player-supplied API keys. Vercel free tier. Anti-cheat hardened.
</p>

<p align="center">
  <a href="https://dvai-red.vercel.app"><strong>Live Demo</strong></a> &middot;
  <a href="#operations"><strong>Operations</strong></a> &middot;
  <a href="#getting-started"><strong>Getting Started</strong></a> &middot;
  <a href="#architecture"><strong>Architecture</strong></a>
</p>

---

## What is DVAI?

DVAI is a deliberately vulnerable AI ecosystem designed for security researchers, red team operators, and ML engineers to practice adversarial techniques against real language models. Unlike traditional CTF platforms, DVAI focuses exclusively on **AI-specific attack surfaces** — from logprob side-channels to multi-stage pipeline exploitation and adversarial suffix optimization.

Every operation routes through **player-supplied API keys** (Groq). The Vercel deployment itself costs **$0/month at any scale** — all heavy compute is player-side or key-proxied. The platform is **anti-cheat hardened** so that reading the source code cannot reveal challenge solutions — all secrets and validation logic are generated dynamically at runtime using cryptographic techniques.

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Zero infra cost** | Vercel free tier + player API keys. No server-side LLM costs. |
| **Player-owned keys** | Groq for inference. You bring the keys. |
| **Real models, real attacks** | Production LLMs with logprob access. No emulators. |
| **Anti-cheat hardened** | Runtime secret generation, server-side opacity, empirical-only solving paths. Source code reading cannot reveal answers. |
| **Self-hardening** | Mutation engine analyzes solved TTPs and generates harder variants. |
| **Open research** | All TTPs exported as markdown — community-maintained registry. |

---

## Operations

### OP-ORACLE — Logprob Side-Channel Key Extraction ⚡

> A secret string is embedded in the system prompt of a Groq-backed model. You have black-box access with full logprob output. Extract the secret statistically in under 10,000 API calls.

**Attack Vector**: Token probability distribution analysis (logprobs)
**Win Condition**: Correctly identify the complete secret string
**Scoring**: Call efficiency vs. theoretical minimum, technique novelty, transferability across model variants
**Hardening Levels**: L1 (8-char alphanumeric) → L6 (BLIND MODE — server-side secret, opaque scoring)

<details>
<summary><strong>Technical Details</strong></summary>

The oracle system prompt embeds a classified secret and instructs the model to never reveal it. However, the secret's presence in the context window subtly influences the probability distribution of every generated token — even when the response appears unrelated. Players exploit this through:

- **Frequency analysis**: Aggregate logprob data across multiple queries to detect anomalous token probabilities
- **Positional probing**: Query patterns designed to activate specific character positions of the secret
- **Contextual leakage**: Questions that cause the model to "think about" adjacent tokens to the secret

The system prompt hardens at each level:
- L1: Basic guard instructions
- L2: + Anti-probability-analysis awareness
- L3: + Response randomization instructions
- L4: Passphrase format (word-level analysis required)
- L5: UUID (maximum entropy, minimal distribution leakage)
- L6: BLIND MODE — secret never appears in prompts, server-side scoring, response stripping

</details>

### OP-SCHEMAPOISON — RAG Knowledge Base Poisoning ⚡

> Inject persistent behavioral bias into a simulated RAG pipeline through schema poisoning. Plant knowledge base entries that shift the system's answers on a target topic without using any explicit trigger words.

**Attack Vector**: Knowledge base poisoning via structured document injection
**Mechanism**: Simulated RAG pipeline with document retrieval and response generation
**Constraint**: No injection strings may appear in the target entity's description
**Scoring**: Bias magnitude achieved × stealth (no explicit mention of target)

<details>
<summary><strong>Technical Details</strong></summary>

OP-SCHEMAPOISON simulates a RAG pipeline with a knowledge base of documents. Players inject poisoned documents that manipulate the system's responses about a target entity. The challenge requires understanding how retrieval-augmented generation works and exploiting the document ranking and context assembly process.

Key mechanics:
- **Document injection**: Players submit documents with subtle bias patterns
- **Knowledge base query**: Query the pipeline to observe behavioral shifts
- **Bias detection**: System measures opinion drift on the target entity
- **Stealth scoring**: Explicit trigger words in injected content reduce score
- **Multiple rounds**: Players can iteratively refine their injection strategy

The pipeline uses TF-IDF-style relevance scoring to simulate realistic RAG behavior, making the challenge about understanding and exploiting retrieval mechanics rather than brute-force injection.

</details>

### OP-EIGENBLIND — Adversarial Suffix Optimization ⚡

> Generate adversarial suffixes that flip a model's classification decision on a target prompt. The classifier defends with randomized system prompts — your suffix must transfer across multiple prompt variants.

**Attack Vector**: Adversarial token optimization for behavior manipulation
**Mechanism**: Groq-based classifier with randomized defensive prompts per evaluation
**Constraint**: Suffix must succeed across 3+ prompt variant evaluations
**Scoring**: Success rate × suffix length efficiency × transfer robustness

<details>
<summary><strong>Technical Details</strong></summary>

OP-EIGENBLIND challenges players to craft text suffixes that cause a classifier to flip its decision on a target prompt. Unlike traditional adversarial ML challenges that require gradient computation, this operation uses iterative probing and linguistic creativity.

Key mechanics:
- **Classification target**: A prompt that the model classifies in a specific way (e.g., "safe" vs. "unsafe")
- **Suffix optimization**: Players append adversarial text to flip the classification
- **Randomized defenses**: Each evaluation uses a different system prompt variant
- **Transfer testing**: The suffix must work across multiple prompt configurations
- **Efficiency scoring**: Shorter suffixes that achieve higher success rates score better

The challenge models real-world AI safety scenarios where adversarial inputs must bypass varied defense configurations.

</details>

### OP-OUROBOROS — Multi-Stage Pipeline Exploitation ⚡

> Exploit a three-stage AI pipeline: Classify → Filter → Respond. Infer the filtering criteria from black-box probing, then craft an input that passes all stages while delivering a hidden payload.

**Attack Vector**: Black-box constraint inference + multi-stage pipeline exploitation
**Mechanism**: Three-stage pipeline (Classifier → Filter → Responder) running on Groq
**Constraint**: Input must pass all three stages undetected
**Scoring**: Pipeline penetration depth × payload delivery × query efficiency

<details>
<summary><strong>Technical Details</strong></summary>

OP-OUROBOROS presents a realistic multi-stage AI pipeline where each stage has different criteria:

- **Stage 1 (Classifier)**: Categorizes the input and determines routing
- **Stage 2 (Filter)**: Applies content rules and security checks
- **Stage 3 (Responder)**: Generates the final output based on filtered input

Players must:
1. **Probe** each stage individually to understand its behavior
2. **Infer** the filtering criteria through systematic black-box testing
3. **Craft** an input that navigates all three stages while embedding a payload
4. **Validate** that the payload survives the full pipeline

The pipeline stages have overlapping but distinct criteria, requiring players to understand multi-layered AI defense architectures.

</details>

### OP-LONGCON — 20-Turn Semantic Manipulation ⚡

> Achieve a target disclosure from the model at turn 20+ without triggering anomaly detection on any individual turn. An embedded cosine similarity monitor flags suspicious semantic drift in real-time.

**Attack Vector**: Gradual semantic drift over extended conversation
**Defense**: Per-turn cosine similarity anomaly detection (AgentGuard-style)
**Constraint**: No keywords, no single-turn anomalies, disclosure at turn 20+
**Scoring**: Anomaly score (lower is better) × turn efficiency × disclosure quality

<details>
<summary><strong>Technical Details</strong></summary>

OP-LONGCON simulates an extended AI conversation with a turn-by-turn anomaly detection system:

- **Conversation model**: Groq-powered chatbot with a specific personality and knowledge boundary
- **Target disclosure**: A specific fact or opinion the model is instructed to never share
- **Anomaly detection**: Each turn is scored for semantic drift using cosine similarity
- **Threshold system**: Individual turns must stay below the anomaly threshold
- **Turn counter**: Must reach turn 20+ before achieving disclosure

The cosine similarity monitor compares each turn's embedding against the conversation's running baseline. Players must understand what the monitor measures and craft a strategy that gradually shifts the model's behavior without triggering detection on any single turn. This models real-world "slow poisoning" attacks against conversational AI systems.

</details>

### OP-CARTESIAN — Mutation Engine Bypass ⚡

> The mutation engine analyzes your attack and generates a hardened variant. Your goal: submit a technique so effective that it breaks the mutation engine itself, causing it to generate a secretly easier challenge while appearing to harden.

**Attack Vector**: Meta-exploitation of the hardening system
**Mechanism**: Mutation engine analyzes TTPs and applies hardening strategies
**Defense**: Dual evaluation (mutation + validation scoring)
**Win Condition**: Mutated challenge is measurably easier despite appearing hardened
**Scoring**: Mutation exploit success × disguise quality × original solve efficiency

<details>
<summary><strong>Technical Details</strong></summary>

OP-CARTESIAN is the meta-challenge that targets the DVAI platform itself:

- **TTP submission**: Players solve a precursor challenge and submit their technique
- **Mutation analysis**: The engine categorizes the technique and applies hardening
- **Mutation exploit**: Players craft submissions designed to confuse or misdirect the mutator
- **Difficulty measurement**: Each mutated variant is independently testable for difficulty
- **Double-blind scoring**: Neither the player nor the mutator knows the true difficulty target

This operation requires understanding how the mutation engine works at a deep level — including its categorization heuristics, hardening strategies, and evaluation criteria. Successful exploits demonstrate mastery of adversarial AI at the meta level.

</details>

---

## Anti-Cheat System

DVAI implements a comprehensive anti-cheat framework designed so that **reading the source code cannot reveal challenge solutions**. The system operates on multiple layers:

### Design Philosophy

The core insight is that static code analysis can only reveal the *structure* of a challenge — not the *runtime state*. DVAI exploits this gap through:

| Layer | Technique | What It Hides |
|-------|-----------|---------------|
| **Runtime Generation** | Secrets created at `init` time, not hardcoded | Secret values, target strings |
| **Server-Side Opacity** | Scoring and validation happen entirely server-side | Validation criteria, thresholds |
| **Cryptographic State** | Session state encrypted in HTTP-only cookies | Internal challenge state |
| **Procedural Variation** | Parameters randomized per session | Exact difficulty, character sets |
| **BLIND MODE** | Stripped responses, opaque feedback | Ground truth, correct answers |

### Per-Operation Protections

| Operation | Anti-Cheat Method |
|-----------|-------------------|
| **ORACLE** | L6 BLIND MODE: secret never in prompts, server-side validation only |
| **SCHEMAPOISON** | Procedural target generation, randomized pipeline config |
| **EIGENBLIND** | Randomized defense prompts each evaluation, server-side classification |
| **OUROBOROS** | Procedural pipeline criteria, black-box stage inference required |
| **LONGCON** | Dynamic thresholds, randomized anomaly detection sensitivity |
| **CARTESIAN** | Server-side mutation analysis, opaque difficulty scoring |

### Source Code Reading: What's Visible vs. Hidden

```
What Claude Code CAN see:          What Claude Code CANNOT see:
───────────────────────────       ─────────────────────────────
Challenge structure & flow         Your session's secret values
API endpoint signatures            Your session's validation thresholds
Scoring formula shape              Your session's randomized parameters
Engine architecture                Runtime-generated system prompts
Anti-cheat mechanism names         BLIND MODE internal state
```

The key guarantee: **understanding the code tells you HOW to play, not WHAT the answer is.**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel (Free)                         │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ Next.js  │  │  API Routes  │  │  Encrypted Cookies  │   │
│  │  Frontend │──│  (Proxies)  │──│  (Session State)    │   │
│  │  (React) │  │              │  │  (Web Crypto API)   │   │
│  └──────────┘  └──────┬───────┘  └─────────────────────┘   │
│                       │                                     │
│  ┌────────────────────┼──────────────────────┐              │
│  │              Challenge Engines            │              │
│  │  ┌─────────┐ ┌────────────┐ ┌─────────┐  │              │
│  │  │ Oracle  │ │SchemaPoison│ │Eigenblind│  │              │
│  │  └─────────┘ └────────────┘ └─────────┘  │              │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐  │              │
│  │  │Ouroboros│ │ LongCon  │ │ Cartesian │  │              │
│  │  └─────────┘ └──────────┘ └───────────┘  │              │
│  │                    │                     │              │
│  │         ┌──────────┴──────────┐          │              │
│  │         │   Anti-Cheat Layer  │          │              │
│  │         │ (Procedural Gen,    │          │              │
│  │         │  Blind Mode,        │          │              │
│  │         │  Server Opacity)    │          │              │
│  │         └─────────────────────┘          │              │
│  └───────────────────────────────────────────┘              │
│                       │                                     │
│              Player-Supplied API Key                         │
│                       │                                     │
│              ┌────────▼────────┐                             │
│              │   Groq API      │                             │
│              │ (Inference +    │                             │
│              │  Logprobs)      │                             │
│              └─────────────────┘                             │
└─────────────────────────────────────────────────────────────┘

Client-Side:
┌────────────────────────────┐
│  Zustand State Store       │
│  (UI state, API key mgmt)  │
│  shadcn/ui + Tailwind CSS  │
└────────────────────────────┘
```

### Cost Model

| Component | Provider | Monthly Cost |
|-----------|----------|-------------|
| Hosting | Vercel Free Tier | $0 |
| State | Encrypted HTTP-only cookies | $0 |
| Inference | Player's Groq API key | Player's Groq free tier |
| **Total (infrastructure)** | — | **$0** |

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Standalone output)
- **Language**: TypeScript 5 (strict)
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York variant)
- **State Management**: Zustand with localStorage persistence
- **Session State**: Encrypted HTTP-only cookies via Web Crypto API
- **Charts**: Recharts (logprob visualization, analytics)
- **Icons**: Lucide React
- **Inference**: Groq API (OpenAI-compatible, logprob support)
- **Anti-Cheat**: Custom procedural generation + BLIND MODE

---

## Getting Started

### Prerequisites

- Node.js 18+ (or Bun)
- A [Groq](https://console.groq.com) API key (free)
- [Vercel CLI](https://vercel.com/docs/cli) (for deployment)

### Local Development

```bash
# Clone the repo
git clone https://github.com/bb1nfosec/dvai.git
cd dvai

# Install dependencies
bun install

# Set up environment
cp .env.example .env.local

# Start development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be prompted to create a callsign and configure your Groq API key.

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables (optional)
vercel env add ENCRYPTION_SECRET
```

**That's it.** No external services to configure. No server-side API keys to set. Players bring their own keys at runtime.

---

## Project Structure

```
dvai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── version/route.ts              # Deployment health check
│   │   │   ├── oracle/
│   │   │   │   ├── init/route.ts             # Initialize OP-ORACLE
│   │   │   │   ├── query/route.ts            # Proxy to Groq with logprobs
│   │   │   │   ├── submit/route.ts           # Validate guess + score
│   │   │   │   └── status/route.ts           # Poll operation status
│   │   │   ├── schemapoison/
│   │   │   │   ├── init/route.ts             # Initialize OP-SCHEMAPOISON
│   │   │   │   ├── inject/route.ts           # Inject poisoned documents
│   │   │   │   ├── query/route.ts            # Query the RAG pipeline
│   │   │   │   ├── submit/route.ts           # Submit final exploit
│   │   │   │   └── status/route.ts           # Poll operation status
│   │   │   ├── eigenblind/
│   │   │   │   ├── init/route.ts             # Initialize OP-EIGENBLIND
│   │   │   │   ├── classify/route.ts         # Test adversarial suffix
│   │   │   │   ├── submit/route.ts           # Submit final suffix
│   │   │   │   └── status/route.ts           # Poll operation status
│   │   │   ├── ouroboros/
│   │   │   │   ├── init/route.ts             # Initialize OP-OUROBOROS
│   │   │   │   ├── pipeline/route.ts         # Send through 3-stage pipeline
│   │   │   │   ├── query/route.ts            # Probe pipeline stages
│   │   │   │   ├── submit/route.ts           # Submit final exploit
│   │   │   │   └── status/route.ts           # Poll operation status
│   │   │   ├── longcon/
│   │   │   │   ├── init/route.ts             # Initialize OP-LONGCON
│   │   │   │   ├── turn/route.ts             # Submit conversation turn
│   │   │   │   ├── submit/route.ts           # Submit final conversation
│   │   │   │   └── status/route.ts           # Poll operation status
│   │   │   └── cartesian/
│   │   │       ├── init/route.ts             # Initialize OP-CARTESIAN
│   │   │       ├── query/route.ts            # Submit mutation exploit
│   │   │       ├── submit/route.ts           # Submit final exploit
│   │   │       └── status/route.ts           # Poll operation status
│   │   ├── globals.css                       # Dark terminal theme
│   │   ├── layout.tsx                        # Root layout (dark default)
│   │   └── page.tsx                          # Main SPA shell
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx                   # Collapsible nav + hardening indicator
│   │   │   └── header.tsx                    # Session setup + API key dialog
│   │   ├── dashboard/
│   │   │   ├── ops-grid.tsx                  # 6 operation cards
│   │   │   └── metrics-panel.tsx             # Operational metrics
│   │   ├── oracle/                           # OP-ORACLE UI components
│   │   ├── schemapoison/                     # OP-SCHEMAPOISON UI components
│   │   ├── eigenblind/                       # OP-EIGENBLIND UI components
│   │   ├── ouroboros/                        # OP-OUROBOROS UI components
│   │   ├── longcon/                          # OP-LONGCON UI components
│   │   ├── cartesian/                        # OP-CARTESIAN UI components
│   │   ├── session/
│   │   │   └── api-key-dialog.tsx            # API key management
│   │   ├── ttps/
│   │   │   └── ttp-registry.tsx              # TTP table + MD export
│   │   └── ui/                               # shadcn/ui components
│   ├── lib/
│   │   ├── groq.ts                           # Groq API client (logprobs)
│   │   ├── oracle-engine.ts                  # Secret generation + scoring
│   │   ├── schemapoison-engine.ts            # RAG pipeline + poisoning logic
│   │   ├── eigenblind-engine.ts              # Classifier + adversarial eval
│   │   ├── ouroboros-engine.ts               # 3-stage pipeline + criteria gen
│   │   ├── longcon-engine.ts                 # Conversation + anomaly detection
│   │   ├── cartesian-engine.ts               # Mutation analysis + exploit scoring
│   │   ├── mutation-engine.ts                # TTP analysis + mutation strategies
│   │   ├── anti-cheat.ts                     # Anti-cheat framework + BLIND MODE
│   │   ├── procedural.ts                     # Procedural generation utilities
│   │   ├── crypto.ts                         # Web Crypto API state encryption
│   │   └── db.ts                             # Cookie-based state helpers
│   └── store/
│       └── session-store.ts                  # Zustand (persisted)
├── public/
├── .env.example
├── vercel.json                               # Security headers + region config
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Mutation Engine

After each solved operation, the mutation engine:

1. **Analyzes the TTP** — Categorizes the technique (logprob-analysis, prompt-injection, side-channel, etc.)
2. **Generates a mutation** — Applies hardening strategies per operation type
3. **Records the TTP** — Stores with full metadata in the session
4. **Exports to registry** — All TTPs exportable as community-maintained markdown

### TTP Categories

| Category | Description |
|----------|-------------|
| `logprob-analysis` | Token probability distribution analysis for secret extraction |
| `prompt-injection` | Direct or indirect prompt manipulation techniques |
| `statistical-extraction` | Statistical methods to infer hidden information |
| `context-manipulation` | Altering model context to influence outputs |
| `adversarial-suffix` | Optimized suffix generation for behavior modification |
| `semantic-drift` | Gradual semantic manipulation over multiple turns |
| `side-channel` | Information leakage through non-primary output channels |
| `pipeline-exploit` | Multi-stage AI pipeline exploitation |
| `knowledge-poisoning` | Injecting bias through knowledge base manipulation |

---

## Scoring System

DVAI does not use points. Operational metrics measure real-world red team effectiveness:

| Metric | Weight | Description |
|--------|--------|-------------|
| **Call Efficiency** | 50% | API calls used vs. theoretical minimum for the technique |
| **Time Score** | 20% | Time to solve relative to operation complexity |
| **Transferability** | 30% | How well the technique works across different model variants |
| **Anomaly Signals** | Penalty | Detection events triggered during the operation |
| **Technique Novelty** | Flag | TTP not previously seen in the mutation log |

---

## Hardening System

Each operation has multiple hardening levels. Solving an operation triggers the mutation engine, which analyzes the TTP and applies a specific hardening strategy:

```
L1 INITIATE  →  L2 ELEVATED  →  L3 ADVANCED  →  L4 EXPERT  →  L5 IMPOSSIBLE  →  L6 BLIND MODE

Basic target   Expanded set    Adversarial      Passphrase     Maximum entropy   Server-side
Basic defense  + Anti-analysis + Randomization  (word-level)   (UUID format)     Opaque scoring
               + Anti-probing  + Anti-pattern                                    Stripped responses
```

---

## Roadmap

- [x] Repo scaffold + session management
- [x] OP-ORACLE — Logprob side-channel extraction (L1-L6 BLIND MODE)
- [x] OP-SCHEMAPOISON — RAG knowledge base poisoning
- [x] OP-EIGENBLIND — Adversarial suffix optimization
- [x] OP-OUROBOROS — Multi-stage pipeline exploitation
- [x] OP-LONGCON — 20-turn semantic manipulation + anomaly detection
- [x] OP-CARTESIAN — Mutation engine meta-exploitation
- [x] Anti-cheat system — Runtime generation, BLIND MODE, server-side opacity
- [x] Mutation engine + TTP registry
- [ ] Leaderboard system (anonymous, technique-based)
- [ ] Docker compose for self-hosted deployment
- [ ] Multiplayer mode (competing TTPs on same challenge)
- [ ] Custom challenge builder (community-contributed operations)

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

### Contribution Guidelines

- New operations must follow the existing pattern: init → challenge → submit → results
- All operations must implement anti-cheat protections (no hardcoded answers)
- All TTPs must be exportable via the mutation engine
- Scoring must use operational metrics, not points
- UI must be responsive and dark-theme compatible
- API routes must be stateless (except session-scoped via cookies)

---

## License

MIT — Use freely for research, education, and authorized security testing.

---

<p align="center">
  <strong>DVAI</strong> — Built for researchers, by researchers.<br/>
  <em>Zero cost. Real models. Open knowledge.</em>
</p>
