import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import fastifyStatic from "@fastify/static";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import {
  InventoryBriefSchema,
  InventoryBrief,
  AgentRun,
  HealthResponse,
} from "@lastrack/contracts";
import { buildDecisionReceipt, generateReceiptHtml } from "@lastrack/domain";
import { DEMO_AGENT_RUN } from "@lastrack/fixtures";
import { QlooMcpClient } from "./qloo/mcpClient.js";
import { BoundedAgentController } from "./agent/controller.js";

dotenv.config();

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || "0.0.0.0";
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const startTime = Date.now();

// In-memory repository for runs with TTL cleanup
export const RUN_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL for completed runs
export const activeRuns = new Map<string, AgentRun>();
export const activeControllers = new Map<string, BoundedAgentController>();

// Seed with demo synthetic run for instant judge availability
activeRuns.set(DEMO_AGENT_RUN.id, DEMO_AGENT_RUN);

export const qlooClient = new QlooMcpClient(process.env.QLOO_API_KEY);

let cleanupInterval: NodeJS.Timeout | null = null;

export function cleanupExpiredRuns(maxAgeMs = RUN_TTL_MS, now = Date.now()): number {
  let cleanedCount = 0;
  for (const [id, run] of activeRuns.entries()) {
    // Keep the seed DEMO run permanently available for demonstration
    if (id === DEMO_AGENT_RUN.id) continue;

    const isTerminal = run.state === "READY" || run.state === "ERROR" || run.state === "EMPTY" || run.state === "PARTIAL";
    if (isTerminal) {
      const timestampStr = run.completedAt || run.startedAt;
      const runTime = typeof timestampStr === "string" ? new Date(timestampStr).getTime() : Number(timestampStr) || 0;
      const age = now - runTime;
      if (age > maxAgeMs) {
        activeRuns.delete(id);
        const controller = activeControllers.get(id);
        if (controller) {
          controller.cancel();
          activeControllers.delete(id);
        }
        cleanedCount++;
      }
    }
  }
  return cleanedCount;
}

export function buildServer(): FastifyInstance {
  const server = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : "info",
      redact: ["req.headers.authorization", "req.headers.cookie", "body.apiKey"],
    },
    bodyLimit: 1024 * 1024, // 1MB strict limit
  });

  if (!cleanupInterval && process.env.NODE_ENV !== "test") {
    cleanupInterval = setInterval(() => {
      cleanupExpiredRuns();
    }, 5 * 60 * 1000);
    cleanupInterval.unref();
  }

  server.addHook("onClose", async () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
    await qlooClient.shutdown();
  });

  server.register(sensible);
  server.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. mobile apps, test runners, same-origin)
      if (!origin) {
        cb(null, true);
        return;
      }

      const isLocal =
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin === "http://localhost" ||
        origin === "http://127.0.0.1";
      const isConfiguredClient = clientOrigin && origin === clientOrigin;
      const isAllowedConfig = process.env.ALLOWED_ORIGINS
        ?.split(",")
        .map((s) => s.trim())
        .includes(origin);

      if (process.env.NODE_ENV !== "production" && isLocal) {
        cb(null, true);
        return;
      }

      if (isConfiguredClient || isAllowedConfig) {
        cb(null, true);
        return;
      }

      // In production, reject unauthorized origins fail-closed
      if (process.env.NODE_ENV === "production") {
        cb(new Error("CORS origin not allowed"), false);
        return;
      }

      if (isLocal) {
        cb(null, true);
        return;
      }

      cb(new Error("CORS origin not allowed"), false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  });

  server.register(rateLimit, {
    max: process.env.NODE_ENV === "test" ? 10000 : 1000,
    timeWindow: "1 minute",
    allowList: ["127.0.0.1", "localhost"],
  });

  // Serve static assets if web dist directory is present
  const possibleDistPaths = [
    path.resolve(process.cwd(), "apps/web/dist"),
    path.resolve(process.cwd(), "../web/dist"),
    path.resolve(process.cwd(), "dist/web"),
  ];

  const webDistPath = possibleDistPaths.find((p) => fs.existsSync(p));

  if (webDistPath) {
    server.register(fastifyStatic, {
      root: webDistPath,
      prefix: "/",
      wildcard: false,
    });

    server.setNotFoundHandler((req: FastifyRequest, reply: FastifyReply) => {
      if (req.raw.url && req.raw.url.startsWith("/api/")) {
        return reply.status(404).send({
          error: "Not Found",
          message: `API Route ${req.method} ${req.url} does not exist.`,
        });
      }
      return reply.sendFile("index.html");
    });
  }

  // 1. Health Endpoint
  server.get("/api/health", async (_req: FastifyRequest, reply: FastifyReply) => {
    const isConfigured = qlooClient.isConfigured();
    const mcpReady = qlooClient.isReady();
    const caps = qlooClient.getCapabilities();

    const response: HealthResponse = {
      status: isConfigured && !mcpReady ? "degraded" : "healthy",
      qlooConfigured: isConfigured,
      mcpReady,
      sourceMode: isConfigured && mcpReady ? "LIVE_QLOO" : "DEMO_FIXTURE",
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      version: "1.0.0",
      contractChecksum: caps?.contractChecksum,
      commitSha: process.env.GIT_COMMIT_SHA || "dev-local",
      timestamp: new Date().toISOString(),
    };
    return reply.status(200).send(response);
  });

  // 2. Metadata Endpoint
  server.get("/api/meta", async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      name: "LastRack",
      tagline: "Turn slow stock into a culturally grounded experiment before cutting the price.",
      version: "1.0.0",
      commitSha: process.env.GIT_COMMIT_SHA || "dev-local",
      builtAt: new Date(startTime).toISOString(),
      qlooIndispensable: true,
      safeUseGuidelines: "Aligned with Qloo Safe-Use guidelines. Zero individual demographic profiling, zero sales prophecies.",
    });
  });

  // 3. Anchor Resolution Endpoint (Canonical qloo_describe schema)
  server.post("/api/resolve", async (req: FastifyRequest<{ Body: { name: string; expectedType?: string } }>, reply: FastifyReply) => {
    const { name, expectedType } = req.body || {};
    if (!name || typeof name !== "string") {
      return reply.badRequest("Anchor name is required.");
    }

    const isConfigured = qlooClient.isConfigured();
    const res = await qlooClient.callTool(
      "qloo_describe",
      {
        entity: name,
        ...(expectedType ? { type: expectedType } : {}),
      },
      { allowFixture: !isConfigured }
    );

    if (res.status === "error") {
      return reply.status(502).send({
        error: "Bad Gateway",
        message: res.error?.message || "Failed to resolve entity through Qloo service.",
        status: "error",
        recovery: {
          suggestion: "Check Qloo API credentials or network connectivity, or verify anchor spelling.",
          canRetry: true,
          sourceMode: res.provenance.sourceMode,
        },
        provenanceId: res.provenance?.requestId,
      });
    }

    if (res.status === "needs_input") {
      return reply.status(422).send({
        error: "Unprocessable Entity",
        message: "Entity resolution requires additional disambiguation input.",
        status: "needs_input",
        recovery: {
          suggestion: "Provide an explicit expectedType (e.g. 'brand', 'film', 'music') or a more specific anchor name.",
          candidates: res.results || [],
          canRetry: true,
          sourceMode: res.provenance.sourceMode,
        },
        provenanceId: res.provenance?.requestId,
      });
    }

    if (res.status === "empty" || (!res.results?.length && !res.data)) {
      return reply.status(404).send({
        error: "Not Found",
        message: `Entity "${name}" could not be resolved in Qloo cultural catalog.`,
        status: "empty",
        recovery: {
          suggestion: "Try a broader cultural anchor or verify the brand/artist name spelling.",
          canRetry: true,
          sourceMode: res.provenance.sourceMode,
        },
        provenanceId: res.provenance?.requestId,
      });
    }

    const entityData = res.results?.[0] || res.data;
    if (!entityData || (!entityData.entity_id && !entityData.entityId && !entityData.name)) {
      return reply.status(502).send({
        error: "Bad Gateway",
        message: "Malformed entity resolution response from Qloo.",
        status: "error",
        recovery: {
          suggestion: "Retry with a standard cultural entity anchor.",
          canRetry: true,
          sourceMode: res.provenance.sourceMode,
        },
        provenanceId: res.provenance?.requestId,
      });
    }

    const entityId = entityData.entity_id || entityData.entityId || `ent_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    const resolvedName = entityData.name || name;
    const confidenceState = res.provenance.sourceMode === "DEMO_FIXTURE" ? "DEMO_FIXTURE" : "CONFIRMED";

    return reply.status(200).send({
      resolved: {
        inputName: name,
        qlooEntityId: entityId,
        name: resolvedName,
        entityType: entityData.type || entityData.entityType || expectedType || "brand",
        confidenceState,
        sourceMode: res.provenance.sourceMode,
        provenanceId: res.provenance?.requestId,
      },
    });
  });

  // 4. Start Run Endpoint
  server.post("/api/runs", async (req: FastifyRequest<{ Body: InventoryBrief }>, reply: FastifyReply) => {
    const parseResult = InventoryBriefSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.badRequest(`Invalid brief: ${parseResult.error.message}`);
    }

    const brief = parseResult.data;
    const controller = new BoundedAgentController(brief, qlooClient);
    const initialRun = controller.getRun();

    activeRuns.set(initialRun.id, initialRun);
    activeControllers.set(initialRun.id, controller);

    // Run controller asynchronously in background and cleanup on completion
    controller.execute().then((completedRun) => {
      activeRuns.set(completedRun.id, completedRun);
      activeControllers.delete(completedRun.id);
    }).catch((err) => {
      console.error(`Run ${initialRun.id} failed:`, err);
      activeControllers.delete(initialRun.id);
    });

    return reply.status(202).send({
      runId: initialRun.id,
      state: initialRun.state,
      startedAt: initialRun.startedAt,
    });
  });

  // 5. Get Run by ID
  server.get("/api/runs/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const run = activeRuns.get(id);
    if (!run) {
      return reply.notFound(`Run with ID "${id}" not found.`);
    }
    return reply.status(200).send(run);
  });

  // 6. SSE Events Stream for Live Progress
  server.get("/api/runs/:id/events", (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const controller = activeControllers.get(id);
    const run = activeRuns.get(id);

    if (!run) {
      return reply.notFound(`Run with ID "${id}" not found.`);
    }

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    // Replay prior events
    for (const evt of run.events) {
      reply.raw.write(`data: ${JSON.stringify(evt)}\n\n`);
    }

    if (run.state === "READY" || run.state === "ERROR" || run.state === "EMPTY" || run.state === "PARTIAL") {
      reply.raw.write(`data: ${JSON.stringify({ state: "DONE" })}\n\n`);
      reply.raw.end();
      return;
    }

    if (!controller) {
      reply.raw.end();
      return;
    }

    const unsubscribe = controller.subscribe((event) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      if (
        event.state === "READY" ||
        event.state === "ERROR" ||
        event.state === "EMPTY" ||
        event.state === "PARTIAL"
      ) {
        reply.raw.write(`data: ${JSON.stringify({ state: "DONE" })}\n\n`);
        unsubscribe();
        reply.raw.end();
      }
    });

    req.raw.on("close", () => {
      unsubscribe();
    });
  });

  // 7. Cancel Run
  server.post("/api/runs/:id/cancel", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const controller = activeControllers.get(id);
    if (controller) {
      controller.cancel();
      return reply.status(200).send({ message: "Run cancelled." });
    }
    return reply.notFound(`Active run with ID "${id}" not found.`);
  });

  // 8. Export Decision Receipt JSON
  server.get("/api/runs/:id/export", async (req: FastifyRequest<{ Params: { id: string }; Querystring: { planId?: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { planId } = req.query;
    const run = activeRuns.get(id);

    if (!run) {
      return reply.notFound(`Run with ID "${id}" not found.`);
    }

    const selectedPlanId = planId || run.plans[0]?.id;
    if (!selectedPlanId) {
      return reply.badRequest("No plans available to export.");
    }

    try {
      const receipt = buildDecisionReceipt(run, selectedPlanId);
      return reply.status(200).send(receipt);
    } catch (err: any) {
      return reply.badRequest(err.message);
    }
  });

  // 9. Export Decision Receipt HTML
  server.get("/api/runs/:id/export/html", async (req: FastifyRequest<{ Params: { id: string }; Querystring: { planId?: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { planId } = req.query;
    const run = activeRuns.get(id);

    if (!run) {
      return reply.notFound(`Run with ID "${id}" not found.`);
    }

    const selectedPlanId = planId || run.plans[0]?.id;
    if (!selectedPlanId) {
      return reply.badRequest("No plans available to export.");
    }

    try {
      const receipt = buildDecisionReceipt(run, selectedPlanId);
      const html = generateReceiptHtml(receipt);
      reply.type("text/html");
      return reply.status(200).send(html);
    } catch (err: any) {
      return reply.badRequest(err.message);
    }
  });

  return server;
}

// Start standalone if executed directly
if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  const server = buildServer();
  server.listen({ port, host }, (err, address) => {
    if (err) {
      console.error("Failed to start LastRack server:", err);
      process.exit(1);
    }
    console.log(`LastRack API server listening at ${address}`);
  });
}
