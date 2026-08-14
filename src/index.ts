#!/usr/bin/env node

/**
 * StressZero MCP Server
 *
 * Exposes the StressZero Intelligence API as MCP tools for AI agents.
 * Enables Claude, Cursor, Windsurf, n8n, and any MCP-compatible client
 * to run burnout prevention self-assessments (non-medical), generate reports, and manage API keys.
 *
 * @author Emmanuel Gomes Soares <hello@stresszeroentrepreneur.fr>
 * @see https://stresszeroentrepreneur.fr/intelligence-api
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ============================================================
// CONFIGURATION
// ============================================================

const STRESSZERO_API_KEY = process.env.STRESSZERO_API_KEY;
if (!STRESSZERO_API_KEY) {
  console.error(
    "Error: STRESSZERO_API_KEY environment variable is required.\n\n" +
    "Get your free API key (500 calls/month) at:\n" +
    "  https://stresszeroentrepreneur.fr/intelligence-api\n\n" +
    "Then configure it in your MCP client:\n\n" +
    "  Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json\n" +
    "  Claude Code:    .mcp.json or ~/.claude/mcp.json\n" +
    "  Cursor:         .cursor/mcp.json\n" +
    "  Windsurf:       ~/.codeium/windsurf/mcp_config.json\n\n" +
    '  "env": { "STRESSZERO_API_KEY": "sz_live_your_key_here" }\n'
  );
  process.exit(1);
}

const API_BASE_URL = process.env.STRESSZERO_API_URL || "https://stresszeroentrepreneur.fr";
const REQUEST_TIMEOUT_MS = 30_000;

// ============================================================
// API CLIENT
// ============================================================

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; status?: number };
  meta?: {
    api_version: string;
    latency_ms: number;
    quota: { used: number; limit: number; tier: string };
  };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${STRESSZERO_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "stresszero-mcp/1.1.0",
        ...options.headers,
      },
    });

    const data = (await response.json()) as ApiResponse<T>;

    if (!response.ok) {
      return {
        success: false,
        error: {
          message: data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        },
      };
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: { message: "Request timed out after 30s" } };
    }
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : "Unknown network error" },
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// SHARED SCHEMAS
// ============================================================

const ResponseItemSchema = z.object({
  dimension: z.enum(["physical", "emotional", "effectiveness"]).describe(
    "Burnout dimension to score: physical (sleep, energy, health), emotional (motivation, stress, mood), effectiveness (productivity, focus, achievement)",
  ),
  question_id: z.string().min(1).describe(
    "Identifier for the specific question (e.g., 'sleep', 'motivation', 'productivity')",
  ),
  value: z.number().min(0).max(100).describe(
    "Score from 0 (worst) to 100 (best) for this question",
  ),
  weight: z.number().min(1).max(3).default(1).optional().describe(
    "Importance weight: 1 (normal), 2 (important), 3 (critical). Default: 1",
  ),
});

const ContextSchema = z.object({
  profession: z.string().max(100).optional().describe("Professional title or role"),
  hours_per_week: z.number().min(0).max(120).optional().describe("Weekly working hours"),
  team_size: z.number().min(0).max(1000).optional().describe("Team size"),
  years_experience: z.number().min(0).max(50).optional().describe("Years of professional experience"),
}).optional().describe("Optional context for more personalized analysis");

// ============================================================
// MCP SERVER
// ============================================================

const server = new McpServer(
  {
    name: "stresszero-mcp",
    version: "1.1.0",
  },
  {
    capabilities: { logging: {} },
  },
);

// ============================================================
// TOOL 1: analyze_burnout
// ============================================================

server.registerTool(
  "analyze_burnout",
  {
    title: "Analyze Burnout Signals (self-assessment)",
    description:
      "Self-assessed burnout signals across 3 dimensions (physical, emotional, effectiveness). " +
      "Returns an indicative 0-100 score, level (low/moderate/high/critical), " +
      "contributing factors, urgency rating, and prevention recommendations. " +
      "Not a medical device: no diagnosis — persistent exhaustion warrants a doctor. " +
      "Requires 3-20 response items covering at least the 3 dimensions. " +
      "Free tier: 500 calls/month. All tiers have access.",
    inputSchema: {
      responses: z.array(ResponseItemSchema).min(3).max(20).describe(
        "Array of 3-20 scored responses across the 3 burnout dimensions. " +
        "Must include at least one item per dimension (physical, emotional, effectiveness).",
      ),
      context: ContextSchema,
      language: z.enum(["fr", "en"]).default("fr").optional().describe(
        "Response language: 'fr' (French, default) or 'en' (English)",
      ),
      include_recommendations: z.boolean().default(true).optional().describe(
        "Include personalized recommendations in the response. Default: true",
      ),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
  async ({ responses, context, language, include_recommendations }) => {
    const result = await apiRequest("/api/v1/analyze-burnout", {
      method: "POST",
      body: JSON.stringify({
        responses,
        context,
        options: {
          include_recommendations: include_recommendations ?? true,
          include_dimensions: true,
          language: language ?? "fr",
        },
      }),
    });

    if (!result.success) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Burnout analysis failed: ${result.error?.message || "Unknown error"}`,
          },
        ],
      };
    }

    const quotaInfo = result.meta
      ? `\n\nAPI Quota: ${result.meta.quota.used}/${result.meta.quota.limit} (${result.meta.quota.tier} tier)`
      : "";

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result.data, null, 2) + quotaInfo,
        },
      ],
    };
  },
);

// ============================================================
// TOOL 2: generate_burnout_report
// ============================================================

server.registerTool(
  "generate_burnout_report",
  {
    title: "Generate Detailed Burnout Report",
    description:
      "Generate a comprehensive burnout assessment report with dimension-by-dimension analysis, " +
      "action plans (immediate/short-term/long-term), and resource recommendations. " +
      "REQUIRES Starter tier or above (29€/month). Free tier will receive a 403 error. " +
      "More detailed than analyze_burnout — includes interpretations, status per dimension, " +
      "and a structured action plan.",
    inputSchema: {
      responses: z.array(ResponseItemSchema).min(3).max(20).describe(
        "Array of 3-20 scored responses across the 3 burnout dimensions.",
      ),
      context: z.object({
        profession: z.string().max(100).optional().describe("Professional title"),
        hours_per_week: z.number().min(0).max(120).optional().describe("Weekly hours"),
        team_size: z.number().min(0).max(1000).optional().describe("Team size"),
        years_experience: z.number().min(0).max(50).optional().describe("Years experience"),
        company_name: z.string().max(200).optional().describe("Company name (for report header)"),
        employee_name: z.string().max(200).optional().describe("Subject name (for report header)"),
      }).optional().describe("Context for personalized report generation"),
      language: z.enum(["fr", "en"]).default("fr").optional().describe(
        "Report language: 'fr' (French) or 'en' (English)",
      ),
      format: z.enum(["json", "html"]).default("json").optional().describe(
        "Output format: 'json' (structured data) or 'html' (rendered report)",
      ),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
  async ({ responses, context, language, format }) => {
    const result = await apiRequest("/api/v1/generate-report", {
      method: "POST",
      body: JSON.stringify({
        responses,
        context,
        language: language ?? "fr",
        format: format ?? "json",
      }),
    });

    if (!result.success) {
      const errMsg = result.error?.message || "Unknown error";
      const hint = result.error?.status === 403
        ? "\n\nHint: This endpoint requires a Starter tier or above (29€/month). " +
          "Upgrade at: https://stresszeroentrepreneur.fr/intelligence-api#pricing"
        : "";

      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Report generation failed: ${errMsg}${hint}`,
          },
        ],
      };
    }

    const quotaInfo = result.meta
      ? `\n\nAPI Quota: ${result.meta.quota.used}/${result.meta.quota.limit} (${result.meta.quota.tier} tier)`
      : "";

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result.data, null, 2) + quotaInfo,
        },
      ],
    };
  },
);

// ============================================================
// TOOL 3: quick_burnout_check
// ============================================================

server.registerTool(
  "quick_burnout_check",
  {
    title: "Quick Burnout Self-Check",
    description:
      "Simplified self-check with just 3 self-reported scores (one per dimension). " +
      "Perfect for quick, indicative check-ins in conversations and chatbots. " +
      "Not a diagnosis or clinical triage. Internally calls analyze_burnout with sensible defaults.",
    inputSchema: {
      physical_score: z.number().min(0).max(100).describe(
        "Physical wellbeing score 0-100 (sleep quality, energy, health). Low = burnout risk.",
      ),
      emotional_score: z.number().min(0).max(100).describe(
        "Emotional wellbeing score 0-100 (motivation, stress, mood). Low = burnout risk.",
      ),
      effectiveness_score: z.number().min(0).max(100).describe(
        "Professional effectiveness score 0-100 (productivity, focus, achievement). Low = burnout risk.",
      ),
      profession: z.string().max(100).optional().describe(
        "Professional role (e.g., 'entrepreneur', 'developer', 'manager')",
      ),
      hours_per_week: z.number().min(0).max(120).optional().describe(
        "Weekly working hours (triggers overwork alert if > 50)",
      ),
      language: z.enum(["fr", "en"]).default("fr").optional().describe(
        "Response language: 'fr' or 'en'",
      ),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
  async ({ physical_score, emotional_score, effectiveness_score, profession, hours_per_week, language }) => {
    const result = await apiRequest("/api/v1/analyze-burnout", {
      method: "POST",
      body: JSON.stringify({
        responses: [
          { dimension: "physical", question_id: "overall_physical", value: physical_score, weight: 2 },
          { dimension: "emotional", question_id: "overall_emotional", value: emotional_score, weight: 2 },
          { dimension: "effectiveness", question_id: "overall_effectiveness", value: effectiveness_score, weight: 2 },
        ],
        context: {
          ...(profession && { profession }),
          ...(hours_per_week && { hours_per_week }),
        },
        options: {
          include_recommendations: true,
          include_dimensions: true,
          language: language ?? "fr",
        },
      }),
    });

    if (!result.success) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Quick burnout check failed: ${result.error?.message || "Unknown error"}`,
          },
        ],
      };
    }

    const data = result.data as Record<string, unknown>;
    const score = data?.score as Record<string, unknown> | undefined;
    const risk = data?.risk as Record<string, unknown> | undefined;
    const recommendations = data?.recommendations as string[] | undefined;

    const summary = [
      `Burnout Score: ${score?.total ?? "N/A"}/100`,
      `Risk Level: ${risk?.level ?? "N/A"} (urgency: ${risk?.urgency ?? "N/A"}/10)`,
      `Dimensions: Physical ${(score?.dimensions as Record<string, number>)?.physical ?? "N/A"} | Emotional ${(score?.dimensions as Record<string, number>)?.emotional ?? "N/A"} | Effectiveness ${(score?.dimensions as Record<string, number>)?.effectiveness ?? "N/A"}`,
      "",
      ...(risk?.factors ? [`Risk Factors: ${(risk.factors as string[]).join(", ")}`] : []),
      "",
      ...(recommendations?.length ? ["Recommendations:", ...recommendations.map((r: string) => `  - ${r}`)] : []),
    ].join("\n");

    const quotaInfo = result.meta
      ? `\n\nAPI Quota: ${result.meta.quota.used}/${result.meta.quota.limit} (${result.meta.quota.tier} tier)`
      : "";

    return {
      content: [
        {
          type: "text" as const,
          text: summary + quotaInfo,
        },
      ],
    };
  },
);

// ============================================================
// TOOL 4: get_api_key
// ============================================================

server.registerTool(
  "get_stresszero_api_key",
  {
    title: "Get Free API Key",
    description:
      "Create a free StressZero API key (100 calls/month). " +
      "Use this to help users get started with the API. " +
      "The key is returned once and cannot be retrieved later. " +
      "Requires a valid email address.",
    inputSchema: {
      email: z.string().email().describe("User's email address for the API key"),
      project_name: z.string().min(1).max(100).default("MCP Integration").optional().describe(
        "Name of the project using the API key",
      ),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
  },
  async ({ email, project_name }) => {
    const result = await apiRequest("/api/v1/keys", {
      method: "POST",
      body: JSON.stringify({
        email,
        name: project_name ?? "MCP Integration",
      }),
    });

    if (!result.success) {
      const errMsg = result.error?.message || "Unknown error";
      const hint = result.error?.status === 409
        ? "\nAn active API key already exists for this email."
        : "";

      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `API key creation failed: ${errMsg}${hint}`,
          },
        ],
      };
    }

    const data = result.data as Record<string, unknown>;

    return {
      content: [
        {
          type: "text" as const,
          text: [
            "API Key created successfully!",
            "",
            `Key: ${data?.api_key ?? "N/A"}`,
            `Tier: Free (100 calls/month)`,
            "",
            "IMPORTANT: Save this key now — it will NOT be shown again.",
            "",
            `Documentation: ${data?.docs_url ?? "https://stresszeroentrepreneur.fr/intelligence-api"}`,
          ].join("\n"),
        },
      ],
    };
  },
);

// ============================================================
// TOOL 5: analyze_team
// ============================================================

server.registerTool(
  "analyze_team",
  {
    title: "Analyze Team Burnout",
    description:
      "Analyze burnout risk across a team (2-500 members). " +
      "Returns aggregated metrics (avg, min, max, std dev), risk distribution, " +
      "department breakdown, alerts, and recommendations. " +
      "Each member counts as 1 API call. Requires Starter+ tier.",
    inputSchema: {
      team_name: z.string().max(200).optional().describe("Team name for the report"),
      members: z.array(z.object({
        member_id: z.string().max(100).optional().describe("Member identifier (anonymized if option set)"),
        responses: z.array(ResponseItemSchema).min(3).max(20),
        context: z.object({
          role: z.string().max(100).optional(),
          department: z.string().max(100).optional(),
          hours_per_week: z.number().min(0).max(120).optional(),
        }).optional(),
      })).min(2).max(50).describe("Team members with their burnout responses (2-50 for MCP, API supports up to 500)"),
      anonymize: z.boolean().default(true).optional().describe("Anonymize member IDs in response"),
      language: z.enum(["fr", "en"]).default("fr").optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ team_name, members, anonymize, language }) => {
    const result = await apiRequest("/api/v1/analyze-team", {
      method: "POST",
      body: JSON.stringify({
        team_name,
        members,
        options: { anonymize: anonymize ?? true, include_distribution: true, include_department_breakdown: true, language: language ?? "fr" },
      }),
    });

    if (!result.success) {
      const hint = result.error?.status === 403
        ? "\n\nThis endpoint requires Starter tier or above. Upgrade at: https://stresszeroentrepreneur.fr/intelligence-api#pricing"
        : "";
      return { isError: true, content: [{ type: "text" as const, text: `Team analysis failed: ${result.error?.message}${hint}` }] };
    }

    return { content: [{ type: "text" as const, text: JSON.stringify(result.data, null, 2) }] };
  },
);

// ============================================================
// TOOL 6: predict_burnout
// ============================================================

server.registerTool(
  "predict_burnout",
  {
    title: "Predict Burnout Trajectory (J+30)",
    description:
      "Predict burnout evolution over 7, 14, and 30 days based on current scores and lifestyle context. " +
      "Returns trajectory (improving/stable/worsening/critical_acceleration), " +
      "risk factors with impact scores, and intervention urgency with days-to-critical estimate.",
    inputSchema: {
      responses: z.array(ResponseItemSchema).min(3).max(20).describe("Current burnout responses"),
      context: ContextSchema,
      predictive_context: z.object({
        has_support_network: z.boolean().optional().describe("Does the person have a support network?"),
        has_morning_routine: z.boolean().optional().describe("Does the person have a morning routine?"),
        exercise_days_per_week: z.number().min(0).max(7).optional().describe("Days of exercise per week"),
        sleep_hours: z.number().min(0).max(24).optional().describe("Average sleep hours per night"),
      }).optional().describe("Lifestyle context for prediction accuracy"),
      previous_scores: z.array(z.object({
        physical: z.number().min(0).max(100),
        emotional: z.number().min(0).max(100),
        effectiveness: z.number().min(0).max(100),
        measured_at: z.string().describe("ISO date of measurement"),
      })).max(10).optional().describe("Historical scores for trend detection"),
      language: z.enum(["fr", "en"]).default("fr").optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ responses, context, predictive_context, previous_scores, language }) => {
    const result = await apiRequest("/api/v1/analyze-burnout", {
      method: "POST",
      body: JSON.stringify({
        responses,
        context,
        predictive_context,
        previous_scores,
        options: { include_prediction: true, include_recommendations: true, include_dimensions: true, language: language ?? "fr" },
      }),
    });

    if (!result.success) {
      return { isError: true, content: [{ type: "text" as const, text: `Prediction failed: ${result.error?.message}` }] };
    }

    return { content: [{ type: "text" as const, text: JSON.stringify(result.data, null, 2) }] };
  },
);

// ============================================================
// TOOL 7: check_health
// ============================================================

server.registerTool(
  "check_stresszero_health",
  {
    title: "Check API Health",
    description: "Check the StressZero API health status including database connectivity and rate limiter. No authentication required.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async () => {
    const result = await apiRequest("/api/v1/health");

    if (!result.success) {
      return { isError: true, content: [{ type: "text" as const, text: `Health check failed: ${result.error?.message}` }] };
    }

    // result for health endpoint returns top-level (not wrapped in data)
    const data = result.data || result;
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

// ============================================================
// RESOURCE: OpenAPI Specification
// ============================================================

server.registerResource(
  "openapi-spec",
  "stresszero://openapi",
  {
    title: "StressZero API OpenAPI Specification",
    description: "Complete OpenAPI 3.1 specification for the StressZero Intelligence API",
    mimeType: "application/json",
  },
  async (uri) => {
    const result = await apiRequest<object>("/api/v1/openapi");

    return {
      contents: [
        {
          uri: uri.href,
          text: result.success
            ? JSON.stringify(result.data ?? result, null, 2)
            : JSON.stringify({ error: "Failed to fetch OpenAPI spec" }),
        },
      ],
    };
  },
);

// ============================================================
// PROMPT: Burnout Assessment Template
// ============================================================

server.registerPrompt(
  "burnout_assessment",
  {
    title: "Burnout Assessment",
    description:
      "Guided burnout assessment prompt. Ask the user questions about their physical, " +
      "emotional, and professional effectiveness to generate a burnout score.",
    argsSchema: {
      language: z.enum(["fr", "en"]).default("fr").describe("Assessment language"),
      context: z.string().optional().describe("Additional context about the person being assessed"),
    },
  },
  ({ language, context }) => {
    const isFr = language === "fr";

    const intro = isFr
      ? "Je vais vous guider dans une évaluation rapide du risque de burnout en 3 dimensions."
      : "I'll guide you through a quick burnout risk assessment across 3 dimensions.";

    const questions = isFr
      ? [
          "**Dimension Physique** (sommeil, énergie, santé)",
          "- Sur une échelle de 0 à 100, comment évaluez-vous votre qualité de sommeil ?",
          "- Votre niveau d'énergie au quotidien ?",
          "- Votre santé physique générale ?",
          "",
          "**Dimension Émotionnelle** (motivation, stress, humeur)",
          "- Votre niveau de motivation au travail ?",
          "- Votre gestion du stress ?",
          "- Votre humeur générale ?",
          "",
          "**Dimension Efficacité** (productivité, concentration, accomplissement)",
          "- Votre productivité actuelle ?",
          "- Votre capacité de concentration ?",
          "- Votre sentiment d'accomplissement professionnel ?",
        ]
      : [
          "**Physical Dimension** (sleep, energy, health)",
          "- On a scale of 0-100, how would you rate your sleep quality?",
          "- Your daily energy level?",
          "- Your overall physical health?",
          "",
          "**Emotional Dimension** (motivation, stress, mood)",
          "- Your work motivation level?",
          "- Your stress management?",
          "- Your general mood?",
          "",
          "**Effectiveness Dimension** (productivity, focus, achievement)",
          "- Your current productivity?",
          "- Your ability to concentrate?",
          "- Your sense of professional achievement?",
        ];

    const instruction = isFr
      ? "Après les réponses, utilisez l'outil `analyze_burnout` pour calculer le score et fournir des recommandations."
      : "After the responses, use the `analyze_burnout` tool to calculate the score and provide recommendations.";

    const contextNote = context ? `\nContext: ${context}` : "";

    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [intro, contextNote, "", ...questions, "", instruction].join("\n"),
          },
        },
      ],
    };
  },
);

// ============================================================
// TRANSPORT & START
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("StressZero MCP server running on stdio");
  console.error(`API: ${API_BASE_URL}`);
  console.error("Tools: analyze_burnout, generate_burnout_report, quick_burnout_check, get_stresszero_api_key, analyze_team, predict_burnout, check_stresszero_health");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
