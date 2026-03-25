import { describe, it, expect } from "vitest";
import { generate3dConcept } from "../src/tools/generate-3d-concept.js";
import { createFloorPlan } from "../src/tools/create-floor-plan.js";
import { interiorDesign } from "../src/tools/interior-design.js";
import { materialPalette } from "../src/tools/material-palette.js";
import { lightingAnalysis } from "../src/tools/lighting-analysis.js";
import { renderWalkthrough } from "../src/tools/render-walkthrough.js";
import { costEstimate } from "../src/tools/cost-estimate.js";
import { exportSpecs } from "../src/tools/export-specs.js";

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
    const result = generate3dConcept({
      description: "Small cabin in the woods",
    });

    expect(result.concept.style).toBe("modern");
    expect(result.concept.budget_range).toBe("mid-range");
    expect(result.concept.climate).toBe("temperate");
    expect(result.concept.lot_size_sqm).toBeNull();
  });

  it("returns climate-specific passive design for tropical", () => {
    const result = generate3dConcept({
      description: "Beach house",
      climate: "tropical",
    });

    expect(result.passive_design.some((s: string) => s.includes("ventilation"))).toBe(true);
  });
});

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
      rooms: [
        { name: "Tiny Bedroom", width_m: 2, length_m: 3, type: "bedroom", floor: 0 },
      ],
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

    // Room C should wrap to a new row
    const roomC = result.layout.rooms.find((r: { name: string }) => r.name === "Room C");
    expect(roomC).toBeDefined();
    expect(roomC!.position.y).toBeGreaterThan(0);
  });
});

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
});

describe("material_palette", () => {
  it("returns floor, wall, ceiling recommendations", () => {
    const result = materialPalette({
      room_type: "kitchen",
      style: "modern",
      budget: "premium",
    });

    expect(result.floor.recommended.length).toBeGreaterThan(0);
    expect(result.walls.recommended.length).toBeGreaterThan(0);
    expect(result.ceiling.recommended.length).toBeGreaterThan(0);
    expect(result.floor.recommended[0].material).toBeDefined();
    expect(result.floor.recommended[0].price_range_per_sqm_usd).toHaveLength(2);
  });

  it("includes sustainability section when prioritized", () => {
    const result = materialPalette({
      room_type: "living-room",
      style: "scandinavian",
      sustainability_priority: true,
    });

    expect(result.sustainability).toBeDefined();
    expect(result.sustainability!.certifications_to_look_for.length).toBeGreaterThan(0);
  });
});

describe("lighting_analysis", () => {
  it("returns layered lighting plan with lux calculations", () => {
    const result = lightingAnalysis({
      room_type: "home-office",
      area_sqm: 15,
      ceiling_height_m: 2.7,
      natural_light_sources: [
        { type: "window", orientation: "north", area_sqm: 2 },
      ],
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
});

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
});

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
});

describe("export_specs", () => {
  it("generates complete spec document", () => {
    const result = exportSpecs({
      project_name: "Riverside Apartment",
      client_name: "Jane Smith",
      rooms: [
        {
          name: "Master Bathroom",
          type: "bathroom",
          area_sqm: 8,
          floor_material: "Porcelain tile",
          wall_finish: "Zellige tiles",
        },
        {
          name: "Open Kitchen",
          type: "kitchen",
          area_sqm: 18,
        },
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
});
