import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Bug,
  CalendarClock,
  Compass,
  Crosshair,
  Download,
  FlaskConical,
  Flame,
  Gauge,
  GitBranch,
  Globe2,
  HandCoins,
  ListOrdered,
  Network,
  RefreshCcw,
  Settings,
  Sparkles,
  Table2,
  Target,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useFinsight } from "./context";
import type { TabId } from "@/lib/finsight";

interface NavItem {
  id: TabId;
  label: string;
  desc: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", desc: "Health score, flow & universe", icon: Gauge },
  { id: "leaks", label: "Financial Leaks", desc: "Detected money leaks & savings", icon: Flame },
  { id: "transactions", label: "Transactions", desc: "Search, filter & categorize", icon: Table2 },
  { id: "insights", label: "AI Insights", desc: "Explainable insights & profile", icon: Sparkles },
  { id: "root-cause", label: "Root Cause", desc: "Why spending changed", icon: GitBranch },
  { id: "whatif", label: "What If?", desc: "Behavior simulator", icon: FlaskConical },
  { id: "forecast", label: "Forecast", desc: "Predictions & risk", icon: BarChart3 },
  { id: "goals", label: "Goals", desc: "Savings goals & acceleration", icon: Target },
  { id: "subscriptions", label: "Subscriptions", desc: "Recurring payments", icon: CalendarClock },
  { id: "anomalies", label: "Anomalies", desc: "Unusual transactions & duplicates", icon: AlertTriangle },
  { id: "network", label: "Financial Network", desc: "Leak cascade graph", icon: Network },
  { id: "reports", label: "Reports", desc: "Monthly report generator", icon: HandCoins },
  { id: "settings", label: "Settings", desc: "Data, privacy & preferences", icon: Settings },
];

export function CommandBar() {
  const { commandOpen, setCommandOpen, setTab, loadDemo, setCopilotOpen, setCopilotPrompt } = useFinsight();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commandOpen, setCommandOpen]);

  const copilotAsk = (q: string) => {
    setCopilotPrompt(q);
    setCopilotOpen(true);
    setCommandOpen(false);
  };

  const run = (fn: () => void) => {
    fn();
    setCommandOpen(false);
  };

  const quick = useMemo(() => NAV_ITEMS.slice(0, 8), []);

  return (
    <AnimatePresence>
      {commandOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setCommandOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-[#0a0d17] shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            <Command label="FinSight command center" shouldFilter={false}>
              <div className="flex items-center gap-3 border-b border-white/10 px-4">
                <Compass className="size-4 shrink-0 text-emerald-400/80" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Find transactions above ₹5,000 · show subscriptions · why did spending increase?"
                  className="h-12 w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
                />
                <kbd className="shrink-0 rounded border border-white/15 px-1.5 py-0.5 font-mono text-[9px] text-white/40">ESC</kbd>
              </div>

              <Command.List className="max-h-[420px] overflow-y-auto p-2">
                {query.trim().length === 0 && (
                  <>
                    <Command.Group heading="Navigate">
                      {quick.map((item) => (
                        <Command.Item
                          key={item.id}
                          value={item.id}
                          onSelect={() => run(() => setTab(item.id))}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 data-[selected=true]:bg-white/10"
                        >
                          <item.icon className="size-4 text-white/50" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{item.label}</p>
                            <p className="text-[11px] text-white/40">{item.desc}</p>
                          </div>
                          <ArrowRight className="size-3.5 text-white/25" />
                        </Command.Item>
                      ))}
                    </Command.Group>
                    <Command.Group heading="Actions">
                      <Command.Item
                        value="load-demo"
                        onSelect={() => run(loadDemo)}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 data-[selected=true]:bg-white/10"
                      >
                        <RefreshCcw className="size-4 text-emerald-400/80" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">Load demo data</p>
                          <p className="text-[11px] text-white/40">Reset to the curated 6-month sample</p>
                        </div>
                      </Command.Item>
                      <Command.Item
                        value="ask-copilot"
                        onSelect={() => run(() => copilotAsk("Where am I wasting the most money?"))}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 data-[selected=true]:bg-white/10"
                      >
                        <Bot className="size-4 text-sky-400/80" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">Ask FinSight Copilot</p>
                          <p className="text-[11px] text-white/40">AI answers grounded in your data</p>
                        </div>
                      </Command.Item>
                    </Command.Group>
                  </>
                )}

                {query.trim().length > 0 && (
                  <Command.Group heading="Navigate">
                    {NAV_ITEMS.filter((n) => (n.label + " " + n.desc).toLowerCase().includes(query.toLowerCase())).map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`nav-${item.id}`}
                        onSelect={() => run(() => setTab(item.id))}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 data-[selected=true]:bg-white/10"
                      >
                        <item.icon className="size-4 text-white/50" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{item.label}</p>
                          <p className="text-[11px] text-white/40">{item.desc}</p>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {query.trim().length > 0 && (
                  <Command.Group heading="Ask the copilot">
                    <Command.Item
                      value="ask-any"
                      onSelect={() => run(() => copilotAsk(query))}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 data-[selected=true]:bg-white/10"
                    >
                      <Bot className="size-4 text-sky-400/80" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">Ask FinSight Copilot: “{query}”</p>
                        <p className="text-[11px] text-white/40">Answers reference your actual transactions</p>
                      </div>
                    </Command.Item>
                  </Command.Group>
                )}

                <Command.Empty className="py-6 text-center text-sm text-white/40">
                  No matches — try a question like “how can I save ₹5,000?”
                </Command.Empty>
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const NAV_LABELS: Record<TabId, string> = Object.fromEntries(NAV_ITEMS.map((n) => [n.id, n.label])) as Record<TabId, string>;
export { Bot, Bug, Crosshair, Download, Globe2, ListOrdered, Wrench };
