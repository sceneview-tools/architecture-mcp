import { z } from "zod";

const RoomCostSchema = z.object({
  name: z.string(),
  type: z.enum([
    "living-room",
    "bedroom",
    "kitchen",
    "bathroom",
    "dining-room",
    "home-office",
    "hallway",
    "garage",
    "laundry",
    "exterior",
  ]),
  area_sqm: z.number().positive(),
  renovation_scope: z
    .enum(["cosmetic", "moderate", "full-gut", "new-build"])
    .default("moderate"),
});

export const CostEstimateSchema = z.object({
  rooms: z.array(RoomCostSchema).min(1).describe("Rooms to estimate"),
  location: z
    .enum(["us-coastal", "us-midwest", "us-south", "europe-west", "europe-east", "uk", "australia", "asia-pacific"])
    .default("us-coastal")
    .describe("Location affects labor and material costs"),
  quality: z
    .enum(["economy", "mid-range", "premium", "luxury"])
    .default("mid-range")
    .describe("Finish quality level"),
  include_furniture: z
    .boolean()
    .default(true)
    .describe("Include furniture in estimate"),
  include_professional_fees: z
    .boolean()
    .default(true)
    .describe("Include architect/designer fees"),
});

export type CostEstimateInput = z.infer<typeof CostEstimateSchema>;

const COST_PER_SQM: Record<string, Record<string, { materials: number; labor: number }>> = {
  "living-room": {
    economy: { materials: 80, labor: 60 },
    "mid-range": { materials: 200, labor: 150 },
    premium: { materials: 450, labor: 300 },
    luxury: { materials: 900, labor: 600 },
  },
  bedroom: {
    economy: { materials: 70, labor: 50 },
    "mid-range": { materials: 180, labor: 120 },
    premium: { materials: 400, labor: 250 },
    luxury: { materials: 800, labor: 500 },
  },
  kitchen: {
    economy: { materials: 300, labor: 200 },
    "mid-range": { materials: 700, labor: 400 },
    premium: { materials: 1500, labor: 800 },
    luxury: { materials: 3000, labor: 1500 },
  },
  bathroom: {
    economy: { materials: 250, labor: 200 },
    "mid-range": { materials: 600, labor: 400 },
    premium: { materials: 1200, labor: 700 },
    luxury: { materials: 2500, labor: 1200 },
  },
  "dining-room": {
    economy: { materials: 80, labor: 60 },
    "mid-range": { materials: 200, labor: 150 },
    premium: { materials: 450, labor: 300 },
    luxury: { materials: 900, labor: 600 },
  },
  "home-office": {
    economy: { materials: 100, labor: 70 },
    "mid-range": { materials: 250, labor: 150 },
    premium: { materials: 500, labor: 300 },
    luxury: { materials: 1000, labor: 600 },
  },
  hallway: {
    economy: { materials: 50, labor: 40 },
    "mid-range": { materials: 120, labor: 80 },
    premium: { materials: 250, labor: 150 },
    luxury: { materials: 500, labor: 300 },
  },
  garage: {
    economy: { materials: 30, labor: 25 },
    "mid-range": { materials: 80, labor: 60 },
    premium: { materials: 150, labor: 100 },
    luxury: { materials: 300, labor: 200 },
  },
  laundry: {
    economy: { materials: 150, labor: 120 },
    "mid-range": { materials: 350, labor: 250 },
    premium: { materials: 700, labor: 400 },
    luxury: { materials: 1400, labor: 700 },
  },
  exterior: {
    economy: { materials: 60, labor: 50 },
    "mid-range": { materials: 150, labor: 120 },
    premium: { materials: 350, labor: 250 },
    luxury: { materials: 700, labor: 500 },
  },
};

const LOCATION_MULTIPLIERS: Record<string, number> = {
  "us-coastal": 1.3,
  "us-midwest": 0.85,
  "us-south": 0.9,
  "europe-west": 1.2,
  "europe-east": 0.6,
  uk: 1.25,
  australia: 1.35,
  "asia-pacific": 0.7,
};

const SCOPE_MULTIPLIERS: Record<string, number> = {
  cosmetic: 0.3,
  moderate: 0.7,
  "full-gut": 1.0,
  "new-build": 1.2,
};

const FURNITURE_PER_SQM: Record<string, Record<string, number>> = {
  "living-room": { economy: 80, "mid-range": 250, premium: 600, luxury: 1500 },
  bedroom: { economy: 60, "mid-range": 200, premium: 500, luxury: 1200 },
  kitchen: { economy: 0, "mid-range": 0, premium: 0, luxury: 0 }, // Built into materials
  bathroom: { economy: 0, "mid-range": 0, premium: 0, luxury: 0 },
  "dining-room": { economy: 50, "mid-range": 180, premium: 400, luxury: 1000 },
  "home-office": { economy: 40, "mid-range": 150, premium: 350, luxury: 800 },
  hallway: { economy: 10, "mid-range": 30, premium: 80, luxury: 200 },
  garage: { economy: 0, "mid-range": 0, premium: 0, luxury: 0 },
  laundry: { economy: 0, "mid-range": 0, premium: 0, luxury: 0 },
  exterior: { economy: 20, "mid-range": 60, premium: 150, luxury: 400 },
};

export function costEstimate(input: CostEstimateInput) {
  const locationMult = LOCATION_MULTIPLIERS[input.location] ?? 1.0;
  const quality = input.quality ?? "mid-range";

  const roomEstimates = input.rooms.map((room) => {
    const costs = COST_PER_SQM[room.type]?.[quality] ?? { materials: 200, labor: 150 };
    const scopeMult = SCOPE_MULTIPLIERS[room.renovation_scope] ?? 0.7;

    const materialsCost = Math.round(costs.materials * room.area_sqm * scopeMult * locationMult);
    const laborCost = Math.round(costs.labor * room.area_sqm * scopeMult * locationMult);

    const furnitureCost = input.include_furniture
      ? Math.round((FURNITURE_PER_SQM[room.type]?.[quality] ?? 100) * room.area_sqm * locationMult)
      : 0;

    return {
      room: room.name,
      type: room.type,
      area_sqm: room.area_sqm,
      scope: room.renovation_scope,
      materials_usd: materialsCost,
      labor_usd: laborCost,
      furniture_usd: furnitureCost,
      subtotal_usd: materialsCost + laborCost + furnitureCost,
    };
  });

  const totalMaterials = roomEstimates.reduce((s, r) => s + r.materials_usd, 0);
  const totalLabor = roomEstimates.reduce((s, r) => s + r.labor_usd, 0);
  const totalFurniture = roomEstimates.reduce((s, r) => s + r.furniture_usd, 0);
  const subtotal = totalMaterials + totalLabor + totalFurniture;

  const contingency = Math.round(subtotal * 0.15);
  const professionalFees = input.include_professional_fees
    ? Math.round(subtotal * 0.12)
    : 0;
  const permits = Math.round(subtotal * 0.03);

  const grandTotal = subtotal + contingency + professionalFees + permits;
  const totalArea = input.rooms.reduce((s, r) => s + r.area_sqm, 0);

  return {
    summary: {
      total_estimate_usd: grandTotal,
      cost_per_sqm_usd: Math.round(grandTotal / totalArea),
      total_area_sqm: totalArea,
      quality,
      location: input.location,
    },
    breakdown: {
      materials: totalMaterials,
      labor: totalLabor,
      furniture: input.include_furniture ? totalFurniture : "excluded",
      contingency_15pct: contingency,
      professional_fees_12pct: input.include_professional_fees ? professionalFees : "excluded",
      permits_3pct: permits,
      grand_total: grandTotal,
    },
    by_room: roomEstimates,
    timeline: {
      estimated_weeks: Math.ceil(totalArea / 15), // rough: 15 sqm/week
      phases: [
        "Week 1-2: Demolition and structural work",
        "Week 3-4: MEP rough-in (mechanical, electrical, plumbing)",
        "Week 5-6: Drywall, tiling, flooring",
        "Week 7-8: Painting, fixtures, cabinetry",
        "Week 9+: Furnishing, punch list, handover",
      ],
    },
    disclaimer:
      "This is a rough planning estimate. Actual costs vary by contractor, market conditions, and specific material selections. Obtain 3 competitive bids for accurate pricing.",
  };
}
