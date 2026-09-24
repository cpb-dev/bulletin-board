import { describe, expect, it } from "vitest";
import {
  phaseAt,
  phaseTimes,
  resolvePhase,
  sunPosition,
  SUNRISE_ALTITUDE,
  UK_REFERENCE,
} from "../day-cycle";

const { lat, lon } = UK_REFERENCE;

/** Minutes between two instants. */
const gap = (a: Date | null, b: string) =>
  a ? Math.abs(a.getTime() - Date.parse(b)) / 60_000 : Infinity;

/** The first minute from `from` at which the sun sits below `alt`. */
function firstBelow(from: string, alt: number): Date {
  const start = Date.parse(from);
  for (let m = 0; m < 1440; m++) {
    const at = new Date(start + m * 60_000);
    if (sunPosition(at, lat, lon).altitude < alt) return at;
  }
  throw new Error("sun never set");
}

describe("sunPosition", () => {
  // Almanac figures for London (HM Nautical Almanac Office / timeanddate).
  it("sets at the almanac time in midsummer and midwinter", () => {
    expect(gap(firstBelow("2026-06-21T12:00:00Z", SUNRISE_ALTITUDE), "2026-06-21T20:21:00Z")).toBeLessThanOrEqual(2);
    expect(gap(firstBelow("2026-12-21T12:00:00Z", SUNRISE_ALTITUDE), "2026-12-21T15:53:00Z")).toBeLessThanOrEqual(2);
  });

  it("peaks near 62° in June and 15° in December", () => {
    expect(sunPosition(new Date("2026-06-21T12:02:00Z"), lat, lon).altitude).toBeCloseTo(62, 0);
    expect(sunPosition(new Date("2026-12-21T11:58:00Z"), lat, lon).altitude).toBeCloseTo(15, 0);
  });

  it("knows morning from afternoon", () => {
    expect(sunPosition(new Date("2026-09-24T09:00:00Z"), lat, lon).afternoon).toBe(false);
    expect(sunPosition(new Date("2026-09-24T15:00:00Z"), lat, lon).afternoon).toBe(true);
  });
});

describe("phaseTimes", () => {
  it("midsummer: light at quarter to five, evening at half seven, dark at ten past ten (BST)", () => {
    const t = phaseTimes(new Date("2026-06-21T12:00:00Z"));
    expect(gap(t.sunrise, "2026-06-21T03:43:00Z")).toBeLessThanOrEqual(2);
    expect(gap(t.evening, "2026-06-21T19:28:00Z")).toBeLessThanOrEqual(3);
    expect(gap(t.night, "2026-06-21T21:10:00Z")).toBeLessThanOrEqual(3);
  });

  it("midwinter: light at eight, evening before three, dark by half four (GMT)", () => {
    const t = phaseTimes(new Date("2026-12-21T12:00:00Z"));
    expect(gap(t.sunrise, "2026-12-21T08:04:00Z")).toBeLessThanOrEqual(2);
    expect(gap(t.evening, "2026-12-21T14:52:00Z")).toBeLessThanOrEqual(3);
    expect(gap(t.night, "2026-12-21T16:34:00Z")).toBeLessThanOrEqual(3);
  });

  it("gives summer the longer day and winter the longer night", () => {
    const len = (d: string) => {
      const t = phaseTimes(new Date(d));
      return t.night!.getTime() - t.sunrise!.getTime();
    };
    const summer = len("2026-06-21T12:00:00Z");
    const equinox = len("2026-09-23T12:00:00Z");
    const winter = len("2026-12-21T12:00:00Z");
    expect(summer).toBeGreaterThan(equinox);
    expect(equinox).toBeGreaterThan(winter);
    // ~17h24m of light to night in June against ~8h30m in December
    expect(summer / 3_600_000).toBeCloseTo(17.4, 0);
    expect(winter / 3_600_000).toBeCloseTo(8.5, 0);
  });
});

describe("phaseAt", () => {
  it("steps through the day in order", () => {
    // 24 September 2026, BST (UTC+1)
    expect(phaseAt(new Date("2026-09-24T03:00:00Z"))).toBe("night"); // 4am
    expect(phaseAt(new Date("2026-09-24T05:30:00Z"))).toBe("night"); // dawn, before sunrise
    expect(phaseAt(new Date("2026-09-24T09:00:00Z"))).toBe("day");
    expect(phaseAt(new Date("2026-09-24T17:45:00Z"))).toBe("evening"); // quarter to seven
    expect(phaseAt(new Date("2026-09-24T19:00:00Z"))).toBe("night"); // 8pm
    expect(phaseAt(new Date("2026-09-24T23:30:00Z"))).toBe("night");
  });

  it("the same clock time is a different phase in summer and winter", () => {
    // 6pm local in each
    expect(phaseAt(new Date("2026-06-21T17:00:00Z"))).toBe("day");
    expect(phaseAt(new Date("2026-12-21T18:00:00Z"))).toBe("night");
    // 3:30pm local
    expect(phaseAt(new Date("2026-06-21T14:30:00Z"))).toBe("day");
    expect(phaseAt(new Date("2026-12-21T15:30:00Z"))).toBe("evening");
  });
});

describe("resolvePhase", () => {
  const winterEvening = new Date("2026-12-21T15:30:00Z");
  const winterNight = new Date("2026-12-21T20:00:00Z");

  it("is always day for a theme without a cycle", () => {
    expect(resolvePhase(undefined, winterNight)).toBe("day");
  });

  it("shows all three for a three-phase theme", () => {
    expect(resolvePhase({ phases: 3 }, winterEvening)).toBe("evening");
    expect(resolvePhase({ phases: 3 }, winterNight)).toBe("night");
  });

  it("keeps the evening as day for a two-phase theme", () => {
    expect(resolvePhase({ phases: 2 }, winterEvening)).toBe("day");
    expect(resolvePhase({ phases: 2 }, winterNight)).toBe("night");
  });

  it("honours a testing pin, still folding evening into day for two phases", () => {
    expect(resolvePhase({ phases: 3, pin: "night" }, new Date("2026-06-21T12:00:00Z"))).toBe("night");
    expect(resolvePhase({ phases: 2, pin: "evening" }, winterNight)).toBe("day");
  });
});
