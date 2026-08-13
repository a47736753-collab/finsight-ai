import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Bot, MessageSquare, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { answerCopilot, QUICK_PROMPTS } from "@/lib/finsight";
import type { CopilotAnswer, TabId } from "@/lib/finsight";
import { useFinsight } from "./context";
import { NAV_LABELS } from "./CommandBar";

interface Message {
  role: "user" | "ai";
  text: string;
  citations?: string[];
  nav?: TabId;
}

function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="flex flex-col gap-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        const trimmed = line.trim();
        if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
          return (
            <div key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-white/75">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-400/70" />
              <span>{renderInline(trimmed.replace(/^[•-]\s*/, ""))}</span>
            </div>
          );
        }
        return (
          <p key={i} className="text-[13px] leading-relaxed text-white/75">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <span key={i} className="font-semibold text-white">
        {p.slice(2, -2)}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function Copilot() {
  const { analysis, copilotOpen, setCopilotOpen, copilotPrompt, setCopilotPrompt, setTab } = useFinsight();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const ask = (q: string) => {
    if (!q.trim()) return;
    const answer: CopilotAnswer = answerCopilot(analysis, q);
    setMessages((prev) => [...prev, { role: "user", text: q }, { role: "ai", text: answer.text, citations: answer.citations, nav: answer.nav }]);
    setInput("");
  };

  const handleAsk = (q: string) => {
    setThinking(true);
    // small delay so the "thinking" state is perceptible — answers are computed locally
    setTimeout(() => {
      ask(q);
      setThinking(false);
    }, 350);
  };

  // when the command bar hands us a prompt
  useEffect(() => {
    if (copilotPrompt) {
      handleAsk(copilotPrompt);
      setCopilotPrompt("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copilotPrompt]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  return (
    <>
      {/* launcher */}
      <motion.button
        type="button"
        onClick={() => setCopilotOpen(!copilotOpen)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.4 }}
        className="fixed bottom-5 right-5 z-[60] flex size-14 cursor-pointer items-center justify-center rounded-2xl border border-emerald-400/30 bg-[#0a0d17] shadow-lg shadow-emerald-500/10 transition-transform hover:scale-105"
        aria-label="Open FinSight Copilot"
      >
        {copilotOpen ? (
          <X className="size-5 text-white/80" />
        ) : (
          <Bot className="size-6 text-emerald-300" />
        )}
        <motion.span
          className="absolute inset-0 rounded-2xl border border-emerald-400/40"
          animate={{ opacity: [0.6, 0], scale: [1, 1.25] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
        />
      </motion.button>

      <AnimatePresence>
        {copilotOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-5 z-[60] flex h-[560px] max-h-[75vh] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#080b14]/95 shadow-2xl shadow-black/60 backdrop-blur-xl"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-400/10">
                  <Bot className="size-4 text-emerald-300" />
                </span>
                <div>
                  <p className="font-display text-sm font-semibold text-white">FinSight Copilot</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-300/70">● online · data-grounded</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCopilotOpen(false)}
                className="cursor-pointer rounded-full border border-white/10 p-1.5 text-white/50 hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* messages */}
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="flex flex-col gap-2 pt-2">
                  <p className="text-[13px] leading-relaxed text-white/55">
                    Ask me anything about your finances — I answer using <span className="text-white/85">your actual transactions</span>, not generic advice.
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.slice(0, 6).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleAsk(p)}
                        className="cursor-pointer rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/60 transition-colors hover:border-emerald-400/40 hover:text-emerald-200"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-400/15 px-3.5 py-2.5 text-[13px] text-emerald-100"
                        : "max-w-[95%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.04] px-3.5 py-3"
                    }
                  >
                    {m.role === "user" ? (
                      <p className="leading-relaxed">{m.text}</p>
                    ) : (
                      <>
                        <RichText text={m.text} />
                        {m.citations && m.citations.length > 0 && (
                          <div className="mt-2.5 border-t border-white/10 pt-2">
                            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">Evidence from your data</p>
                            <ul className="mt-1 flex flex-col gap-0.5">
                              {m.citations.map((c, j) => (
                                <li key={j} className="flex items-start gap-1.5 text-[11px] text-white/50">
                                  <span className="mt-1 size-1 shrink-0 rounded-full bg-sky-400/60" />
                                  {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {m.nav && (
                          <button
                            type="button"
                            onClick={() => {
                              setTab(m.nav!);
                              setCopilotOpen(false);
                            }}
                            className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-emerald-300 transition-colors hover:bg-emerald-400/20"
                          >
                            <MessageSquare className="size-3" />
                            Open {NAV_LABELS[m.nav]}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.04] px-4 py-3">
                    <span className="size-1.5 animate-bounce rounded-full bg-emerald-400" />
                    <span className="size-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:120ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:240ms]" />
                  </div>
                </div>
              )}
            </div>

            {/* input */}
            <div className="border-t border-white/10 p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAsk(input);
                }}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 focus-within:border-emerald-400/40"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your money…"
                  className="h-8 w-full bg-transparent text-[13px] text-white placeholder:text-white/30 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-emerald-400/20 text-emerald-300 transition-colors hover:bg-emerald-400/30 disabled:opacity-40"
                  disabled={!input.trim() || thinking}
                >
                  <ArrowUp className="size-3.5" />
                </button>
              </form>
              <p className="mt-2 px-1 font-mono text-[8px] uppercase tracking-[0.15em] text-white/25">
                Deterministic engine · answers reference your data · no external API
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
