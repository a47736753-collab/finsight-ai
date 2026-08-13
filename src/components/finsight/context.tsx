import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  analyzeAll,
  DEFAULT_GOALS,
  generateDemoTransactions,
  potentialSavings,
} from "@/lib/finsight";
import type {
  Analysis,
  CategoryId,
  Goal,
  Leak,
  TabId,
  Transaction,
} from "@/lib/finsight";

interface FinsightContextValue {
  txs: Transaction[];
  goals: Goal[];
  analysis: Analysis;
  tab: TabId;
  setTab: (t: TabId) => void;
  loadDemo: () => void;
  importTxs: (txs: Transaction[]) => void;
  clearData: () => void;
  updateGoalCurrent: (id: string, current: number) => void;
  addGoal: (g: { name: string; emoji: string; target: number; current: number; monthlyTarget?: number }) => void;
  removeGoal: (id: string) => void;
  leakStatus: Record<string, Leak["status"]>;
  setLeakStatus: (id: string, s: Leak["status"]) => void;
  recategorize: (txId: string, category: CategoryId) => void;
  copilotOpen: boolean;
  setCopilotOpen: (b: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (b: boolean) => void;
  copilotPrompt: string;
  setCopilotPrompt: (p: string) => void;
}

const FinsightContext = createContext<FinsightContextValue | null>(null);

export function FinsightProvider({ children }: { children: ReactNode }) {
  // Demo data is preloaded so the command center is alive on first visit;
  // users can wipe it (Settings → Delete data) or replace it with their CSV.
  const [txs, setTxs] = useState<Transaction[]>(() => generateDemoTransactions());
  const [goals, setGoals] = useState<Goal[]>(() => DEFAULT_GOALS.map((g) => ({ ...g, createdAt: new Date().toISOString().slice(0, 10) })));
  const [tab, setTab] = useState<TabId>("overview");
  const [leakStatus, setLeakStatusRaw] = useState<Record<string, Leak["status"]>>({});
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [copilotPrompt, setCopilotPrompt] = useState("");

  const analysis = useMemo<Analysis>(() => {
    const base = analyzeAll(txs, goals);
    const applied = Object.keys(leakStatus).length
      ? base.leaks.map((l) => (leakStatus[l.id] ? { ...l, status: leakStatus[l.id] } : l))
      : base.leaks;
    const visible = applied.filter((l) => l.status !== "dismissed" && l.status !== "useful");
    if (visible.length === applied.length) return base;
    const pot = potentialSavings(visible);
    return { ...base, leaks: visible, potentialSavings: pot };
  }, [txs, goals, leakStatus]);

  const loadDemo = useCallback(() => {
    setTxs(generateDemoTransactions());
    setGoals(DEFAULT_GOALS.map((g) => ({ ...g, createdAt: new Date().toISOString().slice(0, 10) })));
    setLeakStatusRaw({});
    setTab("overview");
  }, []);

  const importTxs = useCallback((incoming: Transaction[]) => {
    if (!incoming.length) return;
    setTxs(incoming);
    setLeakStatusRaw({});
  }, []);

  const clearData = useCallback(() => {
    setTxs([]);
    setGoals([]);
    setLeakStatusRaw({});
  }, []);

  const updateGoalCurrent = useCallback((id: string, current: number) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, current: Math.max(0, Math.min(g.target, current)) } : g)));
  }, []);

  const addGoal = useCallback((g: { name: string; emoji: string; target: number; current: number; monthlyTarget?: number }) => {
    setGoals((prev) => [
      ...prev,
      { ...g, id: `goal-${Date.now().toString(36)}`, createdAt: new Date().toISOString().slice(0, 10) },
    ]);
  }, []);

  const removeGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const setLeakStatus = useCallback((id: string, s: Leak["status"]) => {
    setLeakStatusRaw((prev) => ({ ...prev, [id]: s }));
  }, []);

  const recategorize = useCallback((txId: string, category: CategoryId) => {
    setTxs((prev) => prev.map((t) => (t.id === txId ? { ...t, category, confidence: 95 } : t)));
  }, []);

  const value: FinsightContextValue = {
    txs,
    goals,
    analysis,
    tab,
    setTab,
    loadDemo,
    importTxs,
    clearData,
    updateGoalCurrent,
    addGoal,
    removeGoal,
    leakStatus,
    setLeakStatus,
    recategorize,
    copilotOpen,
    setCopilotOpen,
    commandOpen,
    setCommandOpen,
    copilotPrompt,
    setCopilotPrompt,
  };

  return <FinsightContext.Provider value={value}>{children}</FinsightContext.Provider>;
}

export function useFinsight() {
  const ctx = useContext(FinsightContext);
  if (!ctx) throw new Error("useFinsight must be used within FinsightProvider");
  return ctx;
}
