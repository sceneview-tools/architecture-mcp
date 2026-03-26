import { z } from "zod";

const BuildingEnvelopeSchema = z.object({
  wall_type: z
    .enum(["timber-frame", "steel-frame", "concrete", "masonry", "sip", "icf", "rammed-earth", "straw-bale", "clt"])
    .optional()
    .describe("Wall construction type"),
  insulation_r_value: z.number().positive().optional().describe("Wall insulation R-value"),
  window_u_value: z.number().positive().optional().describe("Window U-value (W/m2K)"),
  glazing_type: z
    .enum(["single", "double", "triple", "quadruple"])
    .optional()
    .describe("Window glazing type"),
  roof_type: z
    .enum(["standard", "green-roof", "cool-roof", "solar-roof"])
    .optional()
    .describe("Roof type"),
  air_tightness_ach: z.number().positive().optional().describe("Air changes per hour at 50 Pa"),
});

const EnergySystemSchema = z.object({
  heating: z
    .enum(["gas-boiler", "heat-pump-air", "heat-pump-ground", "electric-radiator", "biomass", "district", "passive-solar", "none"])
    .optional()
    .describe("Primary heating system"),
  cooling: z
    .enum(["split-ac", "central-ac", "heat-pump", "passive-cooling", "evaporative", "none"])
    .optional()
    .describe("Cooling system"),
  hot_water: z
    .enum(["gas", "heat-pump", "solar-thermal", "electric", "district"])
    .optional()
    .describe("Hot water system"),
  ventilation: z
    .enum(["natural", "mechanical-extract", "mvhr", "demand-controlled"])
    .optional()
    .describe("Ventilation strategy"),
  solar_pv_kwp: z.number().min(0).optional().describe("Solar PV capacity in kWp"),
  battery_kwh: z.number().min(0).optional().describe("Battery storage capacity in kWh"),
});

export const SustainabilityAnalysisSchema = z.object({
  project_name: z.string().describe("Project name"),
  building_type: z
    .enum(["residential", "commercial", "mixed-use", "educational", "healthcare", "industrial"])
    .describe("Building type"),
  total_area_sqm: z.number().positive().describe("Total floor area in square meters"),
  location: z
    .enum(["tropical", "arid", "temperate", "continental", "polar"])
    .default("temperate")
    .describe("Climate zone"),
  occupants: z.number().int().positive().optional().describe("Number of typical occupants"),
  envelope: BuildingEnvelopeSchema.optional().describe("Building envelope specification"),
  energy_systems: EnergySystemSchema.optional().describe("Energy systems installed"),
  materials: z
    .array(
      z.object({
        name: z.string().describe("Material name"),
        quantity_kg: z.number().positive().optional().describe("Quantity in kg"),
        recycled_content_pct: z.number().min(0).max(100).optional().describe("Recycled content percentage"),
        source_distance_km: z.number().min(0).optional().describe("Transport distance from source"),
        certification: z.string().optional().describe("Certification (FSC, Cradle to Cradle, etc.)"),
      })
    )
    .optional()
    .describe("Key materials used"),
  water_systems: z
    .object({
      rainwater_harvesting: z.boolean().optional(),
      greywater_recycling: z.boolean().optional(),
      low_flow_fixtures: z.boolean().optional(),
      drought_resistant_landscaping: z.boolean().optional(),
    })
    .optional()
    .describe("Water management systems"),
  target_certification: z
    .enum(["none", "leed-silver", "leed-gold", "leed-platinum", "breeam-good", "breeam-very-good", "breeam-excellent", "breeam-outstanding", "passive-house", "living-building", "well-silver", "well-gold", "well-platinum"])
    .optional()
    .describe("Target sustainability certification"),
});

export type SustainabilityAnalysisInput = z.infer<typeof SustainabilityAnalysisSchema>;

// Embodied carbon coefficients (kgCO2e per kg of material)
const MATERIAL_CARBON: Record<string, number> = {
  concrete: 0.15,
  steel: 1.55,
  timber: -1.0, // carbon sequestration
  clt: -0.7,
  brick: 0.22,
  glass: 1.2,
  aluminum: 8.24,
  copper: 3.5,
  insulation_mineral: 1.2,
  insulation_cellulose: 0.1,
  gypsum: 0.12,
  "rammed-earth": 0.02,
  "straw-bale": -1.35,
  bamboo: -0.5,
};

// Wall type R-value defaults and carbon factors
const WALL_PROPERTIES: Record<string, { default_r: number; carbon_per_sqm: number; renewable_pct: number }> = {
  "timber-frame": { default_r: 3.5, carbon_per_sqm: -5, renewable_pct: 70 },
  "steel-frame": { default_r: 2.5, carbon_per_sqm: 45, renewable_pct: 30 },
  concrete: { default_r: 1.5, carbon_per_sqm: 60, renewable_pct: 5 },
  masonry: { default_r: 2.0, carbon_per_sqm: 40, renewable_pct: 10 },
  sip: { default_r: 4.5, carbon_per_sqm: 20, renewable_pct: 50 },
  icf: { default_r: 3.8, carbon_per_sqm: 55, renewable_pct: 5 },
  "rammed-earth": { default_r: 1.2, carbon_per_sqm: 3, renewable_pct: 90 },
  "straw-bale": { default_r: 7.0, carbon_per_sqm: -10, renewable_pct: 95 },
  clt: { default_r: 3.0, carbon_per_sqm: -15, renewable_pct: 85 },
};

// Energy system efficiency
const HEATING_EFFICIENCY: Record<string, { cop: number; carbon_kg_per_kwh: number }> = {
  "gas-boiler": { cop: 0.92, carbon_kg_per_kwh: 0.2 },
  "heat-pump-air": { cop: 3.5, carbon_kg_per_kwh: 0.05 },
  "heat-pump-ground": { cop: 4.5, carbon_kg_per_kwh: 0.04 },
  "electric-radiator": { cop: 1.0, carbon_kg_per_kwh: 0.17 },
  biomass: { cop: 0.85, carbon_kg_per_kwh: 0.03 },
  district: { cop: 0.9, carbon_kg_per_kwh: 0.1 },
  "passive-solar": { cop: 99, carbon_kg_per_kwh: 0 },
  none: { cop: 0, carbon_kg_per_kwh: 0 },
};

function calculateEnergyScore(input: SustainabilityAnalysisInput): {
  score: number;
  estimated_kwh_per_sqm_year: number;
  carbon_kg_per_year: number;
  details: string[];
} {
  const envelope = input.envelope ?? {};
  const energy = input.energy_systems ?? {};
  const area = input.total_area_sqm;

  // Base energy demand (kWh/sqm/year) by climate
  const baseDemand: Record<string, number> = {
    tropical: 60,
    arid: 80,
    temperate: 120,
    continental: 180,
    polar: 250,
  };

  let demand = baseDemand[input.location] ?? 120;
  const details: string[] = [];

  // Envelope improvements
  const wallR = envelope.insulation_r_value ?? WALL_PROPERTIES[envelope.wall_type ?? "masonry"]?.default_r ?? 2.0;
  if (wallR > 5) {
    demand *= 0.6;
    details.push(`Excellent wall insulation (R-${wallR}) reduces heating demand by ~40%`);
  } else if (wallR > 3) {
    demand *= 0.8;
    details.push(`Good wall insulation (R-${wallR}) reduces heating demand by ~20%`);
  } else {
    details.push(`Wall insulation R-${wallR} is below recommended R-3.5 for ${input.location} climate`);
  }

  // Window performance
  const windowU = envelope.window_u_value ?? (envelope.glazing_type === "triple" ? 0.8 : envelope.glazing_type === "double" ? 1.6 : 2.8);
  if (windowU < 1.0) {
    demand *= 0.85;
    details.push(`High-performance windows (U=${windowU}) significantly reduce heat loss`);
  } else if (windowU > 2.0) {
    demand *= 1.1;
    details.push(`Windows U=${windowU} are a weak point — consider upgrading to double or triple glazing`);
  }

  // Air tightness
  const ach = envelope.air_tightness_ach ?? 5;
  if (ach <= 1) {
    demand *= 0.7;
    details.push(`Excellent air tightness (${ach} ACH@50Pa) — Passive House level`);
  } else if (ach <= 3) {
    demand *= 0.85;
    details.push(`Good air tightness (${ach} ACH@50Pa)`);
  } else {
    details.push(`Air tightness ${ach} ACH@50Pa could be improved (target < 3)`);
  }

  // Roof
  if (envelope.roof_type === "green-roof") {
    demand *= 0.92;
    details.push("Green roof provides additional insulation and reduces urban heat island effect");
  } else if (envelope.roof_type === "cool-roof") {
    demand *= 0.95;
    details.push("Cool roof reduces cooling load in warm months");
  } else if (envelope.roof_type === "solar-roof") {
    details.push("Solar roof — energy generation accounted in PV system");
  }

  // Ventilation
  if (energy.ventilation === "mvhr") {
    demand *= 0.8;
    details.push("MVHR recovers 80-90% of exhaust heat — major energy saving");
  } else if (energy.ventilation === "demand-controlled") {
    demand *= 0.9;
    details.push("Demand-controlled ventilation reduces unnecessary air changes");
  }

  // Solar PV offset
  const pvGeneration = (energy.solar_pv_kwp ?? 0) * 1100; // avg kWh/kWp/year
  const totalDemand = demand * area;
  const netDemand = Math.max(0, totalDemand - pvGeneration);

  if (pvGeneration > 0) {
    const offset = Math.round((pvGeneration / totalDemand) * 100);
    details.push(`Solar PV (${energy.solar_pv_kwp} kWp) offsets ~${Math.min(offset, 100)}% of energy demand`);
  }

  // Carbon from heating
  const heating = HEATING_EFFICIENCY[energy.heating ?? "gas-boiler"] ?? HEATING_EFFICIENCY["gas-boiler"];
  const heatingCarbon = Math.round(netDemand * 0.6 * heating.carbon_kg_per_kwh); // 60% is heating

  // Score: 0-100
  const kwhPerSqm = Math.round(netDemand / area);
  let score = 100;
  if (kwhPerSqm > 200) score = 20;
  else if (kwhPerSqm > 150) score = 35;
  else if (kwhPerSqm > 100) score = 50;
  else if (kwhPerSqm > 60) score = 65;
  else if (kwhPerSqm > 30) score = 80;
  else if (kwhPerSqm > 15) score = 90;

  return {
    score,
    estimated_kwh_per_sqm_year: kwhPerSqm,
    carbon_kg_per_year: heatingCarbon,
    details,
  };
}

function calculateMaterialScore(input: SustainabilityAnalysisInput): {
  score: number;
  embodied_carbon_kg: number;
  renewable_pct: number;
  recycled_pct: number;
  details: string[];
} {
  const materials = input.materials ?? [];
  const envelope = input.envelope ?? {};
  const details: string[] = [];

  // Calculate embodied carbon from materials list
  let totalCarbon = 0;
  let totalWeight = 0;
  let totalRecycledWeight = 0;
  let certifiedCount = 0;

  for (const mat of materials) {
    const weight = mat.quantity_kg ?? 100;
    const carbonFactor = MATERIAL_CARBON[mat.name.toLowerCase()] ?? 0.5;
    totalCarbon += weight * carbonFactor;
    totalWeight += weight;
    if (mat.recycled_content_pct) {
      totalRecycledWeight += weight * (mat.recycled_content_pct / 100);
    }
    if (mat.certification) {
      certifiedCount++;
    }
    if (mat.source_distance_km && mat.source_distance_km > 500) {
      details.push(`${mat.name}: sourced ${mat.source_distance_km}km away — consider local alternatives`);
    }
  }

  // Wall type contribution
  const wallProps = WALL_PROPERTIES[envelope.wall_type ?? "masonry"] ?? WALL_PROPERTIES.masonry;
  const wallCarbon = wallProps.carbon_per_sqm * input.total_area_sqm * 0.3; // 30% is walls
  totalCarbon += wallCarbon;

  if (wallCarbon < 0) {
    details.push(`${envelope.wall_type ?? "masonry"} walls act as carbon store (negative embodied carbon)`);
  }

  const recycledPct = totalWeight > 0 ? Math.round((totalRecycledWeight / totalWeight) * 100) : 0;

  if (certifiedCount > 0) {
    details.push(`${certifiedCount} material(s) have sustainability certifications`);
  }
  if (recycledPct > 30) {
    details.push(`High recycled content (${recycledPct}%) reduces virgin resource use`);
  }

  // Score: 0-100
  const carbonPerSqm = totalCarbon / input.total_area_sqm;
  let score = 50;
  if (carbonPerSqm < -5) score = 95;
  else if (carbonPerSqm < 0) score = 85;
  else if (carbonPerSqm < 50) score = 75;
  else if (carbonPerSqm < 100) score = 60;
  else if (carbonPerSqm < 200) score = 45;
  else score = 25;

  // Bonus for certifications and recycled content
  score = Math.min(100, score + certifiedCount * 3 + Math.round(recycledPct / 10));

  return {
    score,
    embodied_carbon_kg: Math.round(totalCarbon),
    renewable_pct: wallProps.renewable_pct,
    recycled_pct: recycledPct,
    details,
  };
}

function calculateWaterScore(input: SustainabilityAnalysisInput): {
  score: number;
  estimated_liters_per_day: number;
  savings_pct: number;
  details: string[];
} {
  const water = input.water_systems ?? {};
  const occupants = input.occupants ?? Math.ceil(input.total_area_sqm / 30);
  const details: string[] = [];

  // Base water use: ~150 liters/person/day
  let baseLiters = occupants * 150;
  let savingsPercent = 0;

  if (water.low_flow_fixtures) {
    savingsPercent += 30;
    details.push("Low-flow fixtures reduce water consumption by ~30%");
  }
  if (water.rainwater_harvesting) {
    savingsPercent += 25;
    details.push("Rainwater harvesting can supply toilets, irrigation, and laundry");
  }
  if (water.greywater_recycling) {
    savingsPercent += 20;
    details.push("Greywater recycling reuses shower/sink water for toilets and irrigation");
  }
  if (water.drought_resistant_landscaping) {
    savingsPercent += 10;
    details.push("Drought-resistant landscaping eliminates irrigation needs");
  }

  savingsPercent = Math.min(savingsPercent, 85);
  const actualLiters = Math.round(baseLiters * (1 - savingsPercent / 100));

  // Score
  let score = 30 + Math.round(savingsPercent * 0.7);
  if (!water.low_flow_fixtures && !water.rainwater_harvesting) {
    details.push("No water conservation measures detected — consider low-flow fixtures as minimum");
    score = Math.max(20, score - 10);
  }

  return {
    score: Math.min(100, score),
    estimated_liters_per_day: actualLiters,
    savings_pct: savingsPercent,
    details,
  };
}

function getCertificationGap(
  targetCert: string | undefined,
  overallScore: number
): { status: string; gap_points: number; recommendations: string[] } {
  if (!targetCert || targetCert === "none") {
    return { status: "No certification targeted", gap_points: 0, recommendations: [] };
  }

  const thresholds: Record<string, number> = {
    "leed-silver": 50,
    "leed-gold": 60,
    "leed-platinum": 80,
    "breeam-good": 45,
    "breeam-very-good": 55,
    "breeam-excellent": 70,
    "breeam-outstanding": 85,
    "passive-house": 80,
    "living-building": 90,
    "well-silver": 50,
    "well-gold": 60,
    "well-platinum": 80,
  };

  const required = thresholds[targetCert] ?? 60;
  const gap = Math.max(0, required - overallScore);

  const recommendations: string[] = [];
  if (gap > 0) {
    recommendations.push("Improve building envelope insulation");
    recommendations.push("Add renewable energy generation (solar PV)");
    recommendations.push("Install water conservation systems");
    recommendations.push("Use certified low-carbon materials");
    if (gap > 20) {
      recommendations.push("Consider MVHR ventilation system");
      recommendations.push("Upgrade to ground-source heat pump");
    }
  }

  return {
    status: gap === 0 ? `On track for ${targetCert}` : `${gap} points below ${targetCert} threshold`,
    gap_points: gap,
    recommendations: gap > 0 ? recommendations : ["Current design meets certification requirements"],
  };
}

export function sustainabilityAnalysis(input: SustainabilityAnalysisInput) {
  const energy = calculateEnergyScore(input);
  const materials = calculateMaterialScore(input);
  const water = calculateWaterScore(input);

  // Weighted overall score: Energy 40%, Materials 30%, Water 30%
  const overallScore = Math.round(energy.score * 0.4 + materials.score * 0.3 + water.score * 0.3);

  const certGap = getCertificationGap(input.target_certification, overallScore);

  // Letter grade
  const grade =
    overallScore >= 90
      ? "A+"
      : overallScore >= 80
        ? "A"
        : overallScore >= 70
          ? "B"
          : overallScore >= 60
            ? "C"
            : overallScore >= 50
              ? "D"
              : "F";

  // Improvement recommendations
  const improvements: Array<{ category: string; action: string; impact: string; cost: string; priority: "high" | "medium" | "low" }> = [];

  if (energy.score < 70) {
    improvements.push({
      category: "Energy",
      action: "Upgrade to heat pump (air or ground source)",
      impact: "Reduce heating energy by 60-75%",
      cost: "$8,000 - $25,000",
      priority: "high",
    });
    improvements.push({
      category: "Energy",
      action: "Install solar PV (4-8 kWp system)",
      impact: "Offset 30-60% of electricity demand",
      cost: "$8,000 - $16,000",
      priority: "high",
    });
  }

  if (energy.score < 50) {
    improvements.push({
      category: "Envelope",
      action: "Add external wall insulation to achieve R-5+",
      impact: "Reduce heat loss by 40-60%",
      cost: "$15,000 - $30,000",
      priority: "high",
    });
    improvements.push({
      category: "Envelope",
      action: "Replace windows with triple-glazed (U < 1.0)",
      impact: "Reduce window heat loss by 50%",
      cost: "$10,000 - $25,000",
      priority: "medium",
    });
  }

  if (water.score < 60) {
    improvements.push({
      category: "Water",
      action: "Install low-flow fixtures throughout",
      impact: "Reduce water use by 30%",
      cost: "$500 - $2,000",
      priority: "high",
    });
    improvements.push({
      category: "Water",
      action: "Add rainwater harvesting system",
      impact: "Reduce mains water use by 25%",
      cost: "$3,000 - $8,000",
      priority: "medium",
    });
  }

  if (materials.score < 60) {
    improvements.push({
      category: "Materials",
      action: "Source FSC-certified timber and recycled steel",
      impact: "Reduce embodied carbon by 15-30%",
      cost: "5-15% material cost premium",
      priority: "medium",
    });
  }

  improvements.push({
    category: "Operations",
    action: "Install smart building management system",
    impact: "Reduce operational energy by 10-20%",
    cost: "$2,000 - $8,000",
    priority: "low",
  });

  return {
    project: {
      name: input.project_name,
      type: input.building_type,
      area_sqm: input.total_area_sqm,
      location: input.location,
    },
    overall: {
      score: overallScore,
      grade,
      label: overallScore >= 80 ? "Highly Sustainable" : overallScore >= 60 ? "Good" : overallScore >= 40 ? "Needs Improvement" : "Below Standard",
    },
    energy_efficiency: {
      score: energy.score,
      estimated_kwh_per_sqm_year: energy.estimated_kwh_per_sqm_year,
      operational_carbon_kg_per_year: energy.carbon_kg_per_year,
      epc_equivalent: energy.estimated_kwh_per_sqm_year < 25 ? "A+" : energy.estimated_kwh_per_sqm_year < 50 ? "A" : energy.estimated_kwh_per_sqm_year < 100 ? "B" : energy.estimated_kwh_per_sqm_year < 150 ? "C" : "D",
      details: energy.details,
    },
    materials_sustainability: {
      score: materials.score,
      embodied_carbon_kg_co2e: materials.embodied_carbon_kg,
      embodied_carbon_per_sqm: Math.round(materials.embodied_carbon_kg / input.total_area_sqm),
      renewable_material_pct: materials.renewable_pct,
      recycled_content_pct: materials.recycled_pct,
      details: materials.details,
    },
    water_efficiency: {
      score: water.score,
      estimated_daily_liters: water.estimated_liters_per_day,
      water_savings_pct: water.savings_pct,
      details: water.details,
    },
    certification_gap: certGap,
    improvements: improvements.sort((a, b) => {
      const priority = { high: 0, medium: 1, low: 2 };
      return priority[a.priority] - priority[b.priority];
    }),
    lifecycle: {
      estimated_operational_carbon_30y_tonnes: Math.round((energy.carbon_kg_per_year * 30) / 1000),
      estimated_embodied_carbon_tonnes: Math.round(materials.embodied_carbon_kg / 1000),
      total_lifecycle_carbon_30y_tonnes: Math.round((energy.carbon_kg_per_year * 30 + materials.embodied_carbon_kg) / 1000),
      note: "30-year lifecycle assessment. Embodied carbon is one-time; operational is recurring.",
    },
    next_steps: [
      "Use material_palette with sustainability_priority=true for eco material selection",
      "Run lighting_analysis for daylight optimization to reduce artificial lighting",
      "Generate cost_estimate to compare sustainable vs standard options",
      "Consider a formal LEED/BREEAM pre-assessment with a certified assessor",
    ],
  };
}
