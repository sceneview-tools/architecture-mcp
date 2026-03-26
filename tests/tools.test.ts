import { describe, it, expect } from "vitest";
import { generate3dConcept } from "../src/tools/generate-3d-concept.js";
import { createFloorPlan } from "../src/tools/create-floor-plan.js";
import { interiorDesign } from "../src/tools/interior-design.js";
import { materialPalette } from "../src/tools/material-palette.js";
import { lightingAnalysis } from "../src/tools/lighting-analysis.js";
import { renderWalkthrough } from "../src/tools/render-walkthrough.js";
import { costEstimate } from "../src/tools/cost-estimate.js";
import { exportSpecs } from "../src/tools/export-specs.js";
import { generate3dWalkthrough } from "../src/tools/generate-3d-walkthrough.js";
import { sustainabilityAnalysis } from "../src/tools/sustainability-analysis.js";

// ==========================================================================
// generate_3d_concept
// ==========================================================================

describe("generate_3d_concept", () => {
  it("returns concept with design and passive strategies", () => {
    const result = generate3dConcept({
      description: "Modern villa with pool and garden",
      style: "modern",
      budget_range: "premium",
      climate: "temperate",
      lot_size_sqm: 500,
    });
    expect(result.concept.style).toBe("modern");
    expect(result.concept.estimated_built_area_sqm).toBe(250);
    expect(result.design.primary_materials).toHaveLength(4);
    expect(result.design.color_palette).toHaveLength(4);
    expect(result.passive_design.length).toBeGreaterThan(0);
    expect(result.massing.orientation).toContain("south");
    expect(result.next_steps.length).toBeGreaterThan(0);
  });

  it("handles minimal input", () => {
    const result = generate3dConcept({ description: "Small cabin in the woods" });
    expect(result.concept.style).toBe("modern");
    expect(result.concept.budget_range).toBe("mid-range");
    expect(result.concept.climate).toBe("temperate");
    expect(result.concept.lot_size_sqm).toBeNull();
  });

  it("returns climate-specific passive design for tropical", () => {
    const result = generate3dConcept({ description: "Beach house", climate: "tropical" });
    expect(result.passive_design.some((s: string) => s.includes("ventilation"))).toBe(true);
  });

  it("handles all styles without error", () => {
    const styles = ["modern", "contemporary", "minimalist", "industrial", "scandinavian", "mediterranean", "art-deco", "brutalist", "organic", "traditional"] as const;
    for (const style of styles) {
      const result = generate3dConcept({ description: `${style} house`, style });
      expect(result.design.primary_materials.length).toBeGreaterThan(0);
      expect(result.design.color_palette.length).toBe(4);
    }
  });

  it("handles all climate zones", () => {
    const climates = ["tropical", "arid", "temperate", "continental", "polar"] as const;
    for (const climate of climates) {
      const result = generate3dConcept({ description: "House", climate });
      expect(result.passive_design.length).toBeGreaterThan(0);
    }
  });

  it("calculates estimated area from lot size", () => {
    const result = generate3dConcept({ description: "House", lot_size_sqm: 1000 });
    expect(result.concept.estimated_built_area_sqm).toBe(500);
  });

  it("provides massing recommendation for minimalist style", () => {
    const result = generate3dConcept({ description: "Minimalist house", style: "minimalist" });
    expect(result.massing.recommendation).toContain("monolithic");
  });

  it("provides massing recommendation for organic style", () => {
    const result = generate3dConcept({ description: "Organic house", style: "organic" });
    expect(result.massing.recommendation).toContain("terrain");
  });
});

// ==========================================================================
// create_floor_plan
// ==========================================================================

describe("create_floor_plan", () => {
  it("generates layout with SVG and compliance check", () => {
    const result = createFloorPlan({
      rooms: [
        { name: "Living Room", width_m: 6, length_m: 5, type: "living", floor: 0 },
        { name: "Kitchen", width_m: 4, length_m: 3.5, type: "kitchen", floor: 0 },
        { name: "Bedroom 1", width_m: 4, length_m: 4, type: "bedroom", floor: 0 },
        { name: "Bathroom", width_m: 2.5, length_m: 2, type: "bathroom", floor: 0 },
      ],
      include_svg: true,
    });
    expect(result.layout.rooms).toHaveLength(4);
    expect(result.layout.total_area_sqm).toBeGreaterThan(0);
    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("Living Room");
    expect(result.compliance).toBeDefined();
  });

  it("warns when bedroom is too small", () => {
    const result = createFloorPlan({
      rooms: [{ name: "Tiny Bedroom", width_m: 2, length_m: 3, type: "bedroom", floor: 0 }],
      include_svg: false,
    });
    expect(result.compliance.warnings.length).toBeGreaterThan(0);
    expect(result.compliance.warnings[0]).toContain("below");
  });

  it("wraps rooms when building width exceeded", () => {
    const result = createFloorPlan({
      rooms: [
        { name: "Room A", width_m: 5, length_m: 4, type: "living", floor: 0 },
        { name: "Room B", width_m: 5, length_m: 4, type: "bedroom", floor: 0 },
        { name: "Room C", width_m: 5, length_m: 4, type: "dining", floor: 0 },
      ],
      building_width_m: 11,
      include_svg: false,
    });
    const roomC = result.layout.rooms.find((r: { name: string }) => r.name === "Room C");
    expect(roomC).toBeDefined();
    expect(roomC!.position.y).toBeGreaterThan(0);
  });

  it("warns about narrow bedroom dimension", () => {
    const result = createFloorPlan({
      rooms: [{ name: "Narrow Bedroom", width_m: 2.0, length_m: 5, type: "bedroom", floor: 0 }],
      include_svg: false,
    });
    expect(result.compliance.warnings.some((w: string) => w.includes("2.4m"))).toBe(true);
  });

  it("suggests more bathrooms for many bedrooms", () => {
    const result = createFloorPlan({
      rooms: [
        { name: "Bed 1", width_m: 4, length_m: 4, type: "bedroom", floor: 0 },
        { name: "Bed 2", width_m: 4, length_m: 4, type: "bedroom", floor: 0 },
        { name: "Bed 3", width_m: 4, length_m: 4, type: "bedroom", floor: 0 },
        { name: "Bath", width_m: 3, length_m: 2, type: "bathroom", floor: 0 },
      ],
      include_svg: false,
    });
    expect(result.compliance.warnings.some((w: string) => w.includes("2 bathrooms"))).toBe(true);
  });
});

// ==========================================================================
// interior_design
// ==========================================================================

describe("interior_design", () => {
  it("returns mood board, palette, and furniture layout", () => {
    const result = interiorDesign({
      room_type: "living-room",
      style: "scandinavian",
      area_sqm: 25,
      ceiling_height_m: 2.7,
      budget: "mid-range",
      natural_light: "abundant",
    });
    expect(result.mood_board.style).toBe("scandinavian");
    expect(result.color_palette.primary.hex).toBeDefined();
    expect(result.color_palette.primary.usage).toContain("60%");
    expect(result.furniture_layout.length).toBeGreaterThan(0);
    expect(result.budget_estimate.furniture_range_usd).toContain("$");
  });

  it("gives small-room tips for compact spaces", () => {
    const result = interiorDesign({
      room_type: "bedroom",
      style: "japandi",
      area_sqm: 9,
      ceiling_height_m: 2.5,
    });
    expect(result.design_tips.some((t: string) => t.includes("multifunctional") || t.includes("wall-mounted"))).toBe(true);
  });

  it("calculates room volume", () => {
    const result = interiorDesign({
      room_type: "living-room",
      style: "modern",
      area_sqm: 20,
      ceiling_height_m: 3.0,
    });
    expect(result.room.volume_m3).toBe(60);
  });

  it("adjusts furniture costs based on budget", () => {
    const economy = interiorDesign({ room_type: "living-room", style: "modern", area_sqm: 20, ceiling_height_m: 2.7, budget: "economy" });
    const luxury = interiorDesign({ room_type: "living-room", style: "modern", area_sqm: 20, ceiling_height_m: 2.7, budget: "luxury" });
    // Parse the min cost from the range string
    const parseMin = (s: string) => parseInt(s.replace(/[$,]/g, ""));
    expect(parseMin(luxury.budget_estimate.furniture_range_usd)).toBeGreaterThan(parseMin(economy.budget_estimate.furniture_range_usd));
  });
});

// ==========================================================================
// material_palette
// ==========================================================================

describe("material_palette", () => {
  it("returns floor, wall, ceiling recommendations", () => {
    const result = materialPalette({ room_type: "kitchen", style: "modern", budget: "premium" });
    expect(result.floor.recommended.length).toBeGreaterThan(0);
    expect(result.walls.recommended.length).toBeGreaterThan(0);
    expect(result.ceiling.recommended.length).toBeGreaterThan(0);
    expect(result.floor.recommended[0].material).toBeDefined();
    expect(result.floor.recommended[0].price_range_per_sqm_usd).toHaveLength(2);
  });

  it("includes sustainability section when prioritized", () => {
    const result = materialPalette({ room_type: "living-room", style: "scandinavian", sustainability_priority: true });
    expect(result.sustainability).toBeDefined();
    expect(result.sustainability!.certifications_to_look_for.length).toBeGreaterThan(0);
  });

  it("does not include sustainability when not requested", () => {
    const result = materialPalette({ room_type: "bedroom", style: "modern" });
    expect(result.sustainability).toBeUndefined();
  });

  it("returns coordination notes", () => {
    const result = materialPalette({ room_type: "bathroom", style: "luxury" });
    expect(result.coordination_notes.length).toBeGreaterThan(0);
  });
});

// ==========================================================================
// lighting_analysis
// ==========================================================================

describe("lighting_analysis", () => {
  it("returns layered lighting plan with lux calculations", () => {
    const result = lightingAnalysis({
      room_type: "home-office",
      area_sqm: 15,
      ceiling_height_m: 2.7,
      natural_light_sources: [{ type: "window", orientation: "north", area_sqm: 2 }],
    });
    expect(result.analysis.required_lux.task).toBe(500);
    expect(result.analysis.total_ambient_lumens_needed).toBeGreaterThan(0);
    expect(result.layered_lighting_plan.fixtures.length).toBeGreaterThanOrEqual(2);
    expect(result.daylighting.orientation_notes.length).toBeGreaterThan(0);
    expect(result.daylighting.orientation_notes[0]).toContain("North");
  });

  it("recommends larger windows when glazing ratio is low", () => {
    const result = lightingAnalysis({
      room_type: "bedroom",
      area_sqm: 20,
      natural_light_sources: [{ type: "window", area_sqm: 1 }],
    });
    expect(result.daylighting.recommendation).toContain("Below");
  });

  it("warns about excessive glazing", () => {
    const result = lightingAnalysis({
      room_type: "living-room",
      area_sqm: 15,
      natural_light_sources: [
        { type: "window", orientation: "south", area_sqm: 3 },
        { type: "glass-door", orientation: "west", area_sqm: 3 },
      ],
    });
    expect(result.daylighting.recommendation).toContain("Above");
  });

  it("includes energy efficiency tips", () => {
    const result = lightingAnalysis({ room_type: "hallway", area_sqm: 8 });
    expect(result.energy_efficiency.tips.length).toBeGreaterThan(0);
  });
});

// ==========================================================================
// render_walkthrough
// ==========================================================================

describe("render_walkthrough", () => {
  it("generates walkthrough spec with camera path", () => {
    const result = renderWalkthrough({
      project_name: "Modern Loft",
      rooms: [
        { name: "Entry", description: "Open entrance", area_sqm: 8 },
        { name: "Living", description: "Double-height living room", area_sqm: 40 },
      ],
      quality: "high",
      duration_seconds: 90,
    });
    expect(result.walkthrough.project_name).toBe("Modern Loft");
    expect(result.walkthrough.status).toBe("queued");
    expect(result.render_settings.resolution).toBe("2560x1440");
    expect(result.camera_path).toHaveLength(2);
    expect(result.embed_code).toContain("iframe");
    expect(result.deliverables.length).toBeGreaterThan(0);
  });

  it("calculates even time distribution across rooms", () => {
    const result = renderWalkthrough({
      project_name: "Test",
      rooms: [
        { name: "A", description: "A", area_sqm: 10 },
        { name: "B", description: "B", area_sqm: 10 },
        { name: "C", description: "C", area_sqm: 10 },
      ],
      duration_seconds: 60,
    });
    expect(result.camera_path).toHaveLength(3);
    expect(result.camera_path[0].entry_time).toBe("0s");
  });
});

// ==========================================================================
// cost_estimate
// ==========================================================================

describe("cost_estimate", () => {
  it("calculates comprehensive cost breakdown", () => {
    const result = costEstimate({
      rooms: [
        { name: "Kitchen", type: "kitchen", area_sqm: 15, renovation_scope: "full-gut" },
        { name: "Living Room", type: "living-room", area_sqm: 30, renovation_scope: "moderate" },
      ],
      location: "us-coastal",
      quality: "mid-range",
      include_furniture: true,
      include_professional_fees: true,
    });
    expect(result.summary.total_estimate_usd).toBeGreaterThan(0);
    expect(result.summary.cost_per_sqm_usd).toBeGreaterThan(0);
    expect(result.by_room).toHaveLength(2);
    expect(result.breakdown.contingency_15pct).toBeGreaterThan(0);
    expect(result.timeline.estimated_weeks).toBeGreaterThan(0);
  });

  it("applies location multiplier correctly", () => {
    const coastal = costEstimate({
      rooms: [{ name: "Room", type: "bedroom", area_sqm: 15, renovation_scope: "moderate" }],
      location: "us-coastal",
      quality: "mid-range",
    });
    const midwest = costEstimate({
      rooms: [{ name: "Room", type: "bedroom", area_sqm: 15, renovation_scope: "moderate" }],
      location: "us-midwest",
      quality: "mid-range",
    });
    expect(coastal.summary.total_estimate_usd).toBeGreaterThan(midwest.summary.total_estimate_usd);
  });

  it("excludes furniture when not requested", () => {
    const result = costEstimate({
      rooms: [{ name: "Room", type: "bedroom", area_sqm: 15, renovation_scope: "moderate" }],
      location: "us-coastal",
      quality: "mid-range",
      include_furniture: false,
    });
    expect(result.breakdown.furniture).toBe("excluded");
  });

  it("excludes professional fees when not requested", () => {
    const result = costEstimate({
      rooms: [{ name: "Room", type: "bedroom", area_sqm: 15, renovation_scope: "moderate" }],
      location: "us-coastal",
      quality: "mid-range",
      include_professional_fees: false,
    });
    expect(result.breakdown.professional_fees_12pct).toBe("excluded");
  });
});

// ==========================================================================
// export_specs
// ==========================================================================

describe("export_specs", () => {
  it("generates complete spec document", () => {
    const result = exportSpecs({
      project_name: "Riverside Apartment",
      client_name: "Jane Smith",
      rooms: [
        { name: "Master Bathroom", type: "bathroom", area_sqm: 8, floor_material: "Porcelain tile", wall_finish: "Zellige tiles" },
        { name: "Open Kitchen", type: "kitchen", area_sqm: 18 },
      ],
      building_code: "IBC",
    });
    expect(result.document.project_name).toBe("Riverside Apartment");
    expect(result.room_specifications).toHaveLength(2);
    expect(result.room_specifications[0].reference).toBe("R01");
    expect(result.room_specifications[0].finishes.floor).toBe("Porcelain tile");
    expect(result.room_specifications[1].services.plumbing_points).toBeGreaterThan(0);
    expect(result.general_requirements.fire_safety.length).toBeGreaterThan(0);
    expect(result.attachments_required.length).toBeGreaterThan(0);
  });

  it("uses default finishes when not specified", () => {
    const result = exportSpecs({
      project_name: "Test",
      rooms: [{ name: "Room", type: "bedroom", area_sqm: 12 }],
    });
    expect(result.room_specifications[0].finishes.floor).toBe("Per architect specification");
  });
});

// ==========================================================================
// generate_3d_walkthrough (NEW)
// ==========================================================================

describe("generate_3d_walkthrough", () => {
  it("generates a complete walkthrough with auto-waypoints", () => {
    const result = generate3dWalkthrough({
      project_name: "Modern House",
      building_type: "residential-house",
      floors: [
        {
          level: 0,
          name: "Ground Floor",
          rooms: [
            { name: "Entry", area_sqm: 8 },
            { name: "Living Room", area_sqm: 35, highlights: ["Fireplace", "Floor-to-ceiling windows"] },
            { name: "Kitchen", area_sqm: 18 },
          ],
          ceiling_height_m: 2.8,
        },
      ],
      camera_style: "steady-walk",
      speed: "normal",
      time_of_day: "golden-hour",
      include_exterior: true,
    });

    expect(result.walkthrough.project_name).toBe("Modern House");
    expect(result.walkthrough.total_rooms).toBe(3);
    expect(result.walkthrough.total_floors).toBe(1);
    expect(result.walkthrough.estimated_duration_seconds).toBeGreaterThan(0);
    expect(result.camera.style).toBe("steady-walk");
    expect(result.camera.height_m).toBe(1.6);
    // 3 rooms + 1 exterior = 4 waypoints
    expect(result.waypoints.length).toBe(4);
    expect(result.waypoints[0].room).toBe("Exterior Approach");
    expect(result.lighting.time_of_day).toBe("golden-hour");
    expect(result.embed_code).toContain("iframe");
    expect(result.deliverables.length).toBeGreaterThan(0);
  });

  it("generates multi-floor walkthrough with transitions", () => {
    const result = generate3dWalkthrough({
      project_name: "Two Story",
      building_type: "residential-house",
      floors: [
        {
          level: 0,
          name: "Ground",
          rooms: [{ name: "Living", area_sqm: 20 }],
          ceiling_height_m: 2.8,
        },
        {
          level: 1,
          name: "First",
          rooms: [{ name: "Bedroom", area_sqm: 15 }],
          ceiling_height_m: 2.6,
        },
      ],
      include_exterior: false,
    });

    // Should have floor transition waypoint
    const transitionWP = result.waypoints.find((w: { room: string }) => w.room.includes("Transition"));
    expect(transitionWP).toBeDefined();
    expect(result.walkthrough.total_floors).toBe(2);
  });

  it("respects drone-flyover camera style", () => {
    const result = generate3dWalkthrough({
      project_name: "Drone View",
      building_type: "office",
      floors: [{ level: 0, name: "Ground", rooms: [{ name: "Lobby", area_sqm: 50 }] }],
      camera_style: "drone-flyover",
      include_exterior: true,
    });

    expect(result.camera.height_m).toBe(8.0);
    expect(result.camera.field_of_view_deg).toBe(60);
    // Exterior approach should have high z position
    expect(result.waypoints[0].position.z).toBe(12);
  });

  it("respects cinematic-dolly camera style", () => {
    const result = generate3dWalkthrough({
      project_name: "Cinematic",
      building_type: "museum",
      floors: [{ level: 0, name: "Main", rooms: [{ name: "Gallery", area_sqm: 100 }] }],
      camera_style: "cinematic-dolly",
      include_exterior: false,
    });

    expect(result.camera.height_m).toBe(1.2);
    expect(result.camera.depth_of_field).toBe(true);
    expect(result.post_processing.motion_blur).toBe(true);
    expect(result.post_processing.vignette).toBe(true);
  });

  it("handles custom waypoints", () => {
    const result = generate3dWalkthrough({
      project_name: "Custom Path",
      building_type: "apartment",
      floors: [{ level: 0, name: "Main", rooms: [{ name: "Studio", area_sqm: 30 }] }],
      waypoints: [
        { room: "Entrance", dwell_seconds: 5, transition: "ease-in" },
        { room: "Studio", look_at: "Kitchen island", dwell_seconds: 4, transition: "spline" },
      ],
      include_exterior: false,
    });

    expect(result.waypoints).toHaveLength(2);
    expect(result.waypoints[0].room).toBe("Entrance");
    expect(result.waypoints[1].look_at).toBe("Kitchen island");
  });

  it("sets correct lighting for night time", () => {
    const result = generate3dWalkthrough({
      project_name: "Night",
      building_type: "hotel",
      floors: [{ level: 0, name: "Lobby", rooms: [{ name: "Lobby", area_sqm: 50 }] }],
      time_of_day: "night",
      include_exterior: false,
    });

    expect(result.lighting.sun_elevation).toBe(-10);
    expect(result.lighting.ambient_intensity).toBe(0.1);
  });

  it("generates mp4-only output", () => {
    const result = generate3dWalkthrough({
      project_name: "Video Only",
      building_type: "residential-house",
      floors: [{ level: 0, name: "Main", rooms: [{ name: "Room", area_sqm: 20 }] }],
      output_format: "mp4",
      include_exterior: false,
    });

    expect(result.render_settings.video).not.toBeNull();
    expect(result.render_settings.webgl).toBeNull();
  });

  it("includes audio settings", () => {
    const result = generate3dWalkthrough({
      project_name: "Audio Test",
      building_type: "restaurant",
      floors: [{ level: 0, name: "Main", rooms: [{ name: "Dining", area_sqm: 60 }] }],
      music_mood: "relaxing",
      camera_style: "first-person",
      include_exterior: false,
    });

    expect(result.audio.spatial_audio).toBe(true);
    expect(result.audio.footsteps).toBe(true);
    expect(result.audio.music_mood).toBe("relaxing");
  });

  it("computes path statistics", () => {
    const result = generate3dWalkthrough({
      project_name: "Stats Test",
      building_type: "office",
      floors: [{
        level: 0,
        name: "Ground",
        rooms: [
          { name: "Reception", area_sqm: 20 },
          { name: "Meeting Room", area_sqm: 30 },
          { name: "Open Office", area_sqm: 100 },
        ],
      }],
      speed: "fast",
      include_exterior: true,
    });

    expect(result.path_statistics.total_waypoints).toBeGreaterThan(0);
    expect(result.path_statistics.total_dwell_time_seconds).toBeGreaterThan(0);
    expect(result.path_statistics.estimated_path_length_m).toBeGreaterThan(0);
  });
});

// ==========================================================================
// sustainability_analysis (NEW)
// ==========================================================================

describe("sustainability_analysis", () => {
  it("returns comprehensive sustainability scores", () => {
    const result = sustainabilityAnalysis({
      project_name: "Green House",
      building_type: "residential",
      total_area_sqm: 150,
      location: "temperate",
    });

    expect(result.overall.score).toBeGreaterThanOrEqual(0);
    expect(result.overall.score).toBeLessThanOrEqual(100);
    expect(result.overall.grade).toBeDefined();
    expect(result.energy_efficiency.score).toBeDefined();
    expect(result.materials_sustainability.score).toBeDefined();
    expect(result.water_efficiency.score).toBeDefined();
    expect(result.improvements.length).toBeGreaterThan(0);
    expect(result.lifecycle.total_lifecycle_carbon_30y_tonnes).toBeDefined();
  });

  it("rewards high-performance envelope", () => {
    const basic = sustainabilityAnalysis({
      project_name: "Basic",
      building_type: "residential",
      total_area_sqm: 150,
      location: "temperate",
    });

    const highPerf = sustainabilityAnalysis({
      project_name: "High Perf",
      building_type: "residential",
      total_area_sqm: 150,
      location: "temperate",
      envelope: {
        wall_type: "sip",
        insulation_r_value: 7,
        window_u_value: 0.8,
        glazing_type: "triple",
        roof_type: "green-roof",
        air_tightness_ach: 0.6,
      },
      energy_systems: {
        heating: "heat-pump-ground",
        ventilation: "mvhr",
        solar_pv_kwp: 6,
      },
    });

    expect(highPerf.energy_efficiency.score).toBeGreaterThan(basic.energy_efficiency.score);
    expect(highPerf.energy_efficiency.estimated_kwh_per_sqm_year).toBeLessThan(basic.energy_efficiency.estimated_kwh_per_sqm_year);
  });

  it("calculates water savings correctly", () => {
    const result = sustainabilityAnalysis({
      project_name: "Water Smart",
      building_type: "residential",
      total_area_sqm: 100,
      location: "temperate",
      occupants: 4,
      water_systems: {
        rainwater_harvesting: true,
        greywater_recycling: true,
        low_flow_fixtures: true,
        drought_resistant_landscaping: true,
      },
    });

    expect(result.water_efficiency.water_savings_pct).toBeGreaterThanOrEqual(75);
    expect(result.water_efficiency.estimated_daily_liters).toBeLessThan(4 * 150); // less than baseline
    expect(result.water_efficiency.score).toBeGreaterThan(60);
  });

  it("handles certification gap analysis", () => {
    const result = sustainabilityAnalysis({
      project_name: "LEED Target",
      building_type: "commercial",
      total_area_sqm: 500,
      location: "temperate",
      target_certification: "leed-gold",
    });

    expect(result.certification_gap).toBeDefined();
    expect(result.certification_gap.status).toBeDefined();
  });

  it("rewards timber construction for materials score", () => {
    const concrete = sustainabilityAnalysis({
      project_name: "Concrete",
      building_type: "residential",
      total_area_sqm: 150,
      location: "temperate",
      envelope: { wall_type: "concrete" },
    });

    const timber = sustainabilityAnalysis({
      project_name: "Timber",
      building_type: "residential",
      total_area_sqm: 150,
      location: "temperate",
      envelope: { wall_type: "timber-frame" },
    });

    expect(timber.materials_sustainability.score).toBeGreaterThan(concrete.materials_sustainability.score);
  });

  it("provides EPC equivalent rating", () => {
    const result = sustainabilityAnalysis({
      project_name: "EPC Test",
      building_type: "residential",
      total_area_sqm: 100,
      location: "temperate",
    });

    expect(["A+", "A", "B", "C", "D"]).toContain(result.energy_efficiency.epc_equivalent);
  });

  it("handles materials with certifications", () => {
    const result = sustainabilityAnalysis({
      project_name: "Certified",
      building_type: "residential",
      total_area_sqm: 100,
      location: "temperate",
      materials: [
        { name: "timber", quantity_kg: 5000, recycled_content_pct: 0, certification: "FSC" },
        { name: "steel", quantity_kg: 2000, recycled_content_pct: 85, certification: "EPD" },
      ],
    });

    expect(result.materials_sustainability.details.some((d: string) => d.includes("certification"))).toBe(true);
  });

  it("warns about distant material sources", () => {
    const result = sustainabilityAnalysis({
      project_name: "Distant Materials",
      building_type: "residential",
      total_area_sqm: 100,
      location: "temperate",
      materials: [
        { name: "marble", quantity_kg: 3000, source_distance_km: 2000 },
      ],
    });

    expect(result.materials_sustainability.details.some((d: string) => d.includes("local alternatives"))).toBe(true);
  });

  it("handles polar climate", () => {
    const result = sustainabilityAnalysis({
      project_name: "Arctic Home",
      building_type: "residential",
      total_area_sqm: 80,
      location: "polar",
    });

    // Polar should have higher energy demand
    expect(result.energy_efficiency.estimated_kwh_per_sqm_year).toBeGreaterThan(100);
  });

  it("calculates lifecycle carbon", () => {
    const result = sustainabilityAnalysis({
      project_name: "Lifecycle",
      building_type: "commercial",
      total_area_sqm: 500,
      location: "temperate",
      energy_systems: { heating: "gas-boiler" },
    });

    expect(result.lifecycle.estimated_operational_carbon_30y_tonnes).toBeGreaterThan(0);
    expect(result.lifecycle.total_lifecycle_carbon_30y_tonnes).toBeGreaterThan(0);
  });
});
