import { AnimatePresence, motion } from "framer-motion";
import { Bot, LogOut, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { CommandBar, NAV_ITEMS } from "@/components/finsight/CommandBar";
import { Copilot } from "@/components/finsight/Copilot";
import { FinsightProvider, useFinsight } from "@/components/finsight/context";
import { OverviewTab } from "@/components/finsight/OverviewTab";
import { LeaksTab } from "@/components/finsight/LeaksTab";
import { TransactionsTab } from "@/components/finsight/TransactionsTab";
import { InsightsTab } from "@/components/finsight/InsightsTab";
import { RootCauseTab } from "@/components/finsight/RootCauseTab";
import { WhatIfTab } from "@/components/finsight/WhatIfTab";
import { ForecastTab } from "@/components/finsight/ForecastTab";
import { GoalsTab } from "@/components/finsight/GoalsTab";
import { SubscriptionsTab } from "@/components/finsight/SubscriptionsTab";
import { AnomaliesTab } from "@/components/finsight/AnomaliesTab";
import { NetworkTab } from "@/components/finsight/NetworkTab";
import { ReportsTab } from "@/components/finsight/ReportsTab";
import { SettingsTab } from "@/components/finsight/SettingsTab";
import type { TabId } from "@/lib/finsight";

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-xl border border-emerald-400/40 bg-gradient-to-br from-emerald-400/25 to-sky-500/10">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="#34d399" strokeWidth="1.6" opacity="0.5" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill="#34d399" />
        </svg>
      </span>
      <div className="leading-none">
        <p className="font-display text-sm font-semibold tracking-tight text-white">
          FinSight <span className="text-emerald-300">AI</span>
        </p>
        {!compact && <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.3em] text-white/35">Financial command center</p>}
      </div>
    </div>
  );
}

function TabView({ tab }: { tab: TabId }) {
  switch (tab) {
    case "overview":
      return <OverviewTab />;
    case "leaks":
      return <LeaksTab />;
    case "transactions":
      return <TransactionsTab />;
    case "insights":
      return <InsightsTab />;
    case "root-cause":
      return <RootCauseTab />;
    case "whatif":
      return <WhatIfTab />;
    case "forecast":
      return <ForecastTab />;
    case "goals":
      return <GoalsTab />;
    case "subscriptions":
      return <SubscriptionsTab />;
    case "anomalies":
      return <AnomaliesTab />;
    case "network":
      return <NetworkTab />;
    case "reports":
      return <ReportsTab />;
    case "settings":
      return <SettingsTab />;
    default:
      return <OverviewTab />;
  }
}

function EmptyData() {
  const { loadDemo } = useFinsight();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="text-4xl">🛰️</span>
      <h2 className="font-display text-2xl font-semibold text-white">No financial data yet</h2>
      <p className="max-w-md text-sm text-white/50">
        Load the curated demo dataset to see the full command center — leaks, anomalies, forecast and copilot — populated with realistic Indian
        transactions.
      </p>
      <button
        type="button"
        onClick={loadDemo}
        className="cursor-pointer rounded-full bg-emerald-400 px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-300"
      >
        Load demo data
      </button>
    </div>
  );
}

function Shell() {
  const { tab, setTab, setCommandOpen, setCopilotOpen, analysis, txs } = useFinsight();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const Nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const active = tab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setMobileOpen(false);
            }}
            className={
              "group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 " +
              (active ? "bg-emerald-400/10 text-white" : "text-white/50 hover:bg-white/[0.05] hover:text-white/85")
            }
          >
            <item.icon className={"size-4 shrink-0 transition-colors " + (active ? "text-emerald-300" : "text-white/35 group-hover:text-white/60")} />
            <span className="text-[13px] font-medium">{item.label}</span>
            {active && <span className="ml-auto size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
          </button>
        );
      })}
    </nav>
  );

  const SidebarFooter = (
    <div className="border-t border-white/10 p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] font-mono text-xs text-white/70">
          {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() ?? "U"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-white/85">{user?.name ?? "Signed in"}</p>
          <p className="truncate font-mono text-[9px] text-white/35">{user?.email ?? "FinSight user"}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          title="Sign out"
          className="cursor-pointer rounded-lg border border-white/10 p-2 text-white/40 transition-colors hover:border-rose-400/30 hover:text-rose-300"
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05060c] text-white antialiased">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 left-1/4 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/[0.05] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-96 rounded-full bg-sky-500/[0.04] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,transparent_50%,rgba(2,4,12,0.5)_100%)]" />
      </div>

      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/[0.08] bg-[#07090f]/80 backdrop-blur-xl lg:flex">
        <div className="border-b border-white/[0.08] px-5 py-5">
          <Brand />
        </div>
        {Nav}
        {SidebarFooter}
      </aside>

      {/* mobile header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/[0.08] bg-[#07090f]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Brand compact />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCopilotOpen(true)}
            className="cursor-pointer rounded-xl border border-white/10 p-2 text-white/60"
            aria-label="Open copilot"
          >
            <Bot className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="cursor-pointer rounded-xl border border-white/10 p-2 text-white/60"
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </header>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-[#07090f] lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-4">
                <Brand compact />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="cursor-pointer rounded-lg border border-white/10 p-1.5 text-white/50"
                >
                  <X className="size-4" />
                </button>
              </div>
              {Nav}
              {SidebarFooter}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* main */}
      <main className="relative z-10 lg:pl-60">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8 sm:py-8">
          {/* top bar */}
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
                {analysis.currentMonthLabel} · {analysis.txs.length} transactions
              </p>
              <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {analysis.health.score}/100 health{analysis.potentialSavings.monthly > 0 ? ` · ${analysis.potentialSavings.monthly >= 100000 ? `${(analysis.potentialSavings.monthly / 100000).toFixed(1)}L` : analysis.potentialSavings.monthly}k potential` : ""}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="flex h-10 cursor-pointer items-center gap-2.5 rounded-xl border border-white/12 bg-white/[0.03] px-4 text-sm text-white/55 transition-colors hover:border-white/25 hover:text-white/80"
              >
                <Search className="size-3.5" />
                <span className="hidden sm:inline">Search or ask…</span>
                <span className="sm:hidden">Ask…</span>
                <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-[9px] text-white/40">⌘K</kbd>
              </button>
              <button
                type="button"
                onClick={() => setCopilotOpen(true)}
                className="hidden h-10 cursor-pointer items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-400/20 sm:flex"
              >
                <Bot className="size-4" />
                Copilot
              </button>
            </div>
          </div>

          {txs.length === 0 ? (
            <EmptyData />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <TabView tab={tab} />
              </motion.div>
            </AnimatePresence>
          )}

          <footer className="mt-14 border-t border-white/[0.06] pt-6 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/25">
                DETECT · EXPLAIN · PREDICT · SIMULATE · ACT
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/20">
                Demo analytics · potential savings are estimates
              </p>
            </div>
          </footer>
        </div>
      </main>

      <CommandBar />
      <Copilot />
    </div>
  );
}

export default function Dashboard() {
  return (
    <FinsightProvider>
      <Shell />
    </FinsightProvider>
  );
}
