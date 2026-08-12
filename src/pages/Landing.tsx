import { motion } from "framer-motion";
import {
  ArrowRight,
  Droplets,
  MousePointer2,
  Snowflake,
  Sparkles,
  Timer,
  Waves,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Component as InteractiveList,
  LUMINA_SLIDES,
  SLIDER_CONFIG,
} from "@/components/ui/lumina-interactive-list";
import { useNavigate } from "react-router";

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 font-display text-sm font-semibold tracking-widest backdrop-blur-sm">
        L
      </span>
      <span className="font-display text-sm font-semibold tracking-[0.3em]">
        LUMINA
      </span>
    </div>
  );
}

const EFFECTS = [
  {
    id: "glass",
    icon: Sparkles,
    label: "Glass",
    gradient: "from-cyan-400/30 via-sky-500/15 to-transparent",
    copy: "Refraction, chromatic aberration and suspended bubbles turn still frames into liquid optics that drift with your cursor.",
    presets: ["Subtle", "Default", "Crystal", "Liquid"],
  },
  {
    id: "frost",
    icon: Snowflake,
    label: "Frost",
    gradient: "from-sky-300/25 via-blue-400/10 to-transparent",
    copy: "Voronoi ice crystals creep across the frame as temperature drives coverage, clarity and grain.",
    presets: ["Light", "Default", "Heavy", "Arctic"],
  },
  {
    id: "ripple",
    icon: Waves,
    label: "Ripple",
    gradient: "from-fuchsia-400/25 via-pink-500/10 to-transparent",
    copy: "Sonar-like waves radiate from your pointer, bending the artwork as they decay into the deep.",
    presets: ["Gentle", "Default", "Intense"],
  },
  {
    id: "plasma",
    icon: Zap,
    label: "Plasma",
    gradient: "from-amber-400/25 via-orange-500/10 to-transparent",
    copy: "Fractal energy fields fold palette into palette, boosted by contrast and turbulence.",
    presets: ["Nebula", "Default", "Inferno"],
  },
  {
    id: "timeshift",
    icon: Timer,
    label: "Timeshift",
    gradient: "from-rose-400/25 via-red-500/10 to-transparent",
    copy: "Time-sliced distortion with chromatic bleed — motion blur for images that never actually move.",
    presets: ["Retro", "Default", "Neon"],
  },
];

const PRESET_COUNT = Object.keys(SLIDER_CONFIG.effectPresets).reduce(
  (acc, effect) =>
    acc + Object.keys(SLIDER_CONFIG.effectPresets[effect]).length,
  0,
);

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#05060c] text-white antialiased">
      {/* ================= NAV ================= */}
      <nav className="absolute inset-x-0 top-0 z-50">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-5 sm:px-10 lg:px-16">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              className="cursor-pointer text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => navigate("/auth")}
            >
              Sign in
            </Button>
            <Button
              className="cursor-pointer bg-white text-black hover:bg-white/85"
              onClick={() => navigate("/dashboard")}
            >
              Enter the gallery
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ================= HERO — THE INTERACTIVE LIST ================= */}
      <section className="relative">
        <InteractiveList showBrand={false} className="h-[100svh]" />

        {/* floating hint */}
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-white/60 backdrop-blur-md sm:flex">
          <MousePointer2 className="size-3.5" />
          Move · Click · Cycle the effects
        </div>
      </section>

      {/* ================= INTRO ================= */}
      <section className="border-y border-white/10 bg-[#07080f]">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8 }}
            className="font-mono text-xs uppercase tracking-[0.35em] text-white/40"
          >
            The Lumina interactive list
          </motion.p>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl"
          >
            One canvas.
            <br />
            Five lenses on light.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-7 max-w-xl text-base leading-relaxed text-white/55"
          >
            Every exhibit in the list is rendered in real time on a WebGL
            shader. Hover the list, move your cursor, and watch five distinct
            effects — glass, frost, ripple, plasma and timeshift — reshape the
            artwork as it slides by. Pick a preset and the intensity stack
            follows.
          </motion.p>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-10 flex flex-wrap gap-8"
          >
            {[
              ["5", "live effects"],
              [`${PRESET_COUNT}`, "intensity presets"],
              ["60fps", "WebGL render"],
              ["2.5s", "GSAP transitions"],
            ].map(([value, label]) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="font-display text-3xl font-semibold text-white">
                  {value}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
                  {label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ================= EFFECTS ================= */}
      <section className="bg-[#05060c]">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.35em] text-white/40">
                Effect engine
              </p>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                A preset for every mood
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/45">
              Each effect is a fragment shader with its own parameter stack —
              refraction, crystal size, ripple frequency, turbulence, and more.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EFFECTS.map((fx, i) => {
              const Icon = fx.icon;
              return (
                <motion.article
                  key={fx.id}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.6,
                    delay: (i % 3) * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={
                    "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.05] " +
                    (i === 0 ? "sm:col-span-2 lg:col-span-1" : "")
                  }
                >
                  <div
                    className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${fx.gradient} opacity-70 transition-opacity duration-500 group-hover:opacity-100`}
                  />
                  <div className="relative flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <span className="flex size-11 items-center justify-center rounded-xl border border-white/15 bg-black/40 backdrop-blur-sm">
                        <Icon className="size-5 text-white/85" />
                      </span>
                      <span className="font-mono text-xs tracking-widest text-white/30">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-semibold tracking-tight">
                        {fx.label}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-white/50">
                        {fx.copy}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {fx.presets.map((p) => (
                        <span
                          key={p}
                          className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 transition-colors group-hover:border-white/20 group-hover:text-white/60"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.article>
              );
            })}

            {/* CTA card completes the grid */}
            <motion.article
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.6,
                delay: 0.16,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative flex flex-col justify-between gap-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-6"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-violet-500/20 blur-3xl" />
              <div className="relative flex flex-col gap-3">
                <Droplets className="size-6 text-white/80" />
                <h3 className="font-display text-2xl font-semibold tracking-tight">
                  {LUMINA_SLIDES.length} exhibits,
                  <br />
                  ready to remix
                </h3>
                <p className="text-sm leading-relaxed text-white/50">
                  Sign in to open the studio and explore the full collection
                  with the same engine on your own artwork.
                </p>
              </div>
              <Button
                className="relative cursor-pointer justify-start bg-white text-black hover:bg-white/85"
                onClick={() => navigate("/dashboard")}
              >
                Open the studio
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </motion.article>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="relative overflow-hidden border-t border-white/10">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[52rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/15 via-fuchsia-500/15 to-amber-500/15 blur-3xl" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-28 text-center sm:py-36">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="font-mono text-xs uppercase tracking-[0.35em] text-white/40"
          >
            Free to start
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl"
          >
            Curate your own
            <br />
            light show.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-lg text-base leading-relaxed text-white/55"
          >
            Create an account, walk the gallery, and bring the interactive list
            into your own projects — component, shaders and all.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Button
              size="lg"
              className="cursor-pointer bg-white px-8 text-black hover:bg-white/85"
              onClick={() => navigate("/auth")}
            >
              Create an account
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="cursor-pointer border-white/20 bg-transparent px-8 text-white hover:border-white/40 hover:bg-white/10"
              onClick={() => navigate("/dashboard")}
            >
              Explore as guest
            </Button>
          </motion.div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">
            No credit card · WebGL required
          </p>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-white/10 bg-[#04050a]">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row sm:px-10 lg:px-16">
          <Logo />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">
            Built with GSAP · Three.js · React
          </p>
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Lumina. All light reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
