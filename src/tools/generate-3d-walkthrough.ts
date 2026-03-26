import { z } from "zod";

const WaypointSchema = z.object({
  room: z.string().describe("Room name at this waypoint"),
  position: z
    .object({
      x: z.number().describe("X position in meters from origin"),
      y: z.number().describe("Y position in meters from origin"),
      z: z.number().describe("Z/height in meters"),
    })
    .optional()
    .describe("Camera position (auto-calculated if omitted)"),
  look_at: z.string().optional().describe("Point of interest to focus camera on"),
  dwell_seconds: z.number().positive().default(3).describe("Seconds to pause at this waypoint"),
  transition: z
    .enum(["linear", "ease-in-out", "ease-in", "ease-out", "spline"])
    .default("ease-in-out")
    .describe("Transition curve to this waypoint"),
});

export const Generate3dWalkthroughSchema = z.object({
  project_name: z.string().describe("Project name"),
  building_type: z
    .enum([
      "residential-house",
      "apartment",
      "office",
      "retail",
      "restaurant",
      "hotel",
      "museum",
      "school",
      "hospital",
      "mixed-use",
    ])
    .describe("Type of building"),
  floors: z
    .array(
      z.object({
        level: z.number().int().describe("Floor level (0 = ground)"),
        name: z.string().describe("Floor name"),
        rooms: z
          .array(
            z.object({
              name: z.string(),
              area_sqm: z.number().positive(),
              highlights: z.array(z.string()).optional().describe("Key design features to showcase"),
            })
          )
          .min(1),
        ceiling_height_m: z.number().positive().default(2.8).describe("Floor ceiling height"),
      })
    )
    .min(1)
    .describe("Building floors with rooms"),
  waypoints: z
    .array(WaypointSchema)
    .optional()
    .describe("Custom camera waypoints (auto-generated if omitted)"),
  camera_style: z
    .enum(["steady-walk", "drone-flyover", "cinematic-dolly", "first-person", "360-panoramic"])
    .default("steady-walk")
    .describe("Camera movement style"),
  speed: z
    .enum(["slow", "normal", "fast"])
    .default("normal")
    .describe("Overall camera movement speed"),
  time_of_day: z
    .enum(["morning", "noon", "golden-hour", "sunset", "night"])
    .default("golden-hour")
    .describe("Lighting time of day for the walkthrough"),
  include_exterior: z
    .boolean()
    .default(true)
    .describe("Start with exterior approach shot"),
  music_mood: z
    .enum(["none", "ambient", "upbeat", "dramatic", "relaxing"])
    .default("ambient")
    .describe("Background music mood"),
  output_format: z
    .enum(["mp4", "webgl", "both"])
    .default("both")
    .describe("Output format"),
});

export type Generate3dWalkthroughInput = z.infer<typeof Generate3dWalkthroughSchema>;

const CAMERA_SPEEDS: Record<string, number> = {
  slow: 0.5,
  normal: 1.0,
  fast: 1.8,
};

const CAMERA_HEIGHTS: Record<string, number> = {
  "steady-walk": 1.6,
  "drone-flyover": 8.0,
  "cinematic-dolly": 1.2,
  "first-person": 1.65,
  "360-panoramic": 1.5,
};

const TIME_OF_DAY_SETTINGS: Record<
  string,
  { sun_elevation: number; color_temp_k: number; shadow_softness: number; ambient_intensity: number; sky_color: string }
> = {
  morning: { sun_elevation: 20, color_temp_k: 4500, shadow_softness: 0.4, ambient_intensity: 0.6, sky_color: "#87CEEB" },
  noon: { sun_elevation: 70, color_temp_k: 5500, shadow_softness: 0.2, ambient_intensity: 0.9, sky_color: "#4A90D9" },
  "golden-hour": { sun_elevation: 10, color_temp_k: 3200, shadow_softness: 0.7, ambient_intensity: 0.5, sky_color: "#FFB347" },
  sunset: { sun_elevation: 3, color_temp_k: 2800, shadow_softness: 0.9, ambient_intensity: 0.3, sky_color: "#FF6B6B" },
  night: { sun_elevation: -10, color_temp_k: 6500, shadow_softness: 1.0, ambient_intensity: 0.1, sky_color: "#191970" },
};

function generateAutoWaypoints(input: Generate3dWalkthroughInput) {
  const waypoints: Array<{
    room: string;
    floor: number;
    position: { x: number; y: number; z: number };
    look_at: string;
    dwell_seconds: number;
    transition: string;
    camera_movement: string;
    focal_points: string[];
  }> = [];

  const cameraHeight = CAMERA_HEIGHTS[input.camera_style] ?? 1.6;

  // Exterior approach if enabled
  if (input.include_exterior) {
    waypoints.push({
      room: "Exterior Approach",
      floor: 0,
      position: { x: -15, y: 0, z: input.camera_style === "drone-flyover" ? 12 : cameraHeight },
      look_at: "Building facade",
      dwell_seconds: 4,
      transition: "ease-in",
      camera_movement: input.camera_style === "drone-flyover"
        ? "Descending arc from aerial view to entrance level"
        : "Slow approach toward main entrance",
      focal_points: ["Overall building massing and facade", "Landscaping and entry pathway", "Architectural style elements"],
    });
  }

  let xOffset = 0;
  for (const floor of input.floors.sort((a, b) => a.level - b.level)) {
    const floorZ = floor.level * (floor.ceiling_height_m ?? 2.8);

    for (const room of floor.rooms) {
      const roomWidth = Math.sqrt(room.area_sqm);
      const highlights = room.highlights ?? ["Overall space and proportions", "Material finishes", "Natural lighting"];

      waypoints.push({
        room: room.name,
        floor: floor.level,
        position: {
          x: xOffset + roomWidth / 2,
          y: roomWidth / 2,
          z: floorZ + cameraHeight,
        },
        look_at: `Center of ${room.name}`,
        dwell_seconds: Math.max(2, Math.min(6, Math.round(room.area_sqm / 8))),
        transition: "ease-in-out",
        camera_movement:
          input.camera_style === "cinematic-dolly"
            ? `Dolly track across ${room.name}, low angle revealing spatial depth`
            : input.camera_style === "360-panoramic"
              ? `360-degree rotation at center of ${room.name}`
              : `Smooth glide through ${room.name}`,
        focal_points: highlights,
      });

      xOffset += roomWidth + 1;
    }

    // Add floor transition if multiple floors
    if (input.floors.length > 1 && floor !== input.floors[input.floors.length - 1]) {
      waypoints.push({
        room: `Stairway / Transition to ${floor.name} upper level`,
        floor: floor.level,
        position: { x: xOffset / 2, y: 0, z: floorZ + (floor.ceiling_height_m ?? 2.8) },
        look_at: "Staircase or elevator",
        dwell_seconds: 2,
        transition: "spline",
        camera_movement: "Ascending transition to next floor",
        focal_points: ["Vertical circulation", "Staircase design"],
      });
      xOffset = 0;
    }
  }

  return waypoints;
}

export function generate3dWalkthrough(input: Generate3dWalkthroughInput) {
  const totalRooms = input.floors.reduce((sum, f) => sum + f.rooms.length, 0);
  const totalArea = input.floors.reduce(
    (sum, f) => sum + f.rooms.reduce((rs, r) => rs + r.area_sqm, 0),
    0
  );
  const speed = CAMERA_SPEEDS[input.speed] ?? 1.0;

  const waypoints = input.waypoints
    ? input.waypoints.map((wp) => ({
        room: wp.room,
        floor: 0,
        position: wp.position ?? { x: 0, y: 0, z: CAMERA_HEIGHTS[input.camera_style] ?? 1.6 },
        look_at: wp.look_at ?? `Center of ${wp.room}`,
        dwell_seconds: wp.dwell_seconds ?? 3,
        transition: wp.transition ?? "ease-in-out",
        camera_movement: `Custom waypoint in ${wp.room}`,
        focal_points: [`Key features of ${wp.room}`],
      }))
    : generateAutoWaypoints(input);

  const totalDwellTime = waypoints.reduce((s, w) => s + w.dwell_seconds, 0);
  const transitionTime = Math.round((waypoints.length - 1) * (3 / speed));
  const totalDuration = totalDwellTime + transitionTime;

  const lightSettings = TIME_OF_DAY_SETTINGS[input.time_of_day] ?? TIME_OF_DAY_SETTINGS["golden-hour"];

  const walkthroughId = `wt3d_${Date.now().toString(36)}_${input.project_name.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}`;

  return {
    walkthrough: {
      id: walkthroughId,
      project_name: input.project_name,
      building_type: input.building_type,
      total_rooms: totalRooms,
      total_area_sqm: Math.round(totalArea),
      total_floors: input.floors.length,
      estimated_duration_seconds: totalDuration,
    },
    camera: {
      style: input.camera_style,
      height_m: CAMERA_HEIGHTS[input.camera_style] ?? 1.6,
      speed_multiplier: speed,
      field_of_view_deg: input.camera_style === "cinematic-dolly" ? 35 : input.camera_style === "drone-flyover" ? 60 : 50,
      stabilization: input.camera_style === "first-person" ? "handheld-subtle" : "gimbal-smooth",
      depth_of_field: input.camera_style === "cinematic-dolly",
    },
    waypoints,
    path_statistics: {
      total_waypoints: waypoints.length,
      total_dwell_time_seconds: totalDwellTime,
      total_transition_time_seconds: transitionTime,
      estimated_path_length_m: Math.round(waypoints.length * 5 * speed),
    },
    lighting: {
      time_of_day: input.time_of_day,
      ...lightSettings,
      interior_lights: "Auto-generated based on room types — adjustable in post",
      exposure_mode: "Auto with highlight recovery",
    },
    audio: {
      music_mood: input.music_mood,
      ambient_sounds: input.music_mood !== "none",
      spatial_audio: input.camera_style === "first-person",
      footsteps: input.camera_style === "steady-walk" || input.camera_style === "first-person",
    },
    render_settings: {
      output_format: input.output_format,
      video: input.output_format !== "webgl" ? {
        resolution: "3840x2160",
        fps: 30,
        codec: "H.265 (HEVC)",
        bitrate: "50 Mbps",
        estimated_file_size: `${Math.round(totalDuration * 6.25)} MB`,
      } : null,
      webgl: input.output_format !== "mp4" ? {
        engine: "Three.js / Filament.js",
        progressive_loading: true,
        max_texture_size: 4096,
        shadow_quality: "high",
        anti_aliasing: "MSAA 4x",
      } : null,
    },
    post_processing: {
      color_grading: "Architectural natural — lifted blacks, desaturated highlights",
      bloom: input.time_of_day === "golden-hour" || input.time_of_day === "sunset",
      ambient_occlusion: "GTAO (Ground Truth Ambient Occlusion)",
      motion_blur: input.camera_style === "cinematic-dolly",
      vignette: input.camera_style === "cinematic-dolly",
      chromatic_aberration: false,
    },
    embed_code: `<iframe src="https://viewer.architecture-mcp.com/walkthrough/${walkthroughId}" width="100%" height="600" frameborder="0" allow="xr-spatial-tracking" allowfullscreen loading="lazy"></iframe>`,
    deliverables: [
      ...(input.output_format !== "webgl"
        ? [`MP4 4K video: ${input.project_name} walkthrough (${totalDuration}s)`]
        : []),
      ...(input.output_format !== "mp4"
        ? [
            "Interactive WebGL viewer (embeddable, mobile-responsive)",
            "VR-ready version (WebXR compatible)",
          ]
        : []),
      "360-degree panoramas for each waypoint (8K JPEG)",
      "Camera path data (JSON) for re-rendering",
      "Thumbnail sequence (16 stills, 1920x1080)",
    ],
    next_steps: [
      "Connect a rendering engine (Unreal, Twinmotion, D5 Render) for photorealistic output",
      "Use material_palette to finalize surface materials before rendering",
      "Run lighting_analysis to optimize fixture placement visible in walkthrough",
      "Generate cost_estimate to present alongside the walkthrough",
    ],
  };
}
