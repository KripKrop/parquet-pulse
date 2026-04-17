import { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { markTourComplete, resetTourLocal } from "@/services/userApi";

export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

export interface TourCtx {
  isMobile: boolean;
  setMobilePanel?: (panel: string | null) => void;
}

export interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  selector?: string;
  mobileSelector?: string;
  placement?: TourPlacement;
  mobilePlacement?: TourPlacement;
  tip?: string;
  warning?: string;
  onEnter?: (ctx: TourCtx) => void | Promise<void>;
  onExit?: (ctx: TourCtx) => void;
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  setSteps: (steps: TourStep[]) => void;
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  finish: () => Promise<void>;
  goTo: (index: number) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setStepsState] = useState<TourStep[]>([]);
  const stepsRef = useRef<TourStep[]>([]);

  const setSteps = useCallback((s: TourStep[]) => {
    stepsRef.current = s;
    setStepsState(s);
  }, []);

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const next = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, stepsRef.current.length - 1));
  }, []);

  const prev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const skip = useCallback(() => {
    setIsActive(false);
    void markTourComplete();
  }, []);

  const finish = useCallback(async () => {
    setIsActive(false);
    await markTourComplete();
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrentStep(Math.max(0, Math.min(index, stepsRef.current.length - 1)));
  }, []);

  return (
    <TourContext.Provider
      value={{ isActive, currentStep, steps, setSteps, start, next, prev, skip, finish, goTo }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
};

export { resetTourLocal };
