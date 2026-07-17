import { describe, it, expect } from "vitest";
import { toggleId, toggleAll, pruneSelection, partitionSettled } from "./selection";

describe("toggleId", () => {
  it("adds the id when checked is true", () => {
    const result = toggleId(new Set(["a"]), "b", true);
    expect(result).toEqual(new Set(["a", "b"]));
  });

  it("removes the id when checked is false", () => {
    const result = toggleId(new Set(["a", "b"]), "b", false);
    expect(result).toEqual(new Set(["a"]));
  });

  it("does not mutate the original set", () => {
    const original = new Set(["a"]);
    toggleId(original, "b", true);
    expect(original).toEqual(new Set(["a"]));
  });
});

describe("toggleAll", () => {
  it("adds all target ids when checked is true", () => {
    const result = toggleAll(new Set(["x"]), ["a", "b"], true);
    expect(result).toEqual(new Set(["x", "a", "b"]));
  });

  it("removes all target ids when checked is false, keeping unrelated ids", () => {
    const result = toggleAll(new Set(["x", "a", "b"]), ["a", "b"], false);
    expect(result).toEqual(new Set(["x"]));
  });

  it("returns an equivalent set when targetIds is empty", () => {
    const result = toggleAll(new Set(["a"]), [], true);
    expect(result).toEqual(new Set(["a"]));
  });
});

describe("pruneSelection", () => {
  it("removes ids that are no longer valid", () => {
    const result = pruneSelection(new Set(["a", "b", "c"]), ["a", "c"]);
    expect(result).toEqual(new Set(["a", "c"]));
  });

  it("returns the same reference when nothing is pruned", () => {
    const ids = new Set(["a", "b"]);
    const result = pruneSelection(ids, ["a", "b", "c"]);
    expect(result).toBe(ids);
  });

  it("returns a new set when something is pruned", () => {
    const ids = new Set(["a", "b"]);
    const result = pruneSelection(ids, ["a"]);
    expect(result).not.toBe(ids);
    expect(result).toEqual(new Set(["a"]));
  });
});

describe("partitionSettled", () => {
  it("puts all ids in succeeded when every promise fulfills", () => {
    const results: PromiseSettledResult<void>[] = [
      { status: "fulfilled", value: undefined },
      { status: "fulfilled", value: undefined },
    ];
    const { succeeded, failed } = partitionSettled(["a", "b"], results);
    expect(succeeded).toEqual(["a", "b"]);
    expect(failed).toEqual([]);
  });

  it("puts all ids in failed when every promise rejects", () => {
    const results: PromiseSettledResult<void>[] = [
      { status: "rejected", reason: new Error("x") },
      { status: "rejected", reason: new Error("y") },
    ];
    const { succeeded, failed } = partitionSettled(["a", "b"], results);
    expect(succeeded).toEqual([]);
    expect(failed).toEqual(["a", "b"]);
  });

  it("splits ids according to each promise's outcome, preserving order", () => {
    const results: PromiseSettledResult<void>[] = [
      { status: "fulfilled", value: undefined },
      { status: "rejected", reason: new Error("x") },
      { status: "fulfilled", value: undefined },
    ];
    const { succeeded, failed } = partitionSettled(["a", "b", "c"], results);
    expect(succeeded).toEqual(["a", "c"]);
    expect(failed).toEqual(["b"]);
  });
});
