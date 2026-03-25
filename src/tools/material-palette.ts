import { z } from "zod";

export const MaterialPaletteSchema = z.object({
  room_type: z
    .enum([
      "living-room",
      "bedroom",
      "kitchen",
      "bathroom",
      "dining-room",
      "home-office",
      "hallway",
      "exterior",
      "commercial",
    ])
    .describe("Type of space"),
  style: z
    .enum([
      "modern",
      "scandinavian",
      "industrial",
      "rustic",
      "luxury",
      "minimalist",
      "coastal",
      "traditional",
    ])
    .describe("Design style"),
  budget: z
    .enum(["economy", "mid-range", "premium", "luxury"])
    .default("mid-range")
    .describe("Budget range"),
  climate: z
    .enum(["tropical", "arid", "temperate", "continental", "polar"])
    .optional()
    .describe("Climate for material suitability"),
  sustainability_priority: z
    .boolean()
    .default(false)
    .describe("Prioritize eco-friendly materials"),
});

export type MaterialPaletteInput = z.infer<typeof MaterialPaletteSchema>;

interface MaterialSpec {
  material: string;
  product_example: string;
  price_range_per_sqm_usd: [number, number];
  durability: "low" | "medium" | "high" | "very-high";
  maintenance: "low" | "medium" | "high";
  sustainability_rating: string; // A-F
  notes: string;
}

export function materialPalette(input: MaterialPaletteInput) {
  const budget = input.budget ?? "mid-range";

  const floorOptions: Record<string, MaterialSpec[]> = {
    economy: [
      { material: "Laminate", product_example: "Quick-Step Impressive", price_range_per_sqm_usd: [15, 35], durability: "medium", maintenance: "low", sustainability_rating: "C", notes: "Water-resistant options available for kitchens/baths" },
      { material: "Vinyl plank (LVP)", product_example: "Lifeproof Sterling Oak", price_range_per_sqm_usd: [20, 40], durability: "high", maintenance: "low", sustainability_rating: "D", notes: "100% waterproof, good for all rooms" },
      { material: "Ceramic tile", product_example: "Marazzi wood-look", price_range_per_sqm_usd: [15, 45], durability: "very-high", maintenance: "low", sustainability_rating: "B", notes: "Cold underfoot — consider radiant heating" },
    ],
    "mid-range": [
      { material: "Engineered hardwood", product_example: "Kahrs European Oak", price_range_per_sqm_usd: [40, 80], durability: "high", maintenance: "medium", sustainability_rating: "B", notes: "Real wood top layer, more stable than solid" },
      { material: "Porcelain tile", product_example: "Lea Ceramiche Slimtech", price_range_per_sqm_usd: [35, 70], durability: "very-high", maintenance: "low", sustainability_rating: "B", notes: "Large format available for seamless look" },
      { material: "Polished concrete", product_example: "Pandomo Floor", price_range_per_sqm_usd: [50, 100], durability: "very-high", maintenance: "low", sustainability_rating: "A", notes: "Excellent thermal mass for passive design" },
    ],
    premium: [
      { material: "Solid hardwood", product_example: "Dinesen Douglas Fir", price_range_per_sqm_usd: [80, 180], durability: "high", maintenance: "medium", sustainability_rating: "A", notes: "Wide planks, FSC certified, patinas beautifully" },
      { material: "Natural stone (limestone)", product_example: "Jura Grey Limestone", price_range_per_sqm_usd: [70, 150], durability: "very-high", maintenance: "medium", sustainability_rating: "A", notes: "Each piece unique, honed finish recommended" },
      { material: "Terrazzo", product_example: "Agglotech SB Classic", price_range_per_sqm_usd: [80, 200], durability: "very-high", maintenance: "low", sustainability_rating: "B", notes: "Custom aggregate colors available" },
    ],
    luxury: [
      { material: "Reclaimed wide-plank oak", product_example: "Ebony and Co Heritage", price_range_per_sqm_usd: [150, 400], durability: "high", maintenance: "medium", sustainability_rating: "A", notes: "Century-old character, hand-finished" },
      { material: "Book-matched marble", product_example: "Calacatta Oro", price_range_per_sqm_usd: [200, 500], durability: "medium", maintenance: "high", sustainability_rating: "C", notes: "Requires sealing, stunning veining" },
      { material: "Custom terrazzo", product_example: "Via Arkadia bespoke", price_range_per_sqm_usd: [180, 350], durability: "very-high", maintenance: "low", sustainability_rating: "B", notes: "Custom color, aggregate, and binder" },
    ],
  };

  const wallOptions: Record<string, MaterialSpec[]> = {
    economy: [
      { material: "Paint (acrylic)", product_example: "Benjamin Moore Regal Select", price_range_per_sqm_usd: [3, 8], durability: "medium", maintenance: "low", sustainability_rating: "B", notes: "Low VOC formulas available" },
      { material: "Wallpaper (vinyl)", product_example: "Graham & Brown", price_range_per_sqm_usd: [10, 25], durability: "medium", maintenance: "low", sustainability_rating: "D", notes: "Washable, good for feature walls" },
    ],
    "mid-range": [
      { material: "Lime plaster", product_example: "Marmorino Classico", price_range_per_sqm_usd: [25, 60], durability: "high", maintenance: "low", sustainability_rating: "A", notes: "Breathable, naturally antimicrobial" },
      { material: "Wood paneling", product_example: "Dinesen wall panels", price_range_per_sqm_usd: [40, 90], durability: "high", maintenance: "low", sustainability_rating: "A", notes: "Acoustic benefits, adds warmth" },
    ],
    premium: [
      { material: "Venetian plaster", product_example: "Stucco Lustro", price_range_per_sqm_usd: [50, 120], durability: "high", maintenance: "low", sustainability_rating: "A", notes: "Luminous depth, artisan-applied" },
      { material: "Natural stone cladding", product_example: "Norstone stacked stone", price_range_per_sqm_usd: [60, 150], durability: "very-high", maintenance: "low", sustainability_rating: "B", notes: "Feature wall application" },
    ],
    luxury: [
      { material: "Handmade zellige tiles", product_example: "Emery & Cie", price_range_per_sqm_usd: [100, 300], durability: "high", maintenance: "medium", sustainability_rating: "A", notes: "Each tile unique, Moroccan artisan craft" },
      { material: "Leather wall panels", product_example: "Studioart panels", price_range_per_sqm_usd: [150, 400], durability: "high", maintenance: "medium", sustainability_rating: "C", notes: "Acoustic absorption, luxurious texture" },
    ],
  };

  const ceilingOptions: MaterialSpec[] = [
    { material: "Gypsum board (painted)", product_example: "Gyproc standard + matte paint", price_range_per_sqm_usd: [8, 20], durability: "high", maintenance: "low", sustainability_rating: "B", notes: "Most versatile, accepts any finish" },
    { material: "Acoustic panels", product_example: "Baux Acoustic Tiles", price_range_per_sqm_usd: [40, 90], durability: "high", maintenance: "low", sustainability_rating: "A", notes: "Wool-based, reduces echo in open plans" },
    { material: "Exposed timber beams", product_example: "Glulam spruce beams", price_range_per_sqm_usd: [60, 150], durability: "very-high", maintenance: "low", sustainability_rating: "A", notes: "Structural or decorative, adds character" },
  ];

  const ecoAlternatives = input.sustainability_priority
    ? {
        note: "Eco-priority materials selected",
        certifications_to_look_for: [
          "FSC (Forest Stewardship Council) — timber and wood products",
          "Cradle to Cradle — circular economy certification",
          "EPD (Environmental Product Declaration) — lifecycle transparency",
          "GreenGuard Gold — low chemical emissions",
          "Living Building Challenge Red List Free",
        ],
        alternatives: [
          "Cork flooring — renewable harvest, excellent insulation",
          "Hempcrete walls — carbon-negative, excellent thermal performance",
          "Recycled glass countertops — diverts waste, beautiful aggregates",
          "Bamboo — rapidly renewable, harder than most hardwoods",
          "Reclaimed materials — zero virgin resource use",
        ],
      }
    : null;

  return {
    specification: {
      room_type: input.room_type,
      style: input.style,
      budget,
    },
    floor: {
      recommended: floorOptions[budget] ?? floorOptions["mid-range"],
    },
    walls: {
      recommended: wallOptions[budget] ?? wallOptions["mid-range"],
    },
    ceiling: {
      recommended: ceilingOptions,
    },
    ...(ecoAlternatives ? { sustainability: ecoAlternatives } : {}),
    coordination_notes: [
      "Ensure floor and wall materials are from the same color temperature family",
      "Grout color should be tested with tile samples before committing",
      "Order 10-15% extra material for cuts, waste, and future repairs",
      "Request physical samples — screens distort material colors",
    ],
  };
}
