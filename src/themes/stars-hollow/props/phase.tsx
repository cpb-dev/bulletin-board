"use client";

import { createContext, useContext } from "react";
import type { DayPhase } from "@/lib/day-cycle";
import { LOOKS, type PhaseLook } from "../lib/looks";

/**
 * The part of the day the square is showing (BB-21), handed down so a
 * lamp or a window deep in the town can light itself without the phase
 * being threaded through every prop. Props staged on their own get day.
 */
const PhaseContext = createContext<DayPhase>("day");

export const PhaseProvider = PhaseContext.Provider;

export function useLook(): PhaseLook {
  return LOOKS[useContext(PhaseContext)];
}
