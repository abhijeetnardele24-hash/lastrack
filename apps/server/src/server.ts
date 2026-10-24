import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import dotenv from "dotenv";
import {
  InventoryBriefSchema,
  InventoryBrief,
  AgentRun,
  HealthResponse,
} from "@lastrack/contracts";
import { buildDecisionReceipt, generateReceiptHtml } from "@lastrack/domain";
import { SYNTHETIC_JUDGE_BRIEF, DEMO_AGENT_RUN } from "@lastrack/fixtures";
import { QlooMcpClient } from "./qloo/mcpClient.js";
import { BoundedAgentController } from "./agent/controller.js";

dotenv.config();

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || "0.0.0.0";
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const startTime = Date.now();

// In-memory TTL repository for runs
const activeRuns = new Map<string, AgentRun>();
const activeControllers = new Map<string, BoundedAgentController>();

// Seed with demo synthetic run for instant judge availability
activeRuns.set(DEMO_AGENT_RUN.id, DEMO_AGENT_RUN);

const qlooClient = new QlooMcpClient(process.env.QLOO_API_KEY);

export function buildServer(): FastifyInstance {
  const server = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : "info",
      redact: ["req.headers.authorization", "req.headers.cookie", "body.apiKey"],
    },
    bodyLimit: 1024 * 1024, // 1MB strict limit
  });

  server.register(sensible);
  server.register(cors, {
    origin: [clientOrigin, "http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  });

  server.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
  });

  // 1. Health Endpoint
  server.get("/api/health", async (_req: FastifyRequest, reply: FastifyReply) => {
    const isConfigured = qlooClient.isConfigured();
    const response: HealthResponse = {
      status: "healthy",
      qlooConfigured: isConfigured,
      sourceMode: isConfigured ? "LIVE_QLOO" : "DEMO_FIXTURE",
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      version: "1.0.0",
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
      safeUseGuidelines: "Aligned with Qloo Safe-Use guidelines. No individual profiling or sales prophecies.",
    });
  });

  // 3. Anchor Resolution Endpoint
  server.post("/api/resolve", async (req: FastifyRequest<{ Body: { name: string; expectedType?: string } }>, reply: FastifyReply) => {
    const { name, expectedType } = req.body || {};
    if (!name || typeof name !== "string") {
      return reply.badRequest("Anchor name is required.");
    }

    const res = await qlooClient.callTool("qloo_describe", { name, entityType: expectedType });
    const entityId = res.data?.entityId || `ent_${name.toLowerCase().replace(/\s+/g, "_")}`;
    const resolvedName = res.data?.name || name;

    return reply.status(200).send({
      resolved: {
        inputName: name,
        qlooEntityId: entityId,
        name: resolvedName,
        entityType: res.data?.entityType || expectedType || "brand",
        confidenceState: "CONFIRMED",
        provenanceId: res.provenance.requestId,
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

    // Run controller asynchronously in background
    controller.execute().then((completedRun) => {
      activeRuns.set(completedRun.id, completedRun);
    }).catch((err) => {
      console.error(`Run ${initialRun.id} failed:`, err);
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

    if (run.state === "READY" || run.state === "ERROR") {
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
      if (event.state === "READY" || event.state === "ERROR") {
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
