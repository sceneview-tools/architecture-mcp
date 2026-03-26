#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  Generate3dConceptSchema,
  generate3dConcept,
  CreateFloorPlanSchema,
  createFloorPlan,
  InteriorDesignSchema,
  interiorDesign,
  MaterialPaletteSchema,
  materialPalette,
  LightingAnalysisSchema,
  lightingAnalysis,
  RenderWalkthroughSchema,
  renderWalkthrough,
  CostEstimateSchema,
  costEstimate,
  ExportSpecsSchema,
  exportSpecs,
  Generate3dWalkthroughSchema,
  generate3dWalkthrough,
  SustainabilityAnalysisSchema,
  sustainabilityAnalysis,
} from "./tools/index.js";

import {
  resolveApiKey,
  checkUsage,
  recordUsage,
  checkToolAccess,
  TIERS,
  type Tier,
} from "./tiers.js";

const server = new McpServer({
  name: "architecture-mcp",
  version: "2.0.0",
});

// ---------------------------------------------------------------------------
// Legal disclaimer
// ---------------------------------------------------------------------------

const DISCLAIMER = '\n\n---\n*Not professional architectural advice. Consult a licensed architect. Informational purposes only. See [TERMS.md](https://github.com/sceneview-tools/architecture-mcp/blob/main/TERMS.md).*';

function addDisclaimer(text: string): string {
  return text + DISCLAIMER;
}

// Helper: wrap tool execution with tier checks
function withTierCheck<T>(
  toolName: string,
  handler: (args: T) => unknown
): (args: T & { api_key?: string }) => unknown {
  return (args) => {
    const { api_key, ...rest } = args as T & { api_key?: string };
    const { tier, key } = resolveApiKey(api_key);

    if (!checkToolAccess(tier, toolName)) {
      return {
        error: `Tool '${toolName}' requires Pro or Studio tier. Current tier: ${tier}. Upgrade at https://architecture-mcp.com/pricing`,
        current_tier: tier,
        required_tier: "pro",
      };
    }

    const usage = checkUsage(key, tier);
    if (!usage.allowed) {
      return {
        error: `Monthly design limit reached (${TIERS[tier].monthlyDesigns} designs). Upgrade for more.`,
        current_tier: tier,
        usage: usage,
        upgrade_url: "https://architecture-mcp.com/pricing",
      };
    }

    recordUsage(key);

    const result = handler(rest as T);
    return {
      ...result as object,
      _meta: {
        tier,
        remaining_designs: usage.remaining - 1,
        limit: usage.limit,
      },
    };
  };
}

// API key schema fragment (optional on all tools)
const apiKeyField = {
  api_key: z
    .string()
    .optional()
    .describe(
      "API key for tier access. Free: anonymous, Pro: arch_pro_*, Studio: arch_studio_*"
    ),
};

// Register tools

server.tool(
  "generate_3d_concept",
  "Generate a 3D architectural concept from a text description. Returns style-specific materials, passive design strategies, massing recommendations, and color palette.",
  { ...Generate3dConceptSchema.shape, ...apiKeyField },
  async (args) => {
    const result = withTierCheck("generate_3d_concept", generate3dConcept)(args);
    return { content: [{ type: "text", text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
  }
);

server.tool(
  "create_floor_plan",
  "Create a detailed floor plan from room descriptions with dimensions. Returns room layout, SVG visualization, compliance checks, and circulation notes.",
  { ...CreateFloorPlanSchema.shape, ...apiKeyField },
  async (args) => {
    const result = withTierCheck("create_floor_plan", createFloorPlan)(args);
    return { content: [{ type: "text", text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
  }
);

server.tool(
  "interior_design",
  "Generate interior design recommendations: mood board, color palette, furniture layout with placement rules, and budget estimate.",
  { ...InteriorDesignSchema.shape, ...apiKeyField },
  async (args) => {
    const result = withTierCheck("interior_design", interiorDesign)(args);
    return { content: [{ type: "text", text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
  }
);

server.tool(
  "material_palette",
  "Generate specification-grade material suggestions for floors, walls, and ceilings with pricing, durability ratings, and sustainability scores.",
  { ...MaterialPaletteSchema.shape, ...apiKeyField },
  async (args) => {
    const result = withTierCheck("material_palette", materialPalette)(args);
    return { content: [{ type: "text", text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
  }
);

server.tool(
  "lighting_analysis",
  "Analyze and design a layered lighting plan: ambient, task, and accent lighting with fixture specifications, lux calculations, and daylighting analysis.",
  { ...LightingAnalysisSchema.shape, ...apiKeyField },
  async (args) => {
    const result = withTierCheck("lighting_analysis", lightingAnalysis)(args);
    return { content: [{ type: "text", text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
  }
);

server.tool(
  "render_walkthrough",
  "Generate a 3D walkthrough specification with camera path, render settings, and embeddable viewer code. Pro/Studio tier required.",
  { ...RenderWalkthroughSchema.shape, ...apiKeyField },
  async (args) => {
    const result = withTierCheck("render_walkthrough", renderWalkthrough)(args);
    return { content: [{ type: "text", text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
  }
);

server.tool(
  "cost_estimate",
  "Generate a rough cost estimate for renovation or new build: materials, labor, furniture, professional fees, contingency, and timeline.",
  { ...CostEstimateSchema.shape, ...apiKeyField },
  async (args) => {
    const result = withTierCheck("cost_estimate", costEstimate)(args);
    return { content: [{ type: "text", text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
  }
);

server.tool(
  "export_specs",
  "Generate a technical specifications document for contractors: room-by-room finishes, electrical/plumbing points, HVAC sizing, code compliance, and required drawings. Pro/Studio tier required.",
  { ...ExportSpecsSchema.shape, ...apiKeyField },
  async (args) => {
    const result = withTierCheck("export_specs", exportSpecs)(args);
    return { content: [{ type: "text", text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
  }
);

server.tool(
  "generate_3d_walkthrough",
  "Generate an animated 3D walkthrough camera path through a building. Creates waypoints, camera movements, lighting, audio, and render settings for a full architectural walkthrough video or interactive viewer. Pro/Studio tier required.",
  { ...Generate3dWalkthroughSchema.shape, ...apiKeyField },
  async (args) => {
    const result = withTierCheck("generate_3d_walkthrough", generate3dWalkthrough)(args);
    return { content: [{ type: "text", text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
  }
);

server.tool(
  "sustainability_analysis",
  "Analyze building energy efficiency, materials sustainability, water conservation, and carbon footprint. Provides scores, certification gap analysis (LEED/BREEAM/Passive House), lifecycle carbon estimates, and prioritized improvement recommendations.",
  { ...SustainabilityAnalysisSchema.shape, ...apiKeyField },
  async (args) => {
    const result = withTierCheck("sustainability_analysis", sustainabilityAnalysis)(args);
    return { content: [{ type: "text", text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
