import { motion } from "framer-motion";
import {
  ArrowRight,
  Layers,
  LogOut,
  MonitorPlay,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  EFFECT_ORDER,
  LUMINA_SLIDES,
  SLIDER_CONFIG,
} from "@/components/ui/lumina-interactive-list";
import { useNavigate } from "react-router";

const PRESET_COUNT = Object.keys(SLIDER_CONFIG.effectPresets).reduce(
  (acc, effect) =>
    acc + Object.keys(SLIDER_CONFIG.effectPresets[effect]).length,
  0,
);

const STATS = [
  { icon: Layers, value: String(LUMINA_SLIDES.length), label: "Exhibits in collection" },
  { icon: Sparkles, value: String(EFFECT_ORDER.length), label: "Live effects" },
  { icon: SlidersHorizontal, value: String(PRESET_COUNT), label: "Intensity presets" },
  { icon: MonitorPlay, value: "60", label: "Frames per second" },
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <main className="min-h-screen bg-[#05060c] text-white">
      {/* header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 font-display text-sm font-semibold tracking-widest">
              L
            </span>
            <div className="leading-none">
              <p className="font-display text-sm font-semibold tracking-[0.3em]">
                LUMINA STUDIO
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
                Your gallery
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer border-white/15 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 size-4" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* greeting */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-white/40">
              Signed in{user?.email ? ` as ${user.email}` : ""}
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Welcome{user?.name ? `, ${user.name}` : " back"}.
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/50">
              Your collection is staged and ready. Jump back into the
              interactive list on the landing page, or browse every exhibit and
              its presets below.
            </p>
          </div>
          <Button
            className="cursor-pointer bg-white text-black hover:bg-white/85"
            onClick={() => navigate("/")}
          >
            Open the interactive list
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </motion.div>

        {/* stats */}
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.05 + i * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <Icon className="size-4 text-white/50" />
                <p className="mt-4 font-display text-3xl font-semibold">
                  {stat.value}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* collection grid */}
        <div className="mt-16">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.35em] text-white/40">
                Collection
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
                The exhibits
              </h2>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LUMINA_SLIDES.map((slide, i) => (
              <motion.article
                key={slide.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.08 + i * 0.05,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors duration-300 hover:border-white/25"
              >
                <div
                  className="relative h-40 overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${slide.palette[0]}, ${slide.palette[1]} 55%, ${slide.palette[2]})`,
                  }}
                >
                  <div
                    className="absolute -right-8 -top-8 size-36 rounded-full opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-90"
                    style={{ backgroundColor: slide.accent }}
                  />
                  <span className="absolute left-4 top-4 font-mono text-xs tracking-widest text-white/70">
                    {slide.index}
                  </span>
                  <span className="absolute bottom-4 right-4 flex gap-1.5">
                    {slide.palette.map((c) => (
                      <span
                        key={c}
                        className="size-2 rounded-full border border-white/30"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-xl font-semibold tracking-tight">
                      {slide.title}
                    </h3>
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: slide.accent }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                    {slide.subtitle}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-white/45">
                    {slide.description}
                  </p>
                </div>
              </motion.article>
            ))}

            {/* placeholder card */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.33, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/15 p-8 text-center"
            >
              <span className="flex size-12 items-center justify-center rounded-full border border-white/15 bg-white/5">
                <Sparkles className="size-5 text-white/60" />
              </span>
              <p className="text-sm text-white/50">
                Add your own artwork and run it through the effect engine.
              </p>
              <Button
                variant="outline"
                className="cursor-pointer border-white/15 bg-transparent text-white/80 hover:bg-white/10 hover:text-white"
                onClick={() => navigate("/")}
              >
                Try it on the landing page
              </Button>
            </motion.article>
          </div>
        </div>

        {/* effects strip */}
        <div className="mt-16 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-white/40">
            Effect engine
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {EFFECT_ORDER.map((effect) => {
              const presets = Object.keys(SLIDER_CONFIG.effectPresets[effect]);
              return (
                <span
                  key={effect}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm"
                >
                  <span className="font-display font-semibold capitalize text-white">
                    {effect}
                  </span>
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">
                    {presets.join(" · ")}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
