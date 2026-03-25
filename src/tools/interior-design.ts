import { z } from "zod";

export const InteriorDesignSchema = z.object({
  room_type: z
    .enum([
      "living-room",
      "bedroom",
      "kitchen",
      "bathroom",
      "dining-room",
      "home-office",
      "nursery",
      "lobby",
      "restaurant",
      "retail",
      "hotel-room",
    ])
    .describe("Type of room to design"),
  style: z
    .enum([
      "modern",
      "scandinavian",
      "industrial",
      "bohemian",
      "mid-century",
      "japandi",
      "coastal",
      "farmhouse",
      "art-deco",
      "maximalist",
      "wabi-sabi",
    ])
    .describe("Interior design style"),
  area_sqm: z.number().positive().describe("Room area in square meters"),
  ceiling_height_m: z
    .number()
    .positive()
    .default(2.7)
    .describe("Ceiling height in meters"),
  budget: z
    .enum(["economy", "mid-range", "premium", "luxury"])
    .optional()
    .describe("Budget range"),
  natural_light: z
    .enum(["abundant", "moderate", "limited", "none"])
    .optional()
    .describe("Amount of natural light"),
  occupants: z.number().int().positive().optional().describe("Number of typical occupants"),
});

export type InteriorDesignInput = z.infer<typeof InteriorDesignSchema>;

interface FurnitureItem {
  item: string;
  recommended_size: string;
  placement: string;
  priority: "essential" | "recommended" | "optional";
  estimated_cost_usd: [number, number]; // [low, high]
}

const STYLE_PALETTES: Record<string, { primary: string; secondary: string; accent: string; neutral: string; texture: string }> = {
  modern: { primary: "#2C3E50", secondary: "#ECF0F1", accent: "#E74C3C", neutral: "#BDC3C7", texture: "Smooth matte finishes, glass, polished metal" },
  scandinavian: { primary: "#F7F3E9", secondary: "#C4B8A5", accent: "#5C7457", neutral: "#E8E4DE", texture: "Light wood grain, linen, wool knit" },
  industrial: { primary: "#4A4A4A", secondary: "#8B7355", accent: "#CD853F", neutral: "#D3D3D3", texture: "Raw concrete, exposed brick, aged metal" },
  bohemian: { primary: "#8B4513", secondary: "#DAA520", accent: "#FF6347", neutral: "#FFF8DC", texture: "Macrame, rattan, layered textiles, kilim" },
  "mid-century": { primary: "#D2691E", secondary: "#F5DEB3", accent: "#FF8C00", neutral: "#FAF0E6", texture: "Teak veneer, curved plywood, terrazzo" },
  japandi: { primary: "#3C3C3C", secondary: "#D7CEC7", accent: "#8DB48E", neutral: "#F5F0EB", texture: "Washi paper, raw clay, light ash" },
  coastal: { primary: "#4682B4", secondary: "#F0E68C", accent: "#FF7F50", neutral: "#FFFAF0", texture: "Whitewashed wood, jute, sea glass" },
  farmhouse: { primary: "#556B2F", secondary: "#F5F5DC", accent: "#B22222", neutral: "#FAEBD7", texture: "Shiplap, distressed wood, galvanized metal" },
  "art-deco": { primary: "#1C1C1C", secondary: "#D4AF37", accent: "#006B3C", neutral: "#F5F5F5", texture: "Marble, brass, lacquered surfaces, velvet" },
  maximalist: { primary: "#800080", secondary: "#FF1493", accent: "#FFD700", neutral: "#2F2F2F", texture: "Damask, animal print, jewel-tone velvet" },
  "wabi-sabi": { primary: "#6B5B4F", secondary: "#C4B7A6", accent: "#8B8378", neutral: "#EDE8E2", texture: "Handmade ceramics, raw linen, weathered wood" },
};

function getFurniture(roomType: string, areaSqm: number, budget: string): FurnitureItem[] {
  const multiplier = budget === "luxury" ? 3 : budget === "premium" ? 2 : budget === "economy" ? 0.5 : 1;

  const furnishings: Record<string, FurnitureItem[]> = {
    "living-room": [
      { item: "Sofa (3-seater)", recommended_size: "220cm x 90cm", placement: "Facing focal wall, 45cm from wall", priority: "essential", estimated_cost_usd: [800 * multiplier, 2500 * multiplier] },
      { item: "Coffee table", recommended_size: "120cm x 60cm", placement: "Centered in seating area, 45cm from sofa", priority: "essential", estimated_cost_usd: [200 * multiplier, 800 * multiplier] },
      { item: "Accent chair", recommended_size: "80cm x 80cm", placement: "Perpendicular to sofa", priority: "recommended", estimated_cost_usd: [400 * multiplier, 1200 * multiplier] },
      { item: "TV/Media unit", recommended_size: "180cm x 45cm", placement: "On focal wall, eye level when seated", priority: "recommended", estimated_cost_usd: [300 * multiplier, 1500 * multiplier] },
      { item: "Side table", recommended_size: "50cm x 50cm", placement: "Next to sofa arm", priority: "optional", estimated_cost_usd: [100 * multiplier, 400 * multiplier] },
      { item: "Area rug", recommended_size: `${areaSqm > 20 ? "300cm x 200cm" : "240cm x 170cm"}`, placement: "Under front legs of sofa", priority: "recommended", estimated_cost_usd: [200 * multiplier, 1000 * multiplier] },
    ],
    bedroom: [
      { item: "Bed frame + mattress", recommended_size: areaSqm > 14 ? "King 200cm x 200cm" : "Queen 160cm x 200cm", placement: "Centered on longest wall, 60cm clearance each side", priority: "essential", estimated_cost_usd: [1000 * multiplier, 4000 * multiplier] },
      { item: "Nightstands (pair)", recommended_size: "50cm x 40cm each", placement: "Flanking bed, same height as mattress top", priority: "essential", estimated_cost_usd: [200 * multiplier, 800 * multiplier] },
      { item: "Wardrobe/closet", recommended_size: "200cm x 60cm", placement: "Wall opposite or adjacent to bed", priority: "essential", estimated_cost_usd: [500 * multiplier, 3000 * multiplier] },
      { item: "Dresser", recommended_size: "120cm x 45cm", placement: "Wall adjacent to door", priority: "recommended", estimated_cost_usd: [300 * multiplier, 1200 * multiplier] },
      { item: "Reading chair", recommended_size: "75cm x 80cm", placement: "Near window with task light", priority: "optional", estimated_cost_usd: [300 * multiplier, 1000 * multiplier] },
    ],
    kitchen: [
      { item: "Base cabinets", recommended_size: "Standard 60cm depth", placement: "Along work walls, work triangle layout", priority: "essential", estimated_cost_usd: [2000 * multiplier, 8000 * multiplier] },
      { item: "Wall cabinets", recommended_size: "30cm depth, 70cm height", placement: "Above base cabinets, 45cm gap for backsplash", priority: "essential", estimated_cost_usd: [1000 * multiplier, 5000 * multiplier] },
      { item: "Island/peninsula", recommended_size: areaSqm > 12 ? "180cm x 90cm" : "Skip — room too small", placement: "Center with 100cm clearance all sides", priority: areaSqm > 12 ? "recommended" : "optional", estimated_cost_usd: [800 * multiplier, 4000 * multiplier] },
      { item: "Countertop", recommended_size: "60cm depth minimum", placement: "Continuous work surface", priority: "essential", estimated_cost_usd: [500 * multiplier, 5000 * multiplier] },
    ],
    bathroom: [
      { item: "Vanity with basin", recommended_size: areaSqm > 5 ? "120cm double" : "60cm single", placement: "Adjacent to door wall", priority: "essential", estimated_cost_usd: [400 * multiplier, 2000 * multiplier] },
      { item: "Toilet", recommended_size: "70cm x 40cm", placement: "Away from door sight line, 40cm side clearance", priority: "essential", estimated_cost_usd: [200 * multiplier, 800 * multiplier] },
      { item: "Shower/tub", recommended_size: areaSqm > 6 ? "Freestanding tub + walk-in shower" : "90cm x 90cm shower", placement: "Far wall from entrance", priority: "essential", estimated_cost_usd: [500 * multiplier, 3000 * multiplier] },
      { item: "Mirror + cabinet", recommended_size: "Match vanity width", placement: "Above vanity, centered", priority: "essential", estimated_cost_usd: [150 * multiplier, 600 * multiplier] },
    ],
    "dining-room": [
      { item: "Dining table", recommended_size: areaSqm > 15 ? "200cm x 100cm (seats 8)" : "150cm x 90cm (seats 6)", placement: "Centered, 90cm clearance from walls for chair pullback", priority: "essential", estimated_cost_usd: [500 * multiplier, 3000 * multiplier] },
      { item: "Dining chairs", recommended_size: "45cm x 50cm each", placement: "Around table, matching count to table capacity", priority: "essential", estimated_cost_usd: [400 * multiplier, 2000 * multiplier] },
      { item: "Sideboard/buffet", recommended_size: "160cm x 45cm", placement: "Against wall nearest kitchen for serving", priority: "recommended", estimated_cost_usd: [400 * multiplier, 2000 * multiplier] },
      { item: "Pendant light", recommended_size: "70-90cm above table surface", placement: "Centered over table", priority: "essential", estimated_cost_usd: [200 * multiplier, 1200 * multiplier] },
    ],
    "home-office": [
      { item: "Desk", recommended_size: "150cm x 70cm", placement: "Perpendicular to window to avoid glare", priority: "essential", estimated_cost_usd: [300 * multiplier, 1500 * multiplier] },
      { item: "Ergonomic chair", recommended_size: "Standard", placement: "At desk, adjustable height", priority: "essential", estimated_cost_usd: [400 * multiplier, 1500 * multiplier] },
      { item: "Bookshelf", recommended_size: "90cm x 30cm x 180cm", placement: "Within arm's reach or along wall", priority: "recommended", estimated_cost_usd: [200 * multiplier, 800 * multiplier] },
      { item: "Task lamp", recommended_size: "Adjustable arm", placement: "Opposite side of writing hand", priority: "essential", estimated_cost_usd: [50 * multiplier, 300 * multiplier] },
    ],
  };

  return furnishings[roomType] ?? furnishings["living-room"];
}

export function interiorDesign(input: InteriorDesignInput) {
  const palette = STYLE_PALETTES[input.style] ?? STYLE_PALETTES.modern;
  const budget = input.budget ?? "mid-range";
  const furniture = getFurniture(input.room_type, input.area_sqm, budget);

  const totalCostLow = furniture.reduce((s, f) => s + f.estimated_cost_usd[0], 0);
  const totalCostHigh = furniture.reduce((s, f) => s + f.estimated_cost_usd[1], 0);

  return {
    room: {
      type: input.room_type,
      area_sqm: input.area_sqm,
      ceiling_height_m: input.ceiling_height_m,
      volume_m3: Math.round(input.area_sqm * input.ceiling_height_m * 10) / 10,
    },
    mood_board: {
      style: input.style,
      atmosphere:
        input.style === "scandinavian"
          ? "Warm, light, cozy — hygge atmosphere with natural textures"
          : input.style === "industrial"
            ? "Raw, urban, edgy — exposed elements with warm accents"
            : input.style === "japandi"
              ? "Serene, minimal, harmonious — Japanese simplicity meets Nordic warmth"
              : input.style === "wabi-sabi"
                ? "Imperfect, natural, timeless — beauty in age and wear"
                : `Curated ${input.style} aesthetic with cohesive material story`,
      key_textures: palette.texture,
      inspiration_keywords: [input.style, input.room_type, "interior", "design", budget],
    },
    color_palette: {
      primary: { hex: palette.primary, usage: "60% — walls, large surfaces" },
      secondary: { hex: palette.secondary, usage: "30% — furniture, textiles" },
      accent: { hex: palette.accent, usage: "10% — accessories, art, pillows" },
      neutral: { hex: palette.neutral, usage: "Base tones, trim, ceiling" },
    },
    furniture_layout: furniture,
    budget_estimate: {
      furniture_range_usd: `$${Math.round(totalCostLow).toLocaleString()} - $${Math.round(totalCostHigh).toLocaleString()}`,
      tier: budget,
      note: "Excludes labor, delivery, and structural modifications",
    },
    design_tips: [
      input.natural_light === "limited"
        ? "Use mirrors opposite windows to amplify natural light"
        : "Position seating to take advantage of natural light views",
      input.ceiling_height_m > 3
        ? "Use pendant lights or tall plants to bring scale down to human proportions"
        : "Keep furniture low-profile to maintain visual openness",
      input.area_sqm < 12
        ? "Use multifunctional furniture and wall-mounted storage to maximize floor area"
        : "Create distinct zones using rugs, lighting, and furniture groupings",
    ],
  };
}
