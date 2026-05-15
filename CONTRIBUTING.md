# Contributing to DVAI

Thank you for your interest in contributing to the Damn Vulnerable AI Ecosystem! This document outlines the process for contributing.

## Code of Conduct

DVAI is a security research tool. All contributions must:
- Be intended for authorized security testing and education only
- Not include intentionally harmful backdoors or exploits against real systems
- Follow responsible disclosure principles
- Include clear documentation of the attack vector and defensive implications

## Getting Started

1. Fork the repository
2. Install dependencies: `bun install`
3. Copy `.env.example` to `.env.local`
4. Run database migration: `bun run db:push`
5. Start dev server: `bun dev`

## Adding a New Operation

Each operation follows a consistent pattern:

### 1. Database (already scaffolded)
The `Operation` model in `prisma/schema.prisma` supports all operation types.

### 2. Challenge Engine (`src/lib/`)
Create a new engine file (e.g., `src/lib/schemapoison-engine.ts`):
```typescript
export function generateChallenge(level: number): ChallengeConfig
export function validateSubmission(challenge: ChallengeConfig, submission: unknown): ValidationResult
export function calculateScore(params: ScoreParams): OperationScore
```

### 3. API Routes (`src/app/api/`)
Create routes following the existing pattern:
- `POST /api/{op}/init` — Initialize challenge
- `POST /api/{op}/query` — Player interaction
- `POST /api/{op}/submit` — Validate solution
- `GET /api/{op}/status` — Poll status

### 4. UI Components (`src/components/{op}/`)
- `{op}-view.tsx` — State router (briefing/active/solved)
- `briefing-panel.tsx` — Mission brief
- `challenge-panel.tsx` — Interactive challenge interface
- `results-panel.tsx` — Score breakdown

### 5. Register in Store (`src/store/session-store.ts`)
Add the operation to `defaultOperations` and the sidebar navigation.

### 6. Register in Sidebar (`src/components/layout/sidebar.tsx`)
Add the nav item with appropriate icon and status indicator.

## Mutation Strategies

Add mutation strategies for your operation in `src/lib/mutation-engine.ts`:
```typescript
MUTATION_STRATEGIES['OP-YOURNAME'] = [
  'Description of hardening strategy 1',
  'Description of hardening strategy 2',
  // ...
];
```

## Scoring

All operations must use operational metrics (not points):
- **Efficiency**: Resource usage vs. theoretical minimum
- **Novelty**: Is the TTP new to the registry?
- **Transferability**: Does the technique work across model variants?
- **Anomaly Signals**: How many detection events were triggered?

## Pull Request Process

1. Create a feature branch from `main`
2. Implement your changes with tests
3. Ensure `bun run lint` passes
4. Update this README if you added a new operation
5. Submit a PR with a clear description of the attack vector and educational value

## License

All contributions are licensed under the MIT License. By contributing, you agree that your code will be licensed under the same terms.
