import { describe, expect, it } from "vitest";
import {
  archiveCutoff,
  fixtureLine,
  fixtureNoteText,
  groupFixtures,
  isWorldCupActive,
  normalizeFootballData,
  worldCupArchiveDue,
  type Fixture,
  WORLD_CUP,
} from "../worldcup";

function fx(overrides: Partial<Fixture> = {}): Fixture {
  return {
    id: "1",
    utcDate: "2026-06-11T19:00:00Z",
    status: "scheduled",
    stage: "Group Stage",
    group: "Group A",
    home: "Mexico",
    away: "Brazil",
    homeScore: null,
    awayScore: null,
    ...overrides,
  };
}

describe("tournament timing", () => {
  it("archive cutoff is two days after the final", () => {
    const cutoff = archiveCutoff();
    expect(cutoff.toISOString().slice(0, 10)).toBe("2026-07-21");
  });

  it("is active during the tournament and grace period", () => {
    expect(isWorldCupActive(new Date("2026-06-14T12:00:00Z"))).toBe(true);
    expect(isWorldCupActive(new Date("2026-07-20T12:00:00Z"))).toBe(true);
  });

  it("retires once the grace period has passed", () => {
    const after = new Date("2026-07-22T12:00:00Z");
    expect(isWorldCupActive(after)).toBe(false);
    expect(worldCupArchiveDue(after)).toBe(true);
    expect(worldCupArchiveDue(new Date("2026-06-14T00:00:00Z"))).toBe(false);
  });

  it("uses the configured tournament dates", () => {
    expect(WORLD_CUP.end).toBe("2026-07-19");
  });
});

describe("normalizeFootballData", () => {
  it("maps matches to our fixture shape", () => {
    const fixtures = normalizeFootballData({
      matches: [
        {
          id: 42,
          utcDate: "2026-06-11T19:00:00Z",
          status: "FINISHED",
          stage: "GROUP_STAGE",
          group: "GROUP_A",
          homeTeam: { name: "Mexico" },
          awayTeam: { name: "Brazil" },
          score: { fullTime: { home: 2, away: 1 } },
        },
      ],
    });
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]).toMatchObject({
      id: "42",
      status: "finished",
      stage: "Group Stage",
      group: "Group A",
      home: "Mexico",
      away: "Brazil",
      homeScore: 2,
      awayScore: 1,
    });
  });

  it("maps in-play to live and missing data to TBD/null", () => {
    const [f] = normalizeFootballData({
      matches: [{ id: 1, utcDate: "x", status: "IN_PLAY" }],
    });
    expect(f.status).toBe("live");
    expect(f.home).toBe("TBD");
    expect(f.homeScore).toBeNull();
  });

  it("tolerates an empty / malformed payload", () => {
    expect(normalizeFootballData(null)).toEqual([]);
    expect(normalizeFootballData({})).toEqual([]);
  });
});

describe("fixtureLine", () => {
  it("shows the scoreline once a game has a result", () => {
    expect(
      fixtureLine(fx({ status: "finished", homeScore: 3, awayScore: 0 }))
    ).toBe("3 – 0");
  });

  it("shows a kickoff time for scheduled games", () => {
    expect(fixtureLine(fx())).not.toBe("3 – 0");
    expect(fixtureLine(fx()).length).toBeGreaterThan(0);
  });
});

describe("fixtureNoteText", () => {
  it("reads like a result line", () => {
    const text = fixtureNoteText(
      fx({ status: "finished", homeScore: 1, awayScore: 1 })
    );
    expect(text).toBe("Mexico 1 – 1 Brazil");
  });
});

describe("groupFixtures", () => {
  it("groups by stage and sorts each group by kickoff", () => {
    const groups = groupFixtures([
      fx({ id: "a", stage: "Final", utcDate: "2026-07-19T19:00:00Z" }),
      fx({ id: "b", stage: "Group Stage", utcDate: "2026-06-12T19:00:00Z" }),
      fx({ id: "c", stage: "Group Stage", utcDate: "2026-06-11T19:00:00Z" }),
    ]);
    const groupStage = groups.find((g) => g.label === "Group Stage")!;
    expect(groupStage.fixtures.map((f) => f.id)).toEqual(["c", "b"]);
    expect(groups.some((g) => g.label === "Final")).toBe(true);
  });
});
