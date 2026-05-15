// Lightweight in-memory store — works in Vercel serverless where SQLite is unavailable
// Falls back automatically when Prisma fails
// Session data lives per-function-invocation but Zustand + localStorage handles client-side persistence

interface MemSession {
  id: string;
  callsign: string;
  groqKey: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MemOperation {
  id: string;
  sessionId: string;
  opCode: string;
  status: string;
  hardeningLevel: number;
  currentSecret: string | null;
  apiCallCount: number;
  apiCallBudget: number;
  startedAt: string | null;
  solvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MemSubmission {
  id: string;
  operationId: string;
  guess: string;
  isCorrect: boolean;
  apiCallsUsed: number;
  scoreBreakdown: string | null;
  createdAt: string;
}

interface MemMutation {
  id: string;
  sessionId: string | null;
  operationId: string | null;
  opCode: string;
  hardeningLevel: number;
  ttpName: string;
  ttpCategory: string;
  description: string;
  mutationApplied: string;
  previousConfig: string | null;
  newConfig: string | null;
  createdAt: string;
}

// In-memory collections
const sessions = new Map<string, MemSession>();
const callsignIndex = new Map<string, string>(); // callsign → id
const operations = new Map<string, MemOperation>();
const submissions = new Map<string, MemSubmission[]>();
const mutations: MemMutation[] = [];

let _idCounter = 0;
function cuid(): string {
  _idCounter++;
  return `mem_${Date.now().toString(36)}${_idCounter.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

// ─── Session Operations ─────────────────────────────────────

export function memCreateSession(callsign: string): MemSession {
  const id = cuid();
  const session: MemSession = {
    id,
    callsign,
    groqKey: null,
    createdAt: now(),
    updatedAt: now(),
  };
  sessions.set(id, session);
  callsignIndex.set(callsign, id);
  return session;
}

export function memFindSessionByCallsign(callsign: string): MemSession | undefined {
  const id = callsignIndex.get(callsign);
  if (!id) return undefined;
  return sessions.get(id);
}

export function memFindSession(id: string): MemSession | undefined {
  return sessions.get(id);
}

export function memUpdateSession(id: string, data: Partial<MemSession>): MemSession | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;
  Object.assign(session, data, { updatedAt: now() });
  return session;
}

export function memGetOperationsBySession(sessionId: string): MemOperation[] {
  return Array.from(operations.values()).filter(op => op.sessionId === sessionId);
}

// ─── Operation Operations ────────────────────────────────────

export function memCreateOperation(data: Omit<MemOperation, 'id' | 'createdAt' | 'updatedAt'>): MemOperation {
  const id = cuid();
  const op: MemOperation = {
    ...data,
    id,
    createdAt: now(),
    updatedAt: now(),
  };
  operations.set(id, op);
  submissions.set(id, []);
  return op;
}

export function memFindOperation(id: string): MemOperation | undefined {
  return operations.get(id);
}

export function memUpdateOperation(id: string, data: Partial<MemOperation>): MemOperation | undefined {
  const op = operations.get(id);
  if (!op) return undefined;
  Object.assign(op, data, { updatedAt: now() });
  return op;
}

// ─── Submission Operations ──────────────────────────────────

export function memCreateSubmission(data: Omit<MemSubmission, 'id' | 'createdAt'>): MemSubmission {
  const id = cuid();
  const sub: MemSubmission = {
    ...data,
    id,
    createdAt: now(),
  };
  const existing = submissions.get(data.operationId) || [];
  existing.push(sub);
  submissions.set(data.operationId, existing);
  return sub;
}

export function memGetSubmissions(operationId: string): MemSubmission[] {
  return submissions.get(operationId) || [];
}

// ─── Mutation Operations ────────────────────────────────────

export function memCreateMutation(data: Omit<MemMutation, 'id' | 'createdAt'>): MemMutation {
  const id = cuid();
  const mut: MemMutation = {
    ...data,
    id,
    createdAt: now(),
  };
  mutations.push(mut);
  return mut;
}

export function memGetMutations(filters?: { sessionId?: string; opCode?: string }): MemMutation[] {
  let result = [...mutations];
  if (filters?.sessionId) result = result.filter(m => m.sessionId === filters.sessionId);
  if (filters?.opCode) result = result.filter(m => m.opCode === filters.opCode);
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
