import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CategorySummary } from "@/lib/finsight";
import { formatINR } from "@/lib/finsight";
import { Kicker } from "./shared";

export interface UniverseSelection {
  category: CategorySummary | null;
}

export function Universe3D({
  categories,
  income,
  onSelect,
}: {
  categories: CategorySummary[];
  income: number;
  onSelect: (sel: UniverseSelection) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let controls: OrbitControls;
    let raf = 0;
    let disposed = false;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(0, 0);
    let hovered: THREE.Mesh | null = null;
    const nodeMeshes: THREE.Mesh[] = [];

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(container.clientWidth || 300, container.clientHeight || 320);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      container.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(50, (container.clientWidth || 300) / (container.clientHeight || 320), 0.1, 100);
      camera.position.set(0, 2.2, 9);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.8;
      controls.minDistance = 4;
      controls.maxDistance = 16;
      controls.enablePan = false;

      // lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(4, 6, 5);
      scene.add(key);
      const fill = new THREE.PointLight(0x22d3ee, 0.8, 20);
      fill.position.set(-4, -2, 3);
      scene.add(fill);
      const rim = new THREE.PointLight(0xf0abfc, 0.5, 20);
      rim.position.set(0, 4, -4);
      scene.add(rim);

      // starfield
      const starGeo = new THREE.BufferGeometry();
      const starCount = 600;
      const positions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 30;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 2;
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const stars = new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.6 }),
      );
      scene.add(stars);

      const group = new THREE.Group();
      scene.add(group);

      // ── center: total income ──
      const centerGeo = new THREE.SphereGeometry(1, 48, 48);
      const centerMat = new THREE.MeshPhysicalMaterial({
        color: 0x34d399,
        emissive: 0x0f766e,
        emissiveIntensity: 0.7,
        metalness: 0.35,
        roughness: 0.25,
        transparent: true,
        opacity: 0.96,
      });
      const center = new THREE.Mesh(centerGeo, centerMat);
      center.userData = { kind: "center" };
      group.add(center);

      // halo
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
      });
      const halo = new THREE.Mesh(new THREE.SphereGeometry(1.45, 32, 32), haloMat);
      group.add(halo);

      // ring around center
      const ringGeo = new THREE.RingGeometry(1.9, 1.94, 72);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2.2;
      group.add(ring);

      // ── category nodes ──
      const buildNodes = () => {
        // clear old nodes (keep center/halo/ring)
        for (const mesh of nodeMeshes) {
          group.remove(mesh);
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        }
        nodeMeshes.length = 0;

        const cats = categories.slice(0, 9);
        const n = Math.max(1, cats.length);
        const maxAmt = Math.max(...cats.map((c) => c.amount), 1);
        cats.forEach((c, i) => {
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
          const radius = 2.6 + Math.random() * 0.5;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const y = Math.sin(angle * 2) * 0.6;

          const size = 0.28 + (c.amount / maxAmt) * 0.5;
          const geo = new THREE.SphereGeometry(size, 24, 24);
          const mat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(c.color),
            emissive: new THREE.Color(c.color),
            emissiveIntensity: 0.45,
            metalness: 0.2,
            roughness: 0.4,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(x, y, z);
          mesh.userData = { kind: "category", category: c.id, label: c.label, amount: c.amount };
          group.add(mesh);
          nodeMeshes.push(mesh);

          // connection line
          const lineMat = new THREE.LineBasicMaterial({
            color: new THREE.Color(c.color),
            transparent: true,
            opacity: 0.22,
          });
          const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, y, z)];
          const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
          const line = new THREE.Line(lineGeo, lineMat);
          group.add(line);
        });
      };
      buildNodes();

      // ── interaction ──
      const setHighlight = (mesh: THREE.Mesh | null) => {
        if (hovered === mesh) return;
        if (hovered && hovered.userData.kind === "category") {
          (hovered.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.45;
        }
        hovered = mesh;
        if (hovered && hovered.userData.kind === "category") {
          (hovered.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 1.2;
          renderer.domElement.style.cursor = "pointer";
        } else {
          renderer.domElement.style.cursor = "grab";
        }
      };

      const onPointerMove = (e: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(nodeMeshes);
        setHighlight(hits[0]?.object as THREE.Mesh | null);
      };

      const onPointerDown = (e: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(nodeMeshes);
        const hit = hits[0]?.object as THREE.Mesh | undefined;
        if (hit && hit.userData.kind === "category") {
          const cat = categories.find((c) => c.id === hit.userData.category) ?? null;
          selectRef.current({ category: cat });
        }
      };

      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerdown", onPointerDown);

      const onResize = () => {
        const w = container.clientWidth || 300;
        const h = container.clientHeight || 320;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(container);

      const clock = new THREE.Clock();
      const animate = () => {
        if (disposed) return;
        raf = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        group.rotation.y = Math.sin(t * 0.05) * 0.3;
        const pulse = 1 + Math.sin(t * 1.6) * 0.04;
        center.scale.setScalar(pulse);
        halo.scale.setScalar(pulse * 1.02);
        stars.rotation.y += 0.0004;
        controls.update();
        renderer.render(scene, camera);
      };
      animate();
      setReady(true);

      return () => {
        disposed = true;
        cancelAnimationFrame(raf);
        ro.disconnect();
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        controls.dispose();
        nodeMeshes.forEach((m) => {
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        });
        centerGeo.dispose();
        centerMat.dispose();
        starGeo.dispose();
        scene.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
          }
        });
        renderer.dispose();
        if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
      };
    } catch (err) {
      console.error("[FinSight] 3D universe failed to init:", err);
      setReady(true);
    }
  }, [categories, income]);

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(80%_80%_at_50%_20%,rgba(52,211,153,0.08),transparent_60%)]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 z-10">
        <Kicker>Financial Universe</Kicker>
        <p className="mt-1 font-display text-sm font-semibold text-white/80">
          Center: Total income <span className="font-mono text-emerald-300">{formatINR(income)}</span>
        </p>
        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
          Drag to orbit · click a node
        </p>
      </div>
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">Rendering universe…</p>
        </div>
      )}
    </div>
  );
}

export function UniverseDetail({ selection, onClose }: { selection: CategorySummary; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Kicker>Category node</Kicker>
          <h3 className="mt-1 font-display text-2xl font-semibold text-white">{selection.label}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] text-white/50 hover:text-white"
        >
          ✕
        </button>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-4xl font-semibold" style={{ color: selection.color }}>
          {formatINR(selection.amount)}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">/ month</span>
      </div>
      <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-white/60">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/35">Transactions</p>
          <p className="mt-1 font-semibold text-white">{selection.transactions}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/35">Avg tx</p>
          <p className="mt-1 font-semibold text-white">{formatINR(Math.round(selection.avgTx))}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/35">vs avg</p>
          <p className="mt-1 font-semibold text-white">{selection.changePct !== null ? `${selection.changePct > 0 ? "+" : ""}${selection.changePct}%` : "—"}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/35">Share</p>
          <p className="mt-1 font-semibold text-white">{Math.round(selection.share * 100)}%</p>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-white/45">
        Clicking a node opens detailed analytics like this. The full breakdown lives in the Transactions tab.
      </p>
    </div>
  );
}
