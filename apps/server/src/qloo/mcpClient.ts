import { spawn, ChildProcess } from "child_process";
import { createHash } from "crypto";
import { SourceMode } from "@lastrack/contracts";

export interface QlooToolResult<T = any> {
  status: "ok" | "empty" | "needs_input" | "partial" | "degraded" | "error";
  data: T;
  provenance: {
    tool: string;
    requestId: string;
    sourceMode: SourceMode;
    timestamp: string;
    cached?: boolean;
  };
  error?: string;
  isRetryable?: boolean;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timer: NodeJS.Timeout;
}

interface CacheEntry {
  data: any;
  expiresAt: number;
}

export class QlooMcpClient {
  private childProcess: ChildProcess | null = null;
  private pendingRequests = new Map<string | number, PendingRequest>();
  private messageBuffer = "";
  private requestCounter = 0;
  private cache = new Map<string, CacheEntry>();
  private isInitializing = false;
  private initPromise: Promise<boolean> | null = null;
  private readonly apiKey: string | undefined;
  private readonly ttlMs: number;

  constructor(apiKey?: string, ttlSeconds = 300) {
    this.apiKey = apiKey || process.env.QLOO_API_KEY;
    this.ttlMs = ttlSeconds * 1000;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async initialize(): Promise<boolean> {
    if (this.childProcess) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!this.isConfigured()) {
        console.warn("[Qloo MCP Client] No QLOO_API_KEY provided. Operating in DEMO_FIXTURE mode.");
        return false;
      }

      try {
        console.log("[Qloo MCP Client] Spawning official @qloo/qloo-harness MCP child process...");
        const env = {
          ...process.env,
          QLOO_API_KEY: this.apiKey,
        };

        // Spawn qloo mcp using node or npx
        this.childProcess = spawn("npx", ["@qloo/qloo-harness", "qloo", "mcp"], {
          env,
          stdio: ["pipe", "pipe", "pipe"],
          shell: process.platform === "win32",
        });

        this.childProcess.stdout?.on("data", (chunk: Buffer) => {
          this.handleStdout(chunk.toString());
        });

        this.childProcess.stderr?.on("data", (chunk: Buffer) => {
          const errText = chunk.toString();
          // Filter non-fatal diagnostics
          if (!errText.includes("DeprecationWarning")) {
            console.error(`[Qloo MCP Stderr]: ${errText.trim()}`);
          }
        });

        this.childProcess.on("exit", (code, signal) => {
          console.warn(`[Qloo MCP Client] Child process exited with code ${code}, signal ${signal}.`);
          this.childProcess = null;
          // Reject all pending requests
          for (const [id, req] of this.pendingRequests.entries()) {
            clearTimeout(req.timer);
            req.reject(new Error(`MCP process exited unexpectedly (code ${code})`));
            this.pendingRequests.delete(id);
          }
        });

        // Initialize handshake
        const initResult = await this.callJsonRpc("initialize", {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          clientInfo: { name: "LastRack", version: "1.0.0" },
        }, 5000).catch((e) => {
          console.warn("[Qloo MCP Client] Handshake warning (will continue if supported):", e.message);
          return null;
        });

        console.log("[Qloo MCP Client] Handshake complete.");
        return true;
      } catch (err: any) {
        console.error("[Qloo MCP Client] Failed to spawn MCP child process:", err.message);
        this.childProcess = null;
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public async callTool<T = any>(
    toolName: string,
    args: Record<string, any>,
    timeoutMs = 8000
  ): Promise<QlooToolResult<T>> {
    const requestId = `qloo_req_${toolName}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const cacheKey = this.computeCacheKey(toolName, args);

    // 1. Check TTL cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        status: "ok",
        data: cached.data,
        provenance: {
          tool: toolName,
          requestId,
          sourceMode: "CACHED_QLOO",
          timestamp: new Date().toISOString(),
          cached: true,
        },
      };
    }

    // 2. If no API key is configured, fallback to schema-valid fixture
    if (!this.isConfigured()) {
      return this.getMockFixtureResult<T>(toolName, args, requestId);
    }

    // 3. Ensure process initialized
    const isReady = await this.initialize();
    if (!isReady || !this.childProcess) {
      return this.getMockFixtureResult<T>(toolName, args, requestId);
    }

    // 4. Execute over MCP with timeout
    try {
      const response = await this.callJsonRpc(
        "tools/call",
        { name: toolName, arguments: args },
        timeoutMs
      );

      // Parse MCP tool response content
      let parsedData: any = response;
      if (response && Array.isArray(response.content)) {
        const textBlock = response.content.find((c: any) => c.type === "text");
        if (textBlock && typeof textBlock.text === "string") {
          try {
            parsedData = JSON.parse(textBlock.text);
          } catch {
            parsedData = textBlock.text;
          }
        }
      }

      // Cache successful response
      this.cache.set(cacheKey, {
        data: parsedData,
        expiresAt: Date.now() + this.ttlMs,
      });

      return {
        status: "ok",
        data: parsedData,
        provenance: {
          tool: toolName,
          requestId,
          sourceMode: "LIVE_QLOO",
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      console.error(`[Qloo MCP Tool ${toolName} Error]:`, err.message);
      // Fallback gracefully to demo fixture with DEGRADED status
      const fallback = this.getMockFixtureResult<T>(toolName, args, requestId);
      return {
        ...fallback,
        status: "degraded",
        error: err.message,
        isRetryable: err.message?.includes("timeout") || err.message?.includes("rate"),
      };
    }
  }

  private callJsonRpc(method: string, params: any, timeoutMs: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.childProcess || !this.childProcess.stdin) {
        return reject(new Error("MCP child process is not available"));
      }

      const id = ++this.requestCounter;
      const payload = JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params,
      }) + "\n";

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`MCP request ${id} (${method}) timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });

      try {
        this.childProcess.stdin.write(payload);
      } catch (writeErr) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(writeErr);
      }
    });
  }

  private handleStdout(data: string) {
    this.messageBuffer += data;
    const lines = this.messageBuffer.split("\n");
    this.messageBuffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const msg = JSON.parse(trimmed);
        if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
          const { resolve, reject, timer } = this.pendingRequests.get(msg.id)!;
          clearTimeout(timer);
          this.pendingRequests.delete(msg.id);

          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
        }
      } catch (parseErr) {
        // Not a JSON-RPC message line (could be logging from harness)
      }
    }
  }

  private computeCacheKey(tool: string, args: any): string {
    const raw = `${tool}:${JSON.stringify(args, Object.keys(args || {}).sort())}`;
    return createHash("sha256").update(raw).digest("hex");
  }

  private getMockFixtureResult<T>(tool: string, args: any, requestId: string): QlooToolResult<T> {
    let mockData: any = {};

    switch (tool) {
      case "qloo_describe":
        mockData = {
          entityId: `ent_${String(args.name || "item").toLowerCase().replace(/\s+/g, "_")}_001`,
          name: args.name || "Unknown Anchor",
          entityType: args.entityType || "brand",
          description: "High-affinity cultural anchor entity resolved from Qloo taste graph.",
          confidence: 0.96,
        };
        break;

      case "qloo_find_tags":
      case "qloo_entity_tags":
        mockData = {
          tags: ["archive fashion", "cinematic nostalgia", "folk melancholia", "mid-century workwear"],
        };
        break;

      case "qloo_recommend":
        mockData = {
          recommendations: [
            { entityId: "ent_past_lives_010", name: "Past Lives", category: "film", score: 0.92 },
            { entityId: "ent_toast_uk_011", name: "Toast UK", category: "brand", score: 0.89 },
            { entityId: "ent_margaret_howell_012", name: "Margaret Howell", category: "brand", score: 0.85 },
          ],
        };
        break;

      case "qloo_rank":
        mockData = {
          batchId: `batch_${Date.now()}`,
          rankedItems: (args.items || [
            { name: "Cinematic Workwear Editorial", id: "c1" },
            { name: "Sunday Reader Capsule Bundle", id: "c2" },
            { name: "Independent Cinema Sidewalk Rail", id: "c3" },
          ]).map((item: any, idx: number) => ({
            ...item,
            rank: idx + 1,
            score: Number((0.95 - idx * 0.05).toFixed(3)),
          })),
        };
        break;

      case "qloo_where_popular":
        mockData = {
          places: [
            { name: "Nitehawk Cinema", neighborhood: "Williamsburg", city: "Brooklyn" },
            { name: "Word Bookstore", neighborhood: "Greenpoint", city: "Brooklyn" },
          ],
        };
        break;

      default:
        mockData = { status: "ok", result: true };
    }

    return {
      status: "ok",
      data: mockData as T,
      provenance: {
        tool,
        requestId,
        sourceMode: "DEMO_FIXTURE",
        timestamp: new Date().toISOString(),
      },
    };
  }

  public shutdown() {
    if (this.childProcess) {
      console.log("[Qloo MCP Client] Terminating MCP child process...");
      this.childProcess.kill();
      this.childProcess = null;
    }
  }
}
