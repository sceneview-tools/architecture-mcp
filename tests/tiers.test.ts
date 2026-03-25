import { describe, it, expect } from "vitest";
import {
  resolveApiKey,
  checkUsage,
  recordUsage,
  checkToolAccess,
  TIERS,
} from "../src/tiers.js";

describe("resolveApiKey", () => {
  it("returns free tier for no key", () => {
    expect(resolveApiKey(undefined)).toEqual({ tier: "free", key: "anonymous" });
  });

  it("returns pro tier for arch_pro_ prefix", () => {
    expect(resolveApiKey("arch_pro_abc123")).toEqual({
      tier: "pro",
      key: "arch_pro_abc123",
    });
  });

  it("returns studio tier for arch_studio_ prefix", () => {
    expect(resolveApiKey("arch_studio_xyz")).toEqual({
      tier: "studio",
      key: "arch_studio_xyz",
    });
  });

  it("returns free tier for unknown prefix", () => {
    expect(resolveApiKey("random_key")).toEqual({
      tier: "free",
      key: "random_key",
    });
  });
});

describe("checkUsage", () => {
  it("allows usage within limit", () => {
    const result = checkUsage("test_user_fresh", "free");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10);
  });

  it("allows unlimited for studio", () => {
    const result = checkUsage("studio_user", "studio");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(-1);
  });
});

describe("recordUsage", () => {
  it("increments usage count", () => {
    const key = "test_record_" + Date.now();
    recordUsage(key);
    recordUsage(key);
    const result = checkUsage(key, "free");
    expect(result.remaining).toBe(8);
  });
});

describe("checkToolAccess", () => {
  it("allows free tier tools", () => {
    expect(checkToolAccess("free", "generate_3d_concept")).toBe(true);
    expect(checkToolAccess("free", "create_floor_plan")).toBe(true);
    expect(checkToolAccess("free", "lighting_analysis")).toBe(true);
  });

  it("blocks premium tools on free tier", () => {
    expect(checkToolAccess("free", "render_walkthrough")).toBe(false);
    expect(checkToolAccess("free", "export_specs")).toBe(false);
  });

  it("allows all tools on pro tier", () => {
    for (const tool of TIERS.pro.features) {
      expect(checkToolAccess("pro", tool)).toBe(true);
    }
  });

  it("allows all tools on studio tier", () => {
    for (const tool of TIERS.studio.features) {
      expect(checkToolAccess("studio", tool)).toBe(true);
    }
  });
});
