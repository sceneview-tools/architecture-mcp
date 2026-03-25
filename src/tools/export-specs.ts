import { z } from "zod";

const SpecRoomSchema = z.object({
  name: z.string(),
  type: z.string(),
  area_sqm: z.number().positive(),
  floor_material: z.string().optional(),
  wall_finish: z.string().optional(),
  ceiling_finish: z.string().optional(),
  fixtures: z.array(z.string()).optional(),
  electrical_points: z.number().int().optional(),
  plumbing_points: z.number().int().optional(),
  notes: z.string().optional(),
});

export const ExportSpecsSchema = z.object({
  project_name: z.string().describe("Project name"),
  client_name: z.string().optional().describe("Client name"),
  project_address: z.string().optional().describe("Project address"),
  architect: z.string().optional().describe("Architect name"),
  rooms: z.array(SpecRoomSchema).min(1),
  general_notes: z.array(z.string()).optional(),
  building_code: z
    .enum(["IBC", "IRC", "Eurocode", "BS", "NCC", "NBC", "other"])
    .optional()
    .describe("Applicable building code"),
});

export type ExportSpecsInput = z.infer<typeof ExportSpecsSchema>;

export function exportSpecs(input: ExportSpecsInput) {
  const date = new Date().toISOString().split("T")[0];
  const totalArea = input.rooms.reduce((s, r) => s + r.area_sqm, 0);

  const roomSpecs = input.rooms.map((room, index) => ({
    reference: `R${String(index + 1).padStart(2, "0")}`,
    name: room.name,
    type: room.type,
    area_sqm: room.area_sqm,
    finishes: {
      floor: room.floor_material ?? "Per architect specification",
      walls: room.wall_finish ?? "Per architect specification",
      ceiling: room.ceiling_finish ?? "Standard gypsum board, painted matte white",
    },
    services: {
      electrical_points: room.electrical_points ?? estimateElectrical(room.type, room.area_sqm),
      plumbing_points: room.plumbing_points ?? estimatePlumbing(room.type),
      hvac: estimateHvac(room.area_sqm),
    },
    fixtures: room.fixtures ?? defaultFixtures(room.type),
    notes: room.notes ?? "",
  }));

  return {
    document: {
      title: `Technical Specifications — ${input.project_name}`,
      date,
      revision: "A (Initial Issue)",
      project_name: input.project_name,
      client: input.client_name ?? "TBD",
      address: input.project_address ?? "TBD",
      architect: input.architect ?? "TBD",
      building_code: input.building_code ?? "Verify local requirements",
    },
    scope: {
      total_area_sqm: Math.round(totalArea * 100) / 100,
      room_count: input.rooms.length,
      description: `Complete interior specification for ${input.rooms.length} rooms totaling ${Math.round(totalArea)} m².`,
    },
    room_specifications: roomSpecs,
    general_requirements: {
      structural: [
        "All walls to be verified for load-bearing status before modification",
        "New openings require structural engineer approval",
        "Floor load capacity to be verified for stone/tile finishes",
      ],
      fire_safety: [
        "Smoke detectors in all habitable rooms per code",
        "Fire-rated doors where required by code",
        "Emergency egress windows in all bedrooms",
        "Fire extinguisher locations per code",
      ],
      accessibility: [
        "Minimum 900mm clear door openings",
        "Slip-resistant flooring in wet areas (R10 minimum)",
        "Grab bars in all bathrooms (blocking in walls at minimum)",
        "Level thresholds at all transitions",
      ],
      sustainability: [
        "Low-VOC paints and adhesives throughout",
        "FSC-certified timber where specified",
        "LED lighting throughout — no incandescent",
        "Water-efficient fixtures (WaterSense or equivalent)",
      ],
    },
    general_notes: input.general_notes ?? [
      "All dimensions to be verified on site before ordering",
      "Samples of all finishes to be approved before installation",
      "Contractor to provide shop drawings for all custom items",
      "Any substitutions require architect written approval",
    ],
    attachments_required: [
      "Floor plans with dimensions (1:50)",
      "Reflected ceiling plan",
      "Electrical layout plan",
      "Plumbing layout plan",
      "Finish schedule with sample references",
      "Door and window schedules",
      "Detail drawings for custom elements",
    ],
  };
}

function estimateElectrical(type: string, area: number): number {
  const base: Record<string, number> = {
    kitchen: 12,
    bathroom: 6,
    bedroom: 6,
    "living-room": 8,
    "home-office": 10,
    "dining-room": 6,
    hallway: 3,
    garage: 4,
    laundry: 5,
  };
  const perSqm = (base[type] ?? 5) / 10; // normalize
  return Math.max(base[type] ?? 4, Math.round(area * perSqm));
}

function estimatePlumbing(type: string): number {
  const points: Record<string, number> = {
    kitchen: 3,
    bathroom: 5,
    laundry: 3,
  };
  return points[type] ?? 0;
}

function estimateHvac(area: number): string {
  const btu = Math.round(area * 300); // rough 300 BTU per sqm
  const kw = Math.round(btu * 0.000293 * 100) / 100;
  return `${btu} BTU (${kw} kW) — verify with HVAC engineer`;
}

function defaultFixtures(type: string): string[] {
  const fixtures: Record<string, string[]> = {
    kitchen: [
      "Sink (stainless steel undermount or composite)",
      "Faucet (pull-down, single lever)",
      "Dishwasher connection",
      "Range hood / exhaust",
      "Garbage disposal",
    ],
    bathroom: [
      "Basin (undermount or vessel per design)",
      "Faucet (single lever, chrome or per spec)",
      "Toilet (dual flush, wall-hung or floor-mount)",
      "Shower head (rain + handheld combo)",
      "Heated towel rail",
    ],
    laundry: [
      "Utility sink",
      "Washing machine connections",
      "Dryer vent",
    ],
  };
  return fixtures[type] ?? [];
}
