# architecture-mcp

> **Disclaimer:** This tool provides estimates and suggestions for **informational purposes only**. It does not constitute professional architectural, engineering, legal, or financial advice. Not professional architectural advice — consult a licensed architect. All generated content (floor plans, 3D concepts, material palettes, cost estimates, specifications) must be verified independently. See [TERMS.md](./TERMS.md) and [PRIVACY.md](./PRIVACY.md).

**MCP server for architects and interior designers** -- 3D concepts, floor plans, material palettes, lighting analysis, cost estimates, and contractor specifications.

Built on the [Model Context Protocol](https://modelcontextprotocol.io) (MCP), this server gives AI assistants (Claude, GPT, etc.) professional-grade architecture and interior design tools.

## Why architects need this

| Problem | Solution |
|---|---|
| Clients want to "see something" before hiring | `generate_3d_concept` produces instant design direction |
| Floor plan iterations take hours | `create_floor_plan` generates layouts with SVG and code compliance |
| Material selection is scattered across catalogs | `material_palette` returns specification-grade options with pricing |
| Lighting design requires specialist software | `lighting_analysis` calculates lux, fixtures, and daylighting |
| Cost surprises kill projects | `cost_estimate` gives budgets before the first meeting |
| Contractor handoff documents take days | `export_specs` generates the full spec document |

## Quick start

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "architecture": {
      "command": "npx",
      "args": ["architecture-mcp"]
    }
  }
}
```

### With any MCP client

```bash
npx architecture-mcp
```

## Tools

### `generate_3d_concept`

Generate a 3D architectural concept from a text description. Returns materials, passive design strategies, massing recommendations, and color palette.

```
"A modern minimalist house with flat roof, large south-facing windows, and an open courtyard"
```

### `create_floor_plan`

Create a floor plan from room descriptions. Returns room layout with positions, SVG visualization, compliance warnings (minimum areas, corridor widths), and circulation notes.

### `interior_design`

Full interior design package: mood board, 60-30-10 color palette, furniture layout with specific dimensions and placement rules, and budget estimate.

### `material_palette`

Specification-grade material recommendations for floors, walls, and ceilings. Includes product examples, price per sqm, durability and sustainability ratings.

### `lighting_analysis`

Three-layer lighting plan (ambient + task + accent) with fixture specifications, lux calculations, daylighting analysis, and energy efficiency recommendations.

### `render_walkthrough` (Pro/Studio)

3D walkthrough specification: camera path, render settings, embeddable iframe code, and deliverable list (MP4, WebGL viewer, 360 panoramas).

### `cost_estimate`

Comprehensive cost breakdown: materials, labor, furniture, professional fees, contingency, permits. Location-adjusted with timeline estimate.

### `export_specs` (Pro/Studio)

Complete technical specifications for contractors: room-by-room finishes, electrical/plumbing points, HVAC sizing, fire safety, accessibility requirements, and required drawing list.

## Pricing

| Tier | Price | Designs/month | Tools |
|---|---|---|---|
| **Free** | $0 | 10 | 6 core tools |
| **Pro** | $49/mo | 100 | All 8 tools |
| **Studio** | $149/mo | Unlimited | All 8 + priority |

API keys:
- Free: no key needed
- Pro: starts with `arch_pro_`
- Studio: starts with `arch_studio_`

## Use cases

**Residential architect**: Generate concept, floor plan, materials, and cost estimate for a client presentation -- all from a single conversation.

**Interior designer**: Get mood boards, furniture layouts with exact dimensions and placement rules, and material specifications ready for ordering.

**Developer/contractor**: Export technical specs with electrical points, plumbing counts, HVAC sizing, and compliance requirements.

**Real estate staging**: Quick interior design concepts with budget-appropriate furniture and material suggestions.

## Development

```bash
npm install
npm run build
npm test
npm run dev  # Development mode with tsx
```

## License

MIT
