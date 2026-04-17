import { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sparkles, Upload, FolderOpen, Files as FilesIcon, Filter,
  Columns3, Download, CheckCircle2,
} from "lucide-react";
import { useTour, type TourStep } from "@/contexts/TourContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAI } from "@/contexts/AIContext";
import { useDatasetVersion } from "@/hooks/useDatasetVersionCheck";
import { useAuth } from "@/contexts/AuthContext";
import { TourSpotlight } from "./TourSpotlight";
import { TourTooltip } from "./TourTooltip";

// Dispatch a custom event Index.tsx listens for to open mobile drawers
function openMobilePanel(panel: "upload" | "filters" | "columns" | null) {
  window.dispatchEvent(new CustomEvent("crunch:tour-mobile-panel", { detail: panel }));
}

function buildSteps(opts: { isMobile: boolean; aiStale: boolean }): TourStep[] {
  const { aiStale } = opts;

  return [
    {
      id: "welcome",
      title: "Welcome to Crunch",
      description:
        "Crunch turns your CSVs into an explorable dataset. In about 90 seconds we'll show you how to upload data, filter it, query it with AI, and export results. You can skip anytime — replay this tour from Settings.",
      icon: Sparkles,
      placement: "center",
    },
    {
      id: "upload",
      title: "Upload your data",
      description:
        "Drag and drop a CSV here, or click to browse. Files up to 1.5 GB are split into 5 MB chunks and uploaded in the background — you can keep working while they process. Each upload becomes a queryable file in your dataset.",
      icon: Upload,
      selector: '[data-tour="upload"]',
      mobileSelector: '[data-tour="mobile-upload"]',
      placement: "right",
      mobilePlacement: "top",
      tip: "Uploads survive page refreshes and continue in the background.",
      onEnter: ({ isMobile }) => { if (isMobile) openMobilePanel("upload"); },
      onExit: ({ isMobile }) => { if (isMobile) openMobilePanel(null); },
    },
    {
      id: "files-nav",
      title: "Browse your files",
      description:
        "The Files page lists every CSV in your tenant. Sort by name, date, size, or row count, search by filename, and select multiple files to bulk-delete, export metadata, or compare two schemas side by side.",
      icon: FolderOpen,
      selector: '[data-tour="files-nav"]',
      placement: "bottom",
    },
    {
      id: "file-select",
      title: "Filter across files",
      description:
        "Pick which uploaded files contribute to the current view. Selecting two or more files lets you query them as one merged dataset — useful when monthly exports share the same schema.",
      icon: FilesIcon,
      selector: '[data-tour="file-select"]',
      mobileSelector: '[data-tour="mobile-filters"]',
      placement: "right",
      mobilePlacement: "top",
      onEnter: ({ isMobile }) => { if (isMobile) openMobilePanel("filters"); },
    },
    {
      id: "filters",
      title: "Slice by column",
      description:
        "Add filters on any column: ranges for numbers and dates, multi-select for categories, free text for strings. All filters sync to the URL, so you can bookmark or share an exact view of your data.",
      icon: Filter,
      selector: '[data-tour="filters"]',
      mobileSelector: '[data-tour="mobile-filters"]',
      placement: "right",
      mobilePlacement: "top",
      tip: "Filters update the table and AI context together.",
      onExit: ({ isMobile }) => { if (isMobile) openMobilePanel(null); },
    },
    {
      id: "columns",
      title: "Customize columns",
      description:
        "Show, hide, reorder, and pin columns. Your layout is saved per-dataset, so the table looks the way you want every time you return.",
      icon: Columns3,
      selector: '[data-tour="columns"]',
      mobileSelector: '[data-tour="mobile-columns"]',
      placement: "left",
      mobilePlacement: "top",
    },
    {
      id: "ai",
      title: "Ask the AI",
      description:
        "Ask questions in plain English — \"top 10 customers by revenue this quarter\" or \"what changed between March and April?\". The AI uses your current filters as context and can return narrative answers or live tables you can drill into.",
      icon: Sparkles,
      selector: '[data-tour="ai"]',
      placement: "bottom",
      warning: aiStale ? "Rebuild the index after large uploads to keep answers accurate." : undefined,
    },
    {
      id: "export",
      title: "Export to CSV",
      description:
        "Download the current filtered view as a CSV. Large exports run in the background — a floating widget shows progress, and you can keep filtering or start a new export while it's working.",
      icon: Download,
      selector: '[data-tour="export"]',
      placement: "left",
    },
    {
      id: "done",
      title: "You're all set 🎉",
      description:
        "That's the tour. You can replay it anytime from Settings → Replay onboarding tour. Now upload your first file and start exploring.",
      icon: CheckCircle2,
      placement: "center",
    },
  ];
}

function Confetti() {
  const particles = Array.from({ length: 14 });
  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: 120 }} aria-hidden>
      {particles.map((_, i) => {
        const angle = (i / particles.length) * Math.PI * 2;
        const dist = 120 + Math.random() * 80;
        return (
          <motion.div
            key={i}
            initial={{ x: "50vw", y: "50vh", opacity: 1, scale: 1 }}
            animate={{
              x: `calc(50vw + ${Math.cos(angle) * dist}px)`,
              y: `calc(50vh + ${Math.sin(angle) * dist}px)`,
              opacity: 0,
              scale: 0.4,
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute h-2 w-2 rounded-full bg-primary"
          />
        );
      })}
    </div>
  );
}

export function OnboardingTour() {
  const { isAuthenticated } = useAuth();
  const { isActive, currentStep, steps, setSteps, next, prev, skip, finish, goTo } = useTour();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { indexStatus } = useAI();
  const { data: currentVersion } = useDatasetVersion(isAuthenticated);

  const aiStale = !!(
    indexStatus &&
    currentVersion &&
    currentVersion !== "unknown" &&
    indexStatus.dataset_version !== currentVersion
  );

  const [rect, setRect] = useState<DOMRect | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Build / rebuild step config when mobile or AI staleness changes
  useEffect(() => {
    setSteps(buildSteps({ isMobile, aiStale }));
  }, [isMobile, aiStale, setSteps]);

  const step = steps[currentStep];

  // Fire onEnter / onExit + navigate to / + resolve target rect
  useEffect(() => {
    if (!isActive || !step) return;

    // Tour only runs on /
    if (location.pathname !== "/") {
      navigate("/", { replace: false });
    }

    const ctx = { isMobile };
    const enterPromise = step.onEnter ? Promise.resolve(step.onEnter(ctx)) : Promise.resolve();

    enterPromise.then(() => {
      // Resolve target after potential drawer open
      const selector = isMobile && step.mobileSelector ? step.mobileSelector : step.selector;
      const updateRect = () => {
        if (!selector) {
          setRect(null);
          return;
        }
        const el = document.querySelector(selector) as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          // Wait a frame for scroll to settle
          requestAnimationFrame(() => {
            setRect(el.getBoundingClientRect());
          });
        } else {
          setRect(null);
        }
      };

      // Give drawers / animations a moment to open
      const t1 = setTimeout(updateRect, step.onEnter ? 350 : 50);
      const t2 = setTimeout(updateRect, 700);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    });

    return () => {
      if (step.onExit) step.onExit({ isMobile });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep, step?.id, isMobile]);

  // Keep rect in sync on resize / scroll
  useEffect(() => {
    if (!isActive || !step) return;
    const selector = isMobile && step.mobileSelector ? step.mobileSelector : step.selector;
    if (!selector) return;

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (el) setRect(el.getBoundingClientRect());
      });
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const interval = setInterval(update, 500); // catch layout shifts
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      clearInterval(interval);
      cancelAnimationFrame(raf);
    };
  }, [isActive, step, isMobile]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Escape") { e.preventDefault(); skip(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, next, prev, skip]);

  const handleFinish = useCallback(async () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 900);
    await finish();
  }, [finish]);

  if (!isActive || !step) return null;

  const placement = (isMobile && step.mobilePlacement) ? step.mobilePlacement : (step.placement ?? "bottom");
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return createPortal(
    <>
      <TourSpotlight rect={placement === "center" ? null : rect} />
      <AnimatePresence mode="wait">
        <TourTooltip
          key={step.id}
          step={step}
          index={currentStep}
          total={steps.length}
          rect={placement === "center" ? null : rect}
          placement={placement}
          isFirst={isFirst}
          isLast={isLast}
          onNext={next}
          onPrev={prev}
          onSkip={skip}
          onFinish={handleFinish}
          onGoTo={goTo}
        />
      </AnimatePresence>
      {showConfetti && <Confetti />}
    </>,
    document.body
  );
}
