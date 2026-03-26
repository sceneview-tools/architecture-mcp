/**
 * Pricing tiers and usage tracking for architecture-mcp.
 *
 * Free:   10 designs/month
 * Pro:    100 designs/month  ($49/month)
 * Studio: unlimited + priority ($149/month)
 */

export type Tier = "free" | "pro" | "studio";

export interface TierConfig {
  name: string;
  monthlyDesigns: number; // -1 = unlimited
  priceUsd: number;
  priority: boolean;
  features: string[];
}

export const TIERS: Record<Tier, TierConfig> = {
  free: {
    name: "Free",
    monthlyDesigns: 10,
    priceUsd: 0,
    priority: false,
    features: [
      "generate_3d_concept",
      "create_floor_plan",
      "interior_design",
      "material_palette",
      "lighting_analysis",
      "cost_estimate",
      "sustainability_analysis",
    ],
  },
  pro: {
    name: "Pro",
    monthlyDesigns: 100,
    priceUsd: 49,
    priority: false,
    features: [
      "generate_3d_concept",
      "create_floor_plan",
      "interior_design",
      "material_palette",
      "lighting_analysis",
      "render_walkthrough",
      "cost_estimate",
      "export_specs",
      "generate_3d_walkthrough",
      "sustainability_analysis",
    ],
  },
  studio: {
    name: "Studio",
    monthlyDesigns: -1,
    priceUsd: 149,
    priority: true,
    features: [
      "generate_3d_concept",
      "create_floor_plan",
      "interior_design",
      "material_palette",
      "lighting_analysis",
      "render_walkthrough",
      "cost_estimate",
      "export_specs",
      "generate_3d_walkthrough",
      "sustainability_analysis",
    ],
  },
};

/** In-memory usage tracker (replace with persistent store in production). */
const usageMap = new Map<string, { count: number; resetAt: number }>();

function getMonthEnd(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
}

export function resolveApiKey(apiKey: string | undefined): {
  tier: Tier;
  key: string;
} {
  if (!apiKey) return { tier: "free", key: "anonymous" };

  if (apiKey.startsWith("arch_studio_")) return { tier: "studio", key: apiKey };
  if (apiKey.startsWith("arch_pro_")) return { tier: "pro", key: apiKey };
  return { tier: "free", key: apiKey };
}

export function checkUsage(key: string, tier: Tier): {
  allowed: boolean;
  remaining: number;
  limit: number;
} {
  const config = TIERS[tier];
  if (config.monthlyDesigns === -1) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  const now = Date.now();
  let record = usageMap.get(key);

  if (!record || now >= record.resetAt) {
    record = { count: 0, resetAt: getMonthEnd() };
    usageMap.set(key, record);
  }

  const remaining = config.monthlyDesigns - record.count;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit: config.monthlyDesigns,
  };
}

export function recordUsage(key: string): void {
  const record = usageMap.get(key);
  if (record) {
    record.count++;
  } else {
    usageMap.set(key, { count: 1, resetAt: getMonthEnd() });
  }
}

export function checkToolAccess(tier: Tier, toolName: string): boolean {
  return TIERS[tier].features.includes(toolName);
}
