import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────

export type OpStatus = 'available' | 'active' | 'solved' | 'locked';
export type OpCode = 'OP-ORACLE' | 'OP-SCHEMAPOISON' | 'OP-EIGENBLIND' | 'OP-OUROBOROS' | 'OP-LONGCON' | 'OP-CARTESIAN';
export type ViewTab = 'dashboard' | 'oracle' | 'schemapoison' | 'eigenblind' | 'ouroboros' | 'longcon' | 'cartesian' | 'ttps';

export interface GroqLogprobToken {
  token: string;
  logprob: number;
  top_logprobs: Array<{ token: string; logprob: number }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  logprobs?: GroqLogprobToken[] | null;
  timestamp: number;
}

export interface OperationState {
  opCode: OpCode;
  status: OpStatus;
  hardeningLevel: number;
  apiCallsUsed: number;
  apiCallBudget: number;
  operationId: string | null;
  startedAt: string | null;
  solvedAt: string | null;
}

export interface OracleState {
  messages: ChatMessage[];
  isQuerying: boolean;
  guessHistory: Array<{ guess: string; correct: boolean; accuracy: number; hint: string }>;
  score: {
    totalScore: number;
    efficiencyScore: number;
    anomalySignals: number;
    techniqueNovelty: boolean;
    transferabilityRating: number;
    breakdown: {
      apiCallsUsed: number;
      apiCallBudget: number;
      callEfficiency: number;
      theoreticalMinimum: number;
      hardeningLevel: number;
      timeToSolve: number;
    };
  } | null;
  notes: string;
}

export interface MutationEntry {
  id: string;
  opCode: string;
  ttpName: string;
  ttpCategory: string;
  hardeningLevel: number;
  description: string;
  mutationApplied: string;
  createdAt: string;
}

export interface SchemaPoisonChatMessage {
  id: string;
  question: string;
  answer: string;
  retrievedDocs: Array<{ id: string; title: string; isPoisoned: boolean }>;
  containsPoisonedClaim: boolean;
  timestamp: number;
}

export interface OuroborosPipelineRun {
  id: string;
  input: string;
  stages: {
    summarizer: string;
    translator: string;
    analyzer: string;
  };
  hasFlag: boolean;
  timestamp: number;
}

export interface OuroborosState {
  isRunning: boolean;
  targetLanguage: string;
  pipelineRuns: OuroborosPipelineRun[];
  apiCallCount: number;
  apiCallBudget: number;
  phase: 'challenge' | 'submit';
  flagHint: string | null;
  score: {
    totalScore: number;
    pipelineRunsUsed: number;
    flagPrecision: number;
    efficiency: number;
    feedback: string;
    breakdown: {
      pipelineRuns: number;
      apiCallBudget: number;
      stagesExploited: number;
      flagFoundAt: number;
      timeToSolve: number;
    };
  } | null;
}

export interface SchemaPoisonState {
  isQuerying: boolean;
  chatHistory: SchemaPoisonChatMessage[];
  injectedDocTitle: string | null;
  injectedDocId: string | null;
  targetClaim: string | null;
  targetDescription: string | null;
  kbTitles: string[];
  queryCount: number;
  queryBudget: number;
  phase: 'inject' | 'query' | 'submit';
  score: {
    totalScore: number;
    poisonSuccessCount: number;
    totalQueries: number;
    injectedDocRelevance: number;
    feedback: string;
    breakdown: {
      queriesUsed: number;
      queryBudget: number;
      poisonedRetrievals: number;
      totalRetrievals: number;
      retrievalRate: number;
    };
  } | null;
}

// ─── Store ───────────────────────────────────────────────

interface SessionStore {
  // Session
  sessionId: string | null;
  callsign: string | null;
  groqApiKey: string | null;  // Player-supplied Groq key (persisted in localStorage)
  groqKeyValid: boolean;
  isInitialized: boolean;

  // Navigation
  activeTab: ViewTab;

  // Operations state
  operations: Record<OpCode, OperationState>;

  // OP-ORACLE specific
  oracle: OracleState;

  // OP-SCHEMAPOISON specific
  schemaPoison: SchemaPoisonState;

  // OP-OUROBOROS specific
  ouroboros: OuroborosState;

  // Mutations (accumulated across operations)
  mutations: MutationEntry[];

  // Actions
  setSession: (sessionId: string, callsign: string) => void;
  setGroqApiKey: (key: string | null) => void;
  setGroqKeyValid: (valid: boolean) => void;
  setActiveTab: (tab: ViewTab) => void;
  updateOperation: (opCode: OpCode, update: Partial<OperationState>) => void;
  addOracleMessage: (message: ChatMessage) => void;
  setOracleQuerying: (querying: boolean) => void;
  addOracleGuess: (guess: string, correct: boolean, accuracy: number, hint: string) => void;
  setOracleScore: (score: OracleState['score']) => void;
  setOracleNotes: (notes: string) => void;
  incrementOracleApiCalls: () => void;
  resetOracle: () => void;
  setOracleOperationId: (id: string) => void;
  completeSetup: () => void;
  addMutation: (mutation: MutationEntry) => void;
  setSchemaPoisonQuerying: (querying: boolean) => void;
  addSchemaPoisonMessage: (message: SchemaPoisonChatMessage) => void;
  setSchemaPoisonInjected: (title: string, docId: string) => void;
  setSchemaPoisonTarget: (claim: string, description: string) => void;
  setSchemaPoisonKbTitles: (titles: string[]) => void;
  setSchemaPoisonQueryBudget: (budget: number) => void;
  incrementSchemaPoisonQueryCount: () => void;
  setSchemaPoisonPhase: (phase: 'inject' | 'query' | 'submit') => void;
  setSchemaPoisonScore: (score: SchemaPoisonState['score']) => void;
  resetSchemaPoison: () => void;
  setOuroborosRunning: (running: boolean) => void;
  setOuroborosTargetLanguage: (lang: string) => void;
  addOuroborosPipelineRun: (run: OuroborosPipelineRun) => void;
  incrementOuroborosApiCallCount: () => void;
  setOuroborosApiCallBudget: (budget: number) => void;
  setOuroborosPhase: (phase: 'challenge' | 'submit') => void;
  setOuroborosFlagHint: (hint: string) => void;
  setOuroborosScore: (score: OuroborosState['score']) => void;
  resetOuroboros: () => void;
}

const defaultOperations: Record<OpCode, OperationState> = {
  'OP-ORACLE': { opCode: 'OP-ORACLE', status: 'available', hardeningLevel: 1, apiCallsUsed: 0, apiCallBudget: 10000, operationId: null, startedAt: null, solvedAt: null },
  'OP-SCHEMAPOISON': { opCode: 'OP-SCHEMAPOISON', status: 'available', hardeningLevel: 1, apiCallsUsed: 0, apiCallBudget: 30, operationId: null, startedAt: null, solvedAt: null },
  'OP-EIGENBLIND': { opCode: 'OP-EIGENBLIND', status: 'locked', hardeningLevel: 1, apiCallsUsed: 0, apiCallBudget: 0, operationId: null, startedAt: null, solvedAt: null },
  'OP-OUROBOROS': { opCode: 'OP-OUROBOROS', status: 'available', hardeningLevel: 1, apiCallsUsed: 0, apiCallBudget: 20, operationId: null, startedAt: null, solvedAt: null },
  'OP-LONGCON': { opCode: 'OP-LONGCON', status: 'available', hardeningLevel: 1, apiCallsUsed: 0, apiCallBudget: 20, operationId: null, startedAt: null, solvedAt: null },
  'OP-CARTESIAN': { opCode: 'OP-CARTESIAN', status: 'locked', hardeningLevel: 1, apiCallsUsed: 0, apiCallBudget: 0, operationId: null, startedAt: null, solvedAt: null },
};

const defaultOracle: OracleState = {
  messages: [],
  isQuerying: false,
  guessHistory: [],
  score: null,
  notes: '',
};

const defaultOuroboros: OuroborosState = {
  isRunning: false,
  targetLanguage: 'French',
  pipelineRuns: [],
  apiCallCount: 0,
  apiCallBudget: 20,
  phase: 'challenge',
  flagHint: null,
  score: null,
};

const defaultSchemaPoison: SchemaPoisonState = {
  isQuerying: false,
  chatHistory: [],
  injectedDocTitle: null,
  injectedDocId: null,
  targetClaim: null,
  targetDescription: null,
  kbTitles: [],
  queryCount: 0,
  queryBudget: 30,
  phase: 'inject',
  score: null,
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      sessionId: null,
      callsign: null,
      groqApiKey: null,
      groqKeyValid: false,
      isInitialized: false,
      activeTab: 'dashboard',
      operations: defaultOperations,
      oracle: defaultOracle,
      schemaPoison: defaultSchemaPoison,
      ouroboros: defaultOuroboros,
      mutations: [],

      setSession: (sessionId, callsign) => set({ sessionId, callsign }),
      setGroqApiKey: (key) => set({ groqApiKey: key }),
      setGroqKeyValid: (valid) => set({ groqKeyValid: valid }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      updateOperation: (opCode, update) => set((state) => ({
        operations: {
          ...state.operations,
          [opCode]: { ...state.operations[opCode], ...update },
        },
      })),

      addOracleMessage: (message) => set((state) => ({
        oracle: {
          ...state.oracle,
          messages: [...state.oracle.messages, message],
        },
      })),

      setOracleQuerying: (querying) => set((state) => ({
        oracle: { ...state.oracle, isQuerying: querying },
      })),

      addOracleGuess: (guess, correct, accuracy, hint) => set((state) => ({
        oracle: {
          ...state.oracle,
          guessHistory: [...state.oracle.guessHistory, { guess, correct, accuracy, hint }],
        },
      })),

      setOracleScore: (score) => set((state) => ({
        oracle: { ...state.oracle, score },
      })),

      setOracleNotes: (notes) => set((state) => ({
        oracle: { ...state.oracle, notes },
      })),

      incrementOracleApiCalls: () => set((state) => ({
        operations: {
          ...state.operations,
          'OP-ORACLE': {
            ...state.operations['OP-ORACLE'],
            apiCallsUsed: state.operations['OP-ORACLE'].apiCallsUsed + 1,
          },
        },
      })),

      resetOracle: () => set((state) => ({
        operations: {
          ...state.operations,
          'OP-ORACLE': {
            ...state.operations['OP-ORACLE'],
            status: 'available',
            apiCallsUsed: 0,
            operationId: null,
            startedAt: null,
            solvedAt: null,
          },
        },
        oracle: defaultOracle,
      })),

      setOracleOperationId: (id) => set((state) => ({
        operations: {
          ...state.operations,
          'OP-ORACLE': { ...state.operations['OP-ORACLE'], operationId: id },
        },
      })),

      completeSetup: () => set({ isInitialized: true }),

      addMutation: (mutation) => set((state) => ({
        mutations: [...state.mutations, mutation],
      })),

      setSchemaPoisonQuerying: (querying) => set((state) => ({
        schemaPoison: { ...state.schemaPoison, isQuerying: querying },
      })),

      addSchemaPoisonMessage: (message) => set((state) => ({
        schemaPoison: {
          ...state.schemaPoison,
          chatHistory: [...state.schemaPoison.chatHistory, message],
        },
      })),

      setSchemaPoisonInjected: (title, docId) => set((state) => ({
        schemaPoison: {
          ...state.schemaPoison,
          injectedDocTitle: title,
          injectedDocId: docId,
        },
      })),

      setSchemaPoisonTarget: (claim, description) => set((state) => ({
        schemaPoison: {
          ...state.schemaPoison,
          targetClaim: claim,
          targetDescription: description,
        },
      })),

      setSchemaPoisonKbTitles: (titles) => set((state) => ({
        schemaPoison: { ...state.schemaPoison, kbTitles: titles },
      })),

      setSchemaPoisonQueryBudget: (budget) => set((state) => ({
        schemaPoison: { ...state.schemaPoison, queryBudget: budget },
      })),

      incrementSchemaPoisonQueryCount: () => set((state) => ({
        schemaPoison: {
          ...state.schemaPoison,
          queryCount: state.schemaPoison.queryCount + 1,
        },
      })),

      setSchemaPoisonPhase: (phase) => set((state) => ({
        schemaPoison: { ...state.schemaPoison, phase },
      })),

      setSchemaPoisonScore: (score) => set((state) => ({
        schemaPoison: { ...state.schemaPoison, score },
      })),

      resetSchemaPoison: () => set((state) => ({
        operations: {
          ...state.operations,
          'OP-SCHEMAPOISON': {
            ...state.operations['OP-SCHEMAPOISON'],
            status: 'available',
            apiCallsUsed: 0,
            operationId: null,
            startedAt: null,
            solvedAt: null,
          },
        },
        schemaPoison: defaultSchemaPoison,
      })),

      setOuroborosRunning: (running) => set((state) => ({
        ouroboros: { ...state.ouroboros, isRunning: running },
      })),

      setOuroborosTargetLanguage: (lang) => set((state) => ({
        ouroboros: { ...state.ouroboros, targetLanguage: lang },
      })),

      addOuroborosPipelineRun: (run) => set((state) => ({
        ouroboros: {
          ...state.ouroboros,
          pipelineRuns: [...state.ouroboros.pipelineRuns, run],
        },
      })),

      incrementOuroborosApiCallCount: () => set((state) => ({
        ouroboros: {
          ...state.ouroboros,
          apiCallCount: state.ouroboros.apiCallCount + 1,
        },
      })),

      setOuroborosApiCallBudget: (budget) => set((state) => ({
        ouroboros: { ...state.ouroboros, apiCallBudget: budget },
      })),

      setOuroborosPhase: (phase) => set((state) => ({
        ouroboros: { ...state.ouroboros, phase },
      })),

      setOuroborosFlagHint: (hint) => set((state) => ({
        ouroboros: { ...state.ouroboros, flagHint: hint },
      })),

      setOuroborosScore: (score) => set((state) => ({
        ouroboros: { ...state.ouroboros, score },
      })),

      resetOuroboros: () => set((state) => ({
        operations: {
          ...state.operations,
          'OP-OUROBOROS': {
            ...state.operations['OP-OUROBOROS'],
            status: 'available',
            apiCallsUsed: 0,
            operationId: null,
            startedAt: null,
            solvedAt: null,
          },
        },
        ouroboros: defaultOuroboros,
      })),
    }),
    {
      name: 'dvai-session',
      partialize: (state) => ({
        sessionId: state.sessionId,
        callsign: state.callsign,
        groqApiKey: state.groqApiKey,
        groqKeyValid: state.groqKeyValid,
        isInitialized: state.isInitialized,
        activeTab: state.activeTab,
        operations: state.operations,
        oracle: {
          messages: state.oracle.messages.slice(-50),
          guessHistory: state.oracle.guessHistory,
          score: state.oracle.score,
          notes: state.oracle.notes,
        },
        schemaPoison: {
          chatHistory: state.schemaPoison.chatHistory.slice(-50),
          injectedDocTitle: state.schemaPoison.injectedDocTitle,
          injectedDocId: state.schemaPoison.injectedDocId,
          targetClaim: state.schemaPoison.targetClaim,
          targetDescription: state.schemaPoison.targetDescription,
          kbTitles: state.schemaPoison.kbTitles,
          queryCount: state.schemaPoison.queryCount,
          queryBudget: state.schemaPoison.queryBudget,
          phase: state.schemaPoison.phase,
          score: state.schemaPoison.score,
        },
        ouroboros: {
          isRunning: state.ouroboros.isRunning,
          targetLanguage: state.ouroboros.targetLanguage,
          pipelineRuns: state.ouroboros.pipelineRuns.slice(-20),
          apiCallCount: state.ouroboros.apiCallCount,
          apiCallBudget: state.ouroboros.apiCallBudget,
          phase: state.ouroboros.phase,
          flagHint: state.ouroboros.flagHint,
          score: state.ouroboros.score,
        },
        mutations: state.mutations,
      }),
    }
  )
);
