import { z } from "zod";

export const Generate3dConceptSchema = z.object({
  description: z
    .string()
    .describe(
      "Text description of the architectural concept (e.g. 'Modern minimalist house with flat roof, large glass facade, and open-plan living area')"
    ),
  style: z
    .enum([
      "modern",
      "contemporary",
      "minimalist",
      "industrial",
      "scandinavian",
      "mediterranean",
      "art-deco",
      "brutalist",
      "organic",
      "traditional",
    ])
    .optional()
    .describe("Architectural style"),
  budget_range: z
    .enum(["economy", "mid-range", "premium", "luxury"])
    .optional()
    .describe("Target budget range affects material suggestions"),
  climate: z
    .enum(["tropical", "arid", "temperate", "continental", "polar"])
    .optional()
    .describe("Climate zone for passive design recommendations"),
  lot_size_sqm: z
    .number()
    .positive()
    .optional()
    .describe("Lot size in square meters"),
});

export type Generate3dConceptInput = z.infer<typeof Generate3dConceptSchema>;

export function generate3dConcept(input: Generate3dConceptInput) {
  const style = input.style ?? "modern";
  const budget = input.budget_range ?? "mid-range";
  const climate = input.climate ?? "temperate";

  const passiveStrategies: Record<string, string[]> = {
    tropical: [
      "Cross ventilation with operable louvers",
      "Deep overhangs for solar shading (min 1.2m)",
      "Elevated floor for air circulation",
      "Light-colored reflective roof",
    ],
    arid: [
      "Thick thermal mass walls (adobe/rammed earth)",
      "Courtyard layout for microclimate",
      "Minimal west-facing glazing",
      "Evaporative cooling tower",
    ],
    temperate: [
      "South-facing glazing for passive solar gain",
      "Thermal mass flooring (polished concrete)",
      "Natural ventilation stack effect",
      "Deciduous trees on south side",
    ],
    continental: [
      "Super-insulated envelope (R-40+ walls)",
      "Triple-glazed windows",
      "Earth-sheltered north wall",
      "Heat recovery ventilation (HRV)",
    ],
    polar: [
      "Compact form factor (low surface-to-volume)",
      "Quadruple glazing with argon fill",
      "Arctic entry vestibule",
      "Ground-source heat pump",
    ],
  };

  const styleCharacteristics: Record<string, { materials: string[]; features: string[]; palette: string[] }> = {
    modern: {
      materials: ["Exposed concrete", "Steel framing", "Floor-to-ceiling glass", "Zinc cladding"],
      features: ["Flat roof with green roof option", "Cantilever volumes", "Open plan layout", "Frameless glazing"],
      palette: ["#2C3E50", "#ECF0F1", "#BDC3C7", "#95A5A6"],
    },
    minimalist: {
      materials: ["White plaster", "Light oak", "Glass", "Natural stone"],
      features: ["Clean lines", "Recessed lighting", "Hidden storage", "Monolithic volumes"],
      palette: ["#FFFFFF", "#F5F5F0", "#D4C5A9", "#2C2C2C"],
    },
    industrial: {
      materials: ["Exposed brick", "Steel I-beams", "Concrete floors", "Metal mesh"],
      features: ["Double-height spaces", "Exposed ductwork", "Mezzanine level", "Steel-framed windows"],
      palette: ["#4A4A4A", "#8B4513", "#CD853F", "#2F4F4F"],
    },
    scandinavian: {
      materials: ["Pine cladding", "White-washed walls", "Wool textiles", "Birch plywood"],
      features: ["Hygge corners", "Large skylights", "Wood-burning stove", "Built-in seating"],
      palette: ["#F7F3E9", "#C4B8A5", "#5C7457", "#2E3440"],
    },
    mediterranean: {
      materials: ["Terracotta tiles", "Whitewashed stucco", "Wrought iron", "Natural stone"],
      features: ["Arched openings", "Interior courtyard", "Pergola terraces", "Clay roof tiles"],
      palette: ["#FFF8F0", "#D4A373", "#2E5090", "#8B0000"],
    },
    "art-deco": {
      materials: ["Marble", "Brass", "Lacquered wood", "Terrazzo"],
      features: ["Geometric patterns", "Stepped facades", "Sunburst motifs", "Grand entrance"],
      palette: ["#1C1C1C", "#D4AF37", "#006B3C", "#800020"],
    },
    brutalist: {
      materials: ["Board-formed concrete", "Raw steel", "Aggregate panels", "Glass blocks"],
      features: ["Monumental scale", "Repetitive geometry", "Exposed structure", "Fortress-like massing"],
      palette: ["#808080", "#A9A9A9", "#696969", "#C0C0C0"],
    },
    organic: {
      materials: ["Rammed earth", "Curved timber", "Living walls", "Recycled glass"],
      features: ["Flowing curves", "Biophilic design", "Green roofs", "Natural ventilation"],
      palette: ["#556B2F", "#8FBC8F", "#D2B48C", "#F5DEB3"],
    },
    contemporary: {
      materials: ["Composite panels", "Engineered timber", "Smart glass", "Fiber cement"],
      features: ["Mixed volumes", "Indoor-outdoor flow", "Integrated technology", "Flexible spaces"],
      palette: ["#36454F", "#E8E4DE", "#A0522D", "#4682B4"],
    },
    traditional: {
      materials: ["Brick", "Timber framing", "Slate roof", "Limestone"],
      features: ["Pitched roof", "Symmetrical facade", "Sash windows", "Chimney stack"],
      palette: ["#8B4513", "#F5F5DC", "#2F4F4F", "#800000"],
    },
  };

  const sc = styleCharacteristics[style] ?? styleCharacteristics.modern;

  const estimatedArea = input.lot_size_sqm
    ? Math.round(input.lot_size_sqm * 0.5)
    : undefined;

  return {
    concept: {
      description: input.description,
      style,
      budget_range: budget,
      climate,
      lot_size_sqm: input.lot_size_sqm ?? null,
      estimated_built_area_sqm: estimatedArea ?? null,
    },
    design: {
      primary_materials: sc.materials,
      key_features: sc.features,
      color_palette: sc.palette.map((hex, i) => ({
        hex,
        role: ["primary", "secondary", "accent", "neutral"][i] ?? "accent",
      })),
    },
    passive_design: passiveStrategies[climate] ?? passiveStrategies.temperate,
    massing: {
      recommendation:
        style === "minimalist"
          ? "Single monolithic volume with subtractive voids"
          : style === "organic"
            ? "Flowing form following terrain contours"
            : "Interlocking rectangular volumes with height variation",
      orientation: "Primary facade facing south (northern hemisphere) for optimal solar gain",
      setbacks: "Follow local zoning — typical 5m front, 3m sides, 6m rear",
    },
    next_steps: [
      "Refine massing with create_floor_plan for detailed room layout",
      "Use material_palette for specification-grade material selection",
      "Run lighting_analysis for daylighting optimization",
      "Generate cost_estimate for budget alignment",
    ],
  };
}
