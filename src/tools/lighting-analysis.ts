import { z } from "zod";

export const LightingAnalysisSchema = z.object({
  room_type: z
    .enum([
      "living-room",
      "bedroom",
      "kitchen",
      "bathroom",
      "dining-room",
      "home-office",
      "hallway",
      "retail",
      "restaurant",
      "gallery",
    ])
    .describe("Room type"),
  area_sqm: z.number().positive().describe("Room area in square meters"),
  ceiling_height_m: z
    .number()
    .positive()
    .default(2.7)
    .describe("Ceiling height in meters"),
  natural_light_sources: z
    .array(
      z.object({
        type: z.enum(["window", "skylight", "glass-door", "clerestory"]),
        orientation: z.enum(["north", "south", "east", "west"]).optional(),
        area_sqm: z.number().positive().optional(),
      })
    )
    .optional()
    .describe("Natural light sources in the room"),
  tasks: z
    .array(z.string())
    .optional()
    .describe("Specific tasks performed in the room (e.g. 'reading', 'cooking', 'drafting')"),
});

export type LightingAnalysisInput = z.infer<typeof LightingAnalysisSchema>;

interface LightFixture {
  type: string;
  quantity: number;
  placement: string;
  wattage_led: string;
  color_temp_kelvin: string;
  lumens: string;
  control: string;
  estimated_cost_usd: [number, number];
}

const LUX_REQUIREMENTS: Record<string, { ambient: number; task: number; accent: number }> = {
  "living-room": { ambient: 150, task: 300, accent: 200 },
  bedroom: { ambient: 100, task: 300, accent: 150 },
  kitchen: { ambient: 300, task: 500, accent: 200 },
  bathroom: { ambient: 200, task: 400, accent: 150 },
  "dining-room": { ambient: 200, task: 150, accent: 300 },
  "home-office": { ambient: 300, task: 500, accent: 200 },
  hallway: { ambient: 100, task: 150, accent: 100 },
  retail: { ambient: 500, task: 750, accent: 1000 },
  restaurant: { ambient: 100, task: 200, accent: 300 },
  gallery: { ambient: 200, task: 300, accent: 500 },
};

export function lightingAnalysis(input: LightingAnalysisInput) {
  const reqs = LUX_REQUIREMENTS[input.room_type] ?? LUX_REQUIREMENTS["living-room"];
  const area = input.area_sqm;
  const ceilingH = input.ceiling_height_m;

  // Estimate lumens needed: lux * area / utilization factor (~0.5 for typical rooms)
  const utilizationFactor = 0.5;
  const ambientLumens = Math.round((reqs.ambient * area) / utilizationFactor);

  // Natural light contribution estimate
  const naturalSources = input.natural_light_sources ?? [];
  const totalGlazingArea = naturalSources.reduce((s, ns) => s + (ns.area_sqm ?? 1.5), 0);
  const daylightFactor = Math.min(totalGlazingArea / area, 0.3); // max 30%
  const daylightContribution = Math.round(daylightFactor * 100);

  // Calculate fixture count
  const lumensPerFixture = 1200; // typical LED downlight
  const ambientFixtureCount = Math.max(1, Math.ceil(ambientLumens / lumensPerFixture));

  const fixtures: LightFixture[] = [];

  // Layer 1: Ambient
  fixtures.push({
    type: ceilingH > 3 ? "Pendant lights" : "Recessed LED downlights",
    quantity: ambientFixtureCount,
    placement: `Grid pattern, ${Math.round(Math.sqrt(area / ambientFixtureCount) * 100) / 100}m spacing`,
    wattage_led: "12-15W each",
    color_temp_kelvin: input.room_type === "bedroom" ? "2700K (warm white)" : "3000K (neutral warm)",
    lumens: `${lumensPerFixture} lm each (${ambientLumens} lm total)`,
    control: "Dimmable on main circuit",
    estimated_cost_usd: [30 * ambientFixtureCount, 120 * ambientFixtureCount],
  });

  // Layer 2: Task lighting
  const taskLighting: Record<string, LightFixture> = {
    kitchen: {
      type: "Under-cabinet LED strip",
      quantity: 1,
      placement: "Under wall cabinets, full width of countertop",
      wattage_led: "8W per linear meter",
      color_temp_kelvin: "4000K (cool white for food prep)",
      lumens: "500+ lm per meter",
      control: "Separate switch, dimmable",
      estimated_cost_usd: [50, 200],
    },
    "home-office": {
      type: "Adjustable desk lamp",
      quantity: 1,
      placement: "Opposite writing hand, angled at 30 degrees",
      wattage_led: "10-12W",
      color_temp_kelvin: "4000-5000K (daylight for focus)",
      lumens: "800-1000 lm",
      control: "Independent switch with brightness control",
      estimated_cost_usd: [80, 300],
    },
    bedroom: {
      type: "Bedside reading lights",
      quantity: 2,
      placement: "Wall-mounted at 120cm height, or on nightstands",
      wattage_led: "5-7W each",
      color_temp_kelvin: "2700K (warm, sleep-friendly)",
      lumens: "300-400 lm each",
      control: "Individual switches, dimmable",
      estimated_cost_usd: [60, 250],
    },
    bathroom: {
      type: "Vanity sconces",
      quantity: 2,
      placement: "Flanking mirror at eye level (not above)",
      wattage_led: "8W each",
      color_temp_kelvin: "3000K (flattering, accurate color rendering CRI 90+)",
      lumens: "500 lm each",
      control: "Separate circuit from ambient",
      estimated_cost_usd: [80, 300],
    },
  };

  if (taskLighting[input.room_type]) {
    fixtures.push(taskLighting[input.room_type]);
  }

  // Layer 3: Accent
  fixtures.push({
    type: input.room_type === "gallery" ? "Track lighting with adjustable heads" : "LED accent strip or picture lights",
    quantity: input.room_type === "gallery" ? Math.ceil(area / 4) : Math.ceil(area / 8),
    placement: input.room_type === "gallery" ? "Ceiling track, aimed at artwork at 30-degree angle" : "Cove lighting in ceiling recess or above shelving",
    wattage_led: "5-8W per fixture",
    color_temp_kelvin: "2700K (warm, dramatic)",
    lumens: "200-400 lm each",
    control: "Separate dimmer circuit for scene setting",
    estimated_cost_usd: [40, 150],
  });

  const circuitRecommendations = [
    "Circuit 1: Ambient (dimmable) — main living light",
    "Circuit 2: Task — functional work light",
    "Circuit 3: Accent (dimmable) — mood and decoration",
    "All circuits on smart switches for scene presets",
  ];

  return {
    analysis: {
      room_type: input.room_type,
      area_sqm: area,
      ceiling_height_m: ceilingH,
      required_lux: reqs,
      total_ambient_lumens_needed: ambientLumens,
      daylight_contribution_percent: daylightContribution,
      natural_light_sources: naturalSources.length,
    },
    layered_lighting_plan: {
      description: "Three-layer approach: ambient + task + accent",
      fixtures,
    },
    electrical: {
      circuits: circuitRecommendations,
      estimated_total_wattage: `${Math.round(ambientFixtureCount * 14 + 20 + 15)}W LED (equivalent to ~${Math.round((ambientFixtureCount * 14 + 35) * 5)}W incandescent)`,
      smart_home_ready: "Specify smart dimmer switches (Lutron Caseta or equivalent)",
    },
    daylighting: {
      glazing_to_floor_ratio: `${Math.round((totalGlazingArea / area) * 100)}%`,
      recommendation:
        totalGlazingArea / area < 0.15
          ? "Below 15% — consider adding a skylight or enlarging windows"
          : totalGlazingArea / area > 0.25
            ? "Above 25% — ensure solar shading to prevent overheating"
            : "Good glazing ratio for balanced daylighting",
      orientation_notes: naturalSources
        .filter((ns) => ns.orientation)
        .map((ns) => {
          const dir = ns.orientation!;
          const note =
            dir === "south"
              ? "South: best for passive solar — add overhangs for summer shading"
              : dir === "north"
                ? "North: consistent diffuse light — ideal for workspaces and galleries"
                : dir === "east"
                  ? "East: morning sun — good for bedrooms and breakfast areas"
                  : "West: afternoon glare risk — use blinds or low-E glass";
          return note;
        }),
    },
    energy_efficiency: {
      tips: [
        "LED-only specification saves 80% energy vs incandescent",
        "Occupancy sensors in hallways, bathrooms, and storage reduce waste",
        "Daylight harvesting dimmer (photosensor) for perimeter fixtures",
        "Timer circuits for exterior and accent lighting",
      ],
    },
  };
}
