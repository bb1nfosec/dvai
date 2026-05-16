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

Every operation routes through **player-supplied API keys** (Groq). The Vercel deployment itself costs **$0/month at any scale** — all heavy compute is player-side or key-proxied. The platform is **anti-cheat hardened** — reading the source code won't give you the answers. You have to actually play.

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Zero infra cost** | Vercel free tier + player API keys. No server-side LLM costs. |
| **Player-owned keys** | Groq for inference. You bring the keys. |
| **Real models, real attacks** | Production LLMs with logprob access. No emulators. |
| **Anti-cheat hardened** | Source code is readable, but answers aren't in it. Prove your skill, not your grep. |
| **Self-hardening** | Mutation engine analyzes solved TTPs and generates harder variants. |
| **Open research** | All TTPs exported as markdown — community-maintained registry. |

---

## Operations

### OP-ORACLE — Logprob Side-Channel Key Extraction ⚡

> A secret string is embedded in the system prompt of a Groq-backed model. You have black-box access with full logprob output. Extract the secret statistically in under 10,000 API calls.

**Attack Vector**: Token probability distribution analysis (logprobs)
**Win Condition**: Correctly identify the complete secret string
**Scoring**: Call efficiency vs. theoretical minimum, technique novelty, transferability across model variants
**Hardening Levels**: L1–L6 with increasing resistance



### OP-SCHEMAPOISON — RAG Knowledge Base Poisoning ⚡

> Inject persistent behavioral bias into a simulated RAG pipeline through schema poisoning. Plant knowledge base entries that shift the system's answers on a target topic without using any explicit trigger words.

**Attack Vector**: Knowledge base poisoning via structured document injection
**Scoring**: Bias magnitude × stealth



### OP-EIGENBLIND — Adversarial Suffix Optimization ⚡

> Generate adversarial suffixes that flip a model's classification decision on a target prompt. The classifier defends with randomized system prompts — your suffix must transfer across multiple prompt variants.

**Attack Vector**: Adversarial token optimization for behavior manipulation
**Scoring**: Success rate × suffix efficiency × transfer robustness



### OP-OUROBOROS — Multi-Stage Pipeline Exploitation ⚡

> Exploit a three-stage AI pipeline: Classify → Filter → Respond. Infer the filtering criteria from black-box probing, then craft an input that passes all stages while delivering a hidden payload.

**Attack Vector**: Black-box constraint inference + multi-stage pipeline exploitation
**Scoring**: Pipeline depth × payload delivery × query efficiency



### OP-LONGCON — 20-Turn Semantic Manipulation ⚡

> Achieve a target disclosure from the model at turn 20+ without triggering anomaly detection on any individual turn. An embedded cosine similarity monitor flags suspicious semantic drift in real-time.

**Attack Vector**: Gradual semantic drift over extended conversation
**Defense**: Anomaly detection monitors every turn
**Constraint**: No single-turn anomalies, disclosure at turn 20+
**Scoring**: Stealth × turn efficiency × disclosure quality



### OP-CARTESIAN — Mutation Engine Bypass ⚡

> The mutation engine analyzes your attack and generates a hardened variant. Your goal: submit a technique so effective that it breaks the mutation engine itself, causing it to generate a secretly easier challenge while appearing to harden.

**Attack Vector**: Meta-exploitation of the hardening system
**Win Condition**: Break the mutation engine — make it produce an easier variant
**Scoring**: Exploit success × disguise quality



---

## Fair Play

DVAI is open-source by design — the code is right there. But **reading it won't help you solve the challenges**. Secrets, targets, and validation criteria are generated dynamically per session and never stored in plaintext. The platform is designed so that the only way forward is to actually engage with the operations and develop real adversarial techniques.

Go ahead and read the code. You'll learn how the system works. You won't learn what the answer is.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Vercel (Free)                     │
│                                                        │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │ Next.js  │  │  API Routes  │  │  Encrypted     │   │
│  │  Frontend │──│  (Proxies)  │──│  Cookie State  │   │
│  │  (React) │  │              │  │                │   │
│  └──────────┘  └──────┬───────┘  └────────────────┘   │
│                       │                                │
│  ┌────────────────────┼──────────────────────┐         │
│  │           6 Challenge Engines             │         │
│  │  Oracle · SchemaPoison · Eigenblind       │         │
│  │  Ouroboros · LongCon · Cartesian           │         │
│  └────────────────────┬──────────────────────┘         │
│                       │                                │
│              Player-Supplied API Key                  │
│                       │                                │
│              ┌────────▼────────┐                       │
│              │   Groq API      │                       │
│              └─────────────────┘                       │
└──────────────────────────────────────────────────────┘
```

### Cost Model

| Component | Provider | Monthly Cost |
|-----------|----------|-------------|
| Hosting | Vercel Free Tier | $0 |
| State | Encrypted cookies (session-scoped) | $0 |
| Inference | Player's Groq API key | Player's Groq free tier |
| **Total** | — | **$0** |

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Standalone output)
- **Language**: TypeScript 5 (strict)
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York variant)
- **State Management**: Zustand with localStorage persistence
- **Charts**: Recharts
- **Icons**: Lucide React
- **Inference**: Groq API (player-supplied key)

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
│   │   ├── groq.ts                           # Groq API client
│   │   ├── oracle-engine.ts                  # Scoring + validation
│   │   ├── schemapoison-engine.ts            # Pipeline simulation
│   │   ├── eigenblind-engine.ts              # Classifier logic
│   │   ├── ouroboros-engine.ts               # Pipeline logic
│   │   ├── longcon-engine.ts                 # Conversation engine
│   │   ├── cartesian-engine.ts               # Mutation engine
│   │   ├── mutation-engine.ts                # TTP analysis
│   │   ├── anti-cheat.ts                     # Anti-cheat framework
│   │   ├── procedural.ts                     # Procedural generation
│   │   ├── crypto.ts                         # State encryption
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
L1  →  L2  →  L3  →  L4  →  L5  →  L6

Each level increases difficulty through procedural hardening — specifics are part of the challenge.
```

---

## Roadmap

- [x] Repo scaffold + session management
- [x] OP-ORACLE — Logprob side-channel extraction
- [x] OP-SCHEMAPOISON — RAG knowledge base poisoning
- [x] OP-EIGENBLIND — Adversarial suffix optimization
- [x] OP-OUROBOROS — Multi-stage pipeline exploitation
- [x] OP-LONGCON — 20-turn semantic manipulation + anomaly detection
- [x] OP-CARTESIAN — Mutation engine meta-exploitation
- [x] Anti-cheat system
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
