/**
 * The day/night cycle (BB-21): which part of the day it is, worked out
 * from where the sun actually is over the UK right now.
 *
 * Nothing here is a fixed clock time. The phases are defined by the
 * sun's height above the horizon, so they follow the seasons on their
 * own: a December afternoon turns to evening before three and is dark
 * by half past four, a June one stays light until gone ten. Clock
 * changes need no handling either — the sun is worked out from the
 * instant (UTC), and the device's clock is the instant.
 *
 * Opt-in per theme: a theme module that sets `dayCycle` gets a phase,
 * every other theme is always "day". Decided once, when the board
 * loads — never mid-visit.
 *
 * Pure and renderer-free, so it's tested directly.
 */

export type DayPhase = "day" | "evening" | "night";

/**
 * A theme's day/night set-up. `phases: 2` is day and night only: the
 * evening stays day until it gets dark. `phases: 3` adds the evening.
 */
export interface DayCycle {
  phases: 2 | 3;
  /**
   * TESTING ONLY: show this phase whatever the time. Must be unset
   * before a theme ships, or the theme is stuck in one phase — the
   * catalogue test fails if one is left in.
   */
  pin?: DayPhase;
}

/**
 * Where "the UK" is: central London, where the two of us are. Moving
 * this to Edinburgh would shift sunset by up to half an hour either
 * way through the year.
 */
export const UK_REFERENCE = { lat: 51.5074, lon: -0.1278 };

/**
 * The sun heights, in degrees, where the phases change.
 *
 * - Sunrise / sunset is −0.833°: the top of the disc on the horizon,
 *   allowing for refraction — the figure every almanac uses.
 * - Evening starts when the afternoon sun drops below +6°: the start of
 *   golden hour, when the light turns warm and the shadows long.
 * - Night starts at civil dusk, −6°: the end of usable daylight, when
 *   street lamps are on and the first stars show.
 *
 * Night lasts until sunrise, so the grey half hour before dawn is still
 * night.
 */
export const SUNRISE_ALTITUDE = -0.833;
export const EVENING_ALTITUDE = 6;
export const DUSK_ALTITUDE = -6;

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export interface SunPosition {
  /** Degrees above the horizon (negative below it). */
  altitude: number;
  /** True once the sun has passed its highest point today. */
  afternoon: boolean;
}

/**
 * Where the sun is at `when` for an observer at `lat`/`lon` (degrees,
 * east positive). NOAA's solar position equations (after Meeus) —
 * good to well under a minute of time at UK latitudes for this
 * century, far closer than a board needs.
 */
export function sunPosition(when: Date, lat: number, lon: number): SunPosition {
  const jd = when.getTime() / 86_400_000 + 2440587.5;
  const t = (jd - 2451545) / 36525;

  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c =
    Math.sin(m * RAD) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m * RAD) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m * RAD) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD));

  const y = Math.tan((eps / 2) * RAD) ** 2;
  const eqTime =
    4 *
    DEG *
    (y * Math.sin(2 * l0 * RAD) -
      2 * e * Math.sin(m * RAD) +
      4 * e * y * Math.sin(m * RAD) * Math.cos(2 * l0 * RAD) -
      0.5 * y * y * Math.sin(4 * l0 * RAD) -
      1.25 * e * e * Math.sin(2 * m * RAD));

  const utcMinutes =
    when.getUTCHours() * 60 + when.getUTCMinutes() + when.getUTCSeconds() / 60;
  const solarMinutes = (((utcMinutes + eqTime + 4 * lon) % 1440) + 1440) % 1440;
  const hourAngle = solarMinutes / 4 - 180;

  const cosZenith =
    Math.sin(lat * RAD) * Math.sin(decl) +
    Math.cos(lat * RAD) * Math.cos(decl) * Math.cos(hourAngle * RAD);
  const altitude = 90 - Math.acos(Math.min(1, Math.max(-1, cosZenith))) * DEG;
  return { altitude, afternoon: hourAngle > 0 };
}

/** The part of the day at `when`, in the three-phase scheme. */
export function phaseAt(when: Date, where = UK_REFERENCE): DayPhase {
  const { altitude, afternoon } = sunPosition(when, where.lat, where.lon);
  if (afternoon) {
    if (altitude >= EVENING_ALTITUDE) return "day";
    return altitude >= DUSK_ALTITUDE ? "evening" : "night";
  }
  return altitude >= SUNRISE_ALTITUDE ? "day" : "night";
}

/**
 * The phase a theme shows. Themes without a cycle are always "day";
 * a two-phase theme keeps the evening as day.
 */
export function resolvePhase(
  cycle: DayCycle | undefined,
  when: Date,
  where = UK_REFERENCE
): DayPhase {
  if (!cycle) return "day";
  const phase = cycle.pin ?? phaseAt(when, where);
  return cycle.phases === 2 && phase === "evening" ? "day" : phase;
}

export interface PhaseTimes {
  /** Night → day. */
  sunrise: Date | null;
  /** Day → evening (three-phase themes only). */
  evening: Date | null;
  /** Evening → night (or day → night for a two-phase theme). */
  night: Date | null;
}

/**
 * When the phases change on the UTC day containing `day`, to the
 * minute. For tests and for explaining the cycle; the board itself
 * only ever asks `resolvePhase` about now.
 */
export function phaseTimes(day: Date, where = UK_REFERENCE): PhaseTimes {
  const start = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  const out: PhaseTimes = { sunrise: null, evening: null, night: null };
  let prev = phaseAt(new Date(start), where);
  for (let min = 1; min <= 1440; min++) {
    const at = new Date(start + min * 60_000);
    const phase = phaseAt(at, where);
    if (phase !== prev) {
      if (phase === "day") out.sunrise = at;
      else if (phase === "evening") out.evening = at;
      else out.night = at;
      prev = phase;
    }
  }
  return out;
}
