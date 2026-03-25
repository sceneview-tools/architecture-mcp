import { z } from "zod";

const RoomSchema = z.object({
  name: z.string().describe("Room name (e.g. 'Living Room', 'Master Bedroom')"),
  width_m: z.number().positive().describe("Room width in meters"),
  length_m: z.number().positive().describe("Room length in meters"),
  type: z
    .enum([
      "living",
      "bedroom",
      "kitchen",
      "bathroom",
      "dining",
      "office",
      "hallway",
      "storage",
      "garage",
      "laundry",
      "utility",
      "other",
    ])
    .describe("Room type for code compliance checks"),
  floor: z.number().int().min(0).default(0).describe("Floor level (0 = ground)"),
});

export const CreateFloorPlanSchema = z.object({
  rooms: z
    .array(RoomSchema)
    .min(1)
    .describe("List of rooms with dimensions"),
  building_width_m: z
    .number()
    .positive()
    .optional()
    .describe("Overall building width constraint in meters"),
  building_length_m: z
    .number()
    .positive()
    .optional()
    .describe("Overall building length constraint in meters"),
  style: z
    .enum(["open-plan", "traditional", "split-level", "courtyard", "L-shape", "U-shape"])
    .optional()
    .describe("Layout style preference"),
  include_svg: z
    .boolean()
    .default(true)
    .describe("Whether to generate an SVG floor plan"),
});

export type CreateFloorPlanInput = z.infer<typeof CreateFloorPlanSchema>;

interface LayoutRoom {
  name: string;
  type: string;
  width_m: number;
  length_m: number;
  area_sqm: number;
  x: number;
  y: number;
  floor: number;
}

function layoutRooms(input: CreateFloorPlanInput): LayoutRoom[] {
  const rooms: LayoutRoom[] = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  const maxWidth = input.building_width_m ?? 20;

  for (const room of input.rooms) {
    if (x + room.width_m > maxWidth && x > 0) {
      x = 0;
      y += rowHeight + 0.15; // 15cm wall
      rowHeight = 0;
    }

    rooms.push({
      name: room.name,
      type: room.type,
      width_m: room.width_m,
      length_m: room.length_m,
      area_sqm: Math.round(room.width_m * room.length_m * 100) / 100,
      x,
      y,
      floor: room.floor ?? 0,
    });

    rowHeight = Math.max(rowHeight, room.length_m);
    x += room.width_m + 0.15; // 15cm wall
  }

  return rooms;
}

function generateSvg(rooms: LayoutRoom[], scale: number = 40): string {
  const padding = 60;
  let maxX = 0;
  let maxY = 0;

  for (const r of rooms) {
    maxX = Math.max(maxX, r.x + r.width_m);
    maxY = Math.max(maxY, r.y + r.length_m);
  }

  const svgW = Math.round(maxX * scale + padding * 2);
  const svgH = Math.round(maxY * scale + padding * 2 + 40);

  const typeColors: Record<string, string> = {
    living: "#E8F5E9",
    bedroom: "#E3F2FD",
    kitchen: "#FFF3E0",
    bathroom: "#F3E5F5",
    dining: "#FFF8E1",
    office: "#E0F2F1",
    hallway: "#F5F5F5",
    storage: "#EFEBE9",
    garage: "#ECEFF1",
    laundry: "#E1F5FE",
    utility: "#FBE9E7",
    other: "#FAFAFA",
  };

  let rects = "";
  for (const r of rooms) {
    const rx = r.x * scale + padding;
    const ry = r.y * scale + padding;
    const rw = r.width_m * scale;
    const rh = r.length_m * scale;
    const fill = typeColors[r.type] ?? "#FAFAFA";

    rects += `  <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${fill}" stroke="#333" stroke-width="2"/>\n`;
    rects += `  <text x="${rx + rw / 2}" y="${ry + rh / 2 - 8}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#333">${r.name}</text>\n`;
    rects += `  <text x="${rx + rw / 2}" y="${ry + rh / 2 + 8}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#666">${r.width_m}m x ${r.length_m}m</text>\n`;
    rects += `  <text x="${rx + rw / 2}" y="${ry + rh / 2 + 22}" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#999">${r.area_sqm} m²</text>\n`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <rect width="100%" height="100%" fill="white"/>
  <text x="${svgW / 2}" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#222">Floor Plan</text>
${rects}</svg>`;
}

const MIN_AREAS: Record<string, number> = {
  bedroom: 9,
  bathroom: 3.5,
  kitchen: 6,
  living: 12,
  office: 6,
};

function checkCompliance(rooms: LayoutRoom[]) {
  const warnings: string[] = [];

  for (const r of rooms) {
    const min = MIN_AREAS[r.type];
    if (min && r.area_sqm < min) {
      warnings.push(
        `${r.name}: ${r.area_sqm} m² is below typical minimum of ${min} m² for ${r.type}`
      );
    }
    if (r.type === "bedroom" && Math.min(r.width_m, r.length_m) < 2.4) {
      warnings.push(
        `${r.name}: minimum dimension ${Math.min(r.width_m, r.length_m)}m is below 2.4m recommended for bedrooms`
      );
    }
    if (r.type === "hallway" && r.width_m < 0.9) {
      warnings.push(
        `${r.name}: hallway width ${r.width_m}m is below 0.9m accessibility minimum`
      );
    }
  }

  const bathrooms = rooms.filter((r) => r.type === "bathroom").length;
  const bedrooms = rooms.filter((r) => r.type === "bedroom").length;
  if (bedrooms > 2 && bathrooms < 2) {
    warnings.push(
      `With ${bedrooms} bedrooms, consider at least 2 bathrooms (currently ${bathrooms})`
    );
  }

  return warnings;
}

export function createFloorPlan(input: CreateFloorPlanInput) {
  const rooms = layoutRooms(input);
  const totalArea = rooms.reduce((sum, r) => sum + r.area_sqm, 0);
  const floors = [...new Set(rooms.map((r) => r.floor))].sort();
  const compliance = checkCompliance(rooms);

  const result: Record<string, unknown> = {
    layout: {
      rooms: rooms.map((r) => ({
        name: r.name,
        type: r.type,
        dimensions: `${r.width_m}m x ${r.length_m}m`,
        area_sqm: r.area_sqm,
        position: { x: r.x, y: r.y },
        floor: r.floor,
      })),
      total_area_sqm: Math.round(totalArea * 100) / 100,
      floors: floors.length,
      style: input.style ?? "open-plan",
    },
    compliance: {
      status: compliance.length === 0 ? "pass" : "warnings",
      warnings: compliance,
    },
    circulation: {
      notes: [
        "Ensure clear path from entrance to all rooms",
        "Minimum 900mm corridor width for accessibility",
        "Consider sight lines from kitchen to living/dining areas",
        "Bedrooms should have direct bathroom access or be near one",
      ],
    },
    next_steps: [
      "Use lighting_analysis for daylighting optimization",
      "Use material_palette for floor and wall specifications",
      "Use cost_estimate to price the layout",
    ],
  };

  if (input.include_svg !== false) {
    result.svg = generateSvg(rooms);
  }

  return result;
}
