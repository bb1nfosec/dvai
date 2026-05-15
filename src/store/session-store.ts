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

// ─── Store ───────────────────────────────────────────────

interface SessionStore {
  // Session
  sessionId: string | null;
  callsign: string | null;
  groqKeyValid: boolean;
  isInitialized: boolean;

  // Navigation
  activeTab: ViewTab;

  // Operations state
  operations: Record<OpCode, OperationState>;

  // OP-ORACLE specific
  oracle: OracleState;

  // Actions
  setSession: (sessionId: string, callsign: string) => void;
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
}

const defaultOperations: Record<OpCode, OperationState> = {
  'OP-ORACLE': { opCode: 'OP-ORACLE', status: 'available', hardeningLevel: 1, apiCallsUsed: 0, apiCallBudget: 10000, operationId: null, startedAt: null, solvedAt: null },
  'OP-SCHEMAPOISON': { opCode: 'OP-SCHEMAPOISON', status: 'locked', hardeningLevel: 1, apiCallsUsed: 0, apiCallBudget: 0, operationId: null, startedAt: null, solvedAt: null },
  'OP-EIGENBLIND': { opCode: 'OP-EIGENBLIND', status: 'locked', hardeningLevel: 1, apiCallsUsed: 0, apiCallBudget: 0, operationId: null, startedAt: null, solvedAt: null },
  'OP-OUROBOROS': { opCode: 'OP-OUROBOROS', status: 'locked', hardeningLevel: 1, apiCallsUsed: 0, apiCallBudget: 0, operationId: null, startedAt: null, solvedAt: null },
  'OP-LONGCON': { opCode: 'OP-LONGCON', status: 'locked', hardeningLevel: 1, apiCallsUsed: 0, apiCallBudget: 0, operationId: null, startedAt: null, solvedAt: null },
  'OP-CARTESIAN': { opCode: 'OP-CARTESIAN', status: 'locked', hardeningLevel: 1, apiCallsUsed: 0, apiCallBudget: 0, operationId: null, startedAt: null, solvedAt: null },
};

const defaultOracle: OracleState = {
  messages: [],
  isQuerying: false,
  guessHistory: [],
  score: null,
  notes: '',
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      sessionId: null,
      callsign: null,
      groqKeyValid: false,
      isInitialized: false,
      activeTab: 'dashboard',
      operations: defaultOperations,
      oracle: defaultOracle,

      setSession: (sessionId, callsign) => set({ sessionId, callsign, isInitialized: true }),
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
    }),
    {
      name: 'dvai-session',
      partialize: (state) => ({
        sessionId: state.sessionId,
        callsign: state.callsign,
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
      }),
    }
  )
);
