import { spawn, ChildProcess } from "child_process";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { SourceMode } from "@lastrack/contracts";

export const EXPECTED_CANONICAL_CHECKSUM = "sha256:762bdcc5e14ff797b6de739d2658a83f78af35e68d7a5a3449455be6046924f5";
export const EXPECTED_PROTOCOL_VERSION = "2024-11-05";
export const REQUIRED_OPERATIONS = ["describe", "find_tags", "recommend", "rank"] as const;

export function getInstalledHarnessVersion(): string {
  try {
    const pkgUrl = import.meta.resolve("@qloo/qloo-harness/package.json");
    const pkgPath = fileURLToPath(pkgUrl);
    const content = fs.readFileSync(pkgPath, "utf-8");
    const parsed = JSON.parse(content);
    return parsed.version || "0.1.26";
  } catch {
    return "0.1.26";
  }
}

export interface CanonicalQlooError {
  code: string;
  message?: string;
  layer?: string;
  retryable: boolean;
  recovery?: string;
}

export interface CanonicalWorkflowExecution {
  transport: string;
  transport_name?: string;
  correlation_id: string;
  duration_ms: number;
}

export interface CanonicalProvenance {
  tool: string;
  requestId: string;
  sourceMode: SourceMode;
  timestamp: string;
  endpoint?: string;
  correlationId?: string;
  cached?: boolean;
}

export interface QlooToolResult<T = any> {
  status: "ok" | "empty" | "needs_input" | "partial" | "degraded" | "error";
  summary?: string;
  data: T;
  results: any[];
  resultCount: number;
  error?: CanonicalQlooError;
  execution?: CanonicalWorkflowExecution;
  provenance: CanonicalProvenance;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timer: NodeJS.Timeout;
}

interface CacheEntry {
  data: any;
  results: any[];
  resultCount: number;
  summary?: string;
  sourceMode: SourceMode;
  expiresAt: number;
}

export interface CapabilitiesMetadata {
  contractVersion: string;
  contractChecksum: string;
  ready: boolean;
  supportedOperations: string[];
}

export class QlooMcpClient {
  private childProcess: ChildProcess | null = null;
  private pendingRequests = new Map<string | number, PendingRequest>();
  private messageBuffer = "";
  private requestCounter = 0;
  private cache = new Map<string, CacheEntry>();
  private initPromise: Promise<boolean> | null = null;
  private mcpReady = false;
  private capabilities: CapabilitiesMetadata | null = null;
  private readonly apiKey: string | undefined;
  private readonly ttlMs: number;
  private readonly customBinPath?: string;

  constructor(apiKey?: string, ttlSeconds = 300, customBinPath?: string) {
    this.apiKey = apiKey || process.env.QLOO_API_KEY;
    this.ttlMs = ttlSeconds * 1000;
    this.customBinPath = customBinPath;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public isReady(): boolean {
    return this.mcpReady;
  }

  public getCapabilities(): CapabilitiesMetadata | null {
    return this.capabilities;
  }

  private resolveHarnessBinPath(): string {
    if (this.customBinPath) {
      return this.customBinPath;
    }
    try {
      const indexUrl = import.meta.resolve("@qloo/qloo-harness");
      const indexPath = fileURLToPath(indexUrl);
      return path.resolve(path.dirname(indexPath), "bin.js");
    } catch {
      // Fallback relative search
      return path.resolve(process.cwd(), "node_modules/@qloo/qloo-harness/dist/bin.js");
    }
  }

  public async initialize(): Promise<boolean> {
    if (this.mcpReady && this.childProcess) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!this.isConfigured()) {
        this.mcpReady = false;
        return false;
      }

      const binPath = this.resolveHarnessBinPath();

      try {
        const env: NodeJS.ProcessEnv = {
          ...process.env,
          QLOO_API_KEY: this.apiKey,
        };

        // Spawn canonical executable with single "mcp" argument directly via node
        this.childProcess = spawn(process.execPath, [binPath, "mcp"], {
          env,
          stdio: ["pipe", "pipe", "pipe"],
          shell: false,
        });

        this.childProcess.stdout?.on("data", (chunk: Buffer) => {
          this.handleStdout(chunk.toString());
        });

        this.childProcess.stderr?.on("data", (chunk: Buffer) => {
          const text = chunk.toString();
          if (!text.includes("DeprecationWarning")) {
            // Keep stderr clean without logging raw keys
            const redacted = text.replace(/(QLOO_API_KEY=)[^\s]+/g, "$1[REDACTED]");
            console.error(`[Qloo MCP Process Log]: ${redacted.trim()}`);
          }
        });

        this.childProcess.on("exit", (code, signal) => {
          this.mcpReady = false;
          this.childProcess = null;
          for (const [id, req] of this.pendingRequests.entries()) {
            clearTimeout(req.timer);
            req.reject(new Error(`MCP child process exited (code ${code}, signal ${signal})`));
            this.pendingRequests.delete(id);
          }
        });

        // 1. Send initialize request
        const initResponse = await this.callJsonRpc("initialize", {
          protocolVersion: EXPECTED_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "LastRack", version: "1.0.0" },
        }, 6000);

        if (!initResponse || !initResponse.protocolVersion) {
          throw new Error("Invalid MCP initialize handshake response from harness.");
        }

        if (initResponse.protocolVersion !== EXPECTED_PROTOCOL_VERSION) {
          throw new Error(`MCP protocol version mismatch: expected ${EXPECTED_PROTOCOL_VERSION}, received ${initResponse.protocolVersion}`);
        }

        // 2. Send notifications/initialized
        this.sendNotification("notifications/initialized", {});

        // 3. Inspect capabilities & contract checksum
        const capResult = await this.callJsonRpc("tools/call", {
          name: "qloo_capabilities",
          arguments: {},
        }, 6000);

        const capData = capResult?.structuredContent || this.extractStructuredContent(capResult);
        if (!capData) {
          throw new Error("Missing structuredContent in qloo_capabilities response.");
        }

        if (capData.contract_checksum !== EXPECTED_CANONICAL_CHECKSUM) {
          throw new Error(`Canonical contract checksum mismatch: expected ${EXPECTED_CANONICAL_CHECKSUM}, received ${capData.contract_checksum}`);
        }

        if (!capData.adapter?.ready) {
          throw new Error("MCP adapter reported ready: false.");
        }

        const supportedOps = capData.adapter?.supported_operation_ids || [];
        for (const op of REQUIRED_OPERATIONS) {
          if (!supportedOps.includes(op)) {
            throw new Error(`Required canonical operation "${op}" is missing from supported_operation_ids: [${supportedOps.join(", ")}].`);
          }
        }

        this.capabilities = {
          contractVersion: capData.contract_version || "1.0.0",
          contractChecksum: capData.contract_checksum,
          ready: true,
          supportedOperations: supportedOps,
        };

        this.mcpReady = true;
        return true;
      } catch (err: any) {
        this.mcpReady = false;
        if (this.childProcess) {
          try {
            this.childProcess.kill("SIGTERM");
          } catch {
            // child process already exited
          }
          this.childProcess = null;
        }
        throw new Error(`MCP Initialization failed: ${err.message}`);
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public async shutdown(): Promise<void> {
    this.mcpReady = false;
    if (this.childProcess) {
      try {
        this.childProcess.kill("SIGTERM");
      } catch {
        // process already exited
      }
      this.childProcess = null;
    }
    for (const [id, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timer);
      req.reject(new Error("MCP client was shut down"));
      this.pendingRequests.delete(id);
    }
  }

  public async callTool<T = any>(
    toolName: string,
    args: Record<string, any>,
    options: {
      timeoutMs?: number;
      allowFixture?: boolean;
      correlationId?: string;
    } = {}
  ): Promise<QlooToolResult<T>> {
    const timeoutMs = options.timeoutMs ?? 10000;
    const correlationId = options.correlationId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const cacheKey = this.computeCacheKey(toolName, args);

    // 1. Cache hit check
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      const mode = cached.sourceMode === "DEMO_FIXTURE" ? "DEMO_FIXTURE" : "CACHED_QLOO";
      return {
        status: "ok",
        summary: cached.summary,
        data: cached.data as T,
        results: cached.results,
        resultCount: cached.resultCount,
        provenance: {
          tool: toolName,
          requestId: correlationId,
          sourceMode: mode,
          timestamp: new Date().toISOString(),
          cached: true,
          correlationId,
        },
      };
    }

    // 2. Explicit DEMO_FIXTURE path (when no API key is configured or fixture explicitly allowed)
    if (!this.isConfigured()) {
      if (options.allowFixture) {
        const fixtureRes = this.getMockFixtureResult<T>(toolName, args, correlationId);
        this.cache.set(cacheKey, {
          data: fixtureRes.data,
          results: fixtureRes.results,
          resultCount: fixtureRes.resultCount,
          summary: fixtureRes.summary,
          sourceMode: "DEMO_FIXTURE",
          expiresAt: Date.now() + this.ttlMs,
        });
        return fixtureRes;
      }
      return {
        status: "error",
        data: null as any,
        results: [],
        resultCount: 0,
        error: {
          code: "QLOO_AUTH",
          retryable: false,
          recovery: "Set QLOO_API_KEY environment variable to enable live MCP tool execution.",
        },
        provenance: {
          tool: toolName,
          requestId: correlationId,
          sourceMode: "DEMO_FIXTURE",
          timestamp: new Date().toISOString(),
          correlationId,
        },
      };
    }

    // 3. Ensure live MCP process is initialized
    await this.initialize();

    // 4. Bounded execution with retry if retryable: true
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const response = await this.callJsonRpc(
          "tools/call",
          { name: toolName, arguments: args },
          timeoutMs
        );

        const structured = response?.structuredContent || this.extractStructuredContent(response);

        if (!structured) {
          throw new Error(`MCP tool "${toolName}" returned empty response.`);
        }

        const isErrorStatus = structured.status === "error" || response?.isError;
        if (isErrorStatus) {
          const errObj: CanonicalQlooError = structured.error || {
            code: "TOOL_ERROR",
            retryable: false,
            recovery: structured.summary || "Inspect tool arguments and parameters.",
          };

          // Retry only if retryable is explicitly true
          if (errObj.retryable && attempt < maxAttempts) {
            const jitterMs = 100 + Math.floor(Math.random() * 150);
            const backoffMs = Math.pow(2, attempt) * 200 + jitterMs;
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }

          return {
            status: "error",
            summary: structured.summary,
            data: structured as T,
            results: structured.results || [],
            resultCount: structured.result_count ?? 0,
            error: errObj,
            execution: structured.execution,
            provenance: {
              tool: toolName,
              requestId: correlationId,
              sourceMode: "LIVE_QLOO",
              timestamp: new Date().toISOString(),
              correlationId: structured.execution?.correlation_id || correlationId,
            },
          };
        }

        // Success response
        const normalizedResults = Array.isArray(structured.results) ? structured.results : [];
        const resultCount = structured.result_count ?? normalizedResults.length;

        // Populate TTL cache
        this.cache.set(cacheKey, {
          data: structured,
          results: normalizedResults,
          resultCount,
          summary: structured.summary,
          sourceMode: "LIVE_QLOO",
          expiresAt: Date.now() + this.ttlMs,
        });

        return {
          status: structured.status || "ok",
          summary: structured.summary,
          data: structured as T,
          results: normalizedResults,
          resultCount,
          execution: structured.execution,
          provenance: {
            tool: toolName,
            requestId: correlationId,
            sourceMode: "LIVE_QLOO",
            timestamp: new Date().toISOString(),
            correlationId: structured.execution?.correlation_id || correlationId,
          },
        };
      } catch (err: any) {
        if (attempt >= maxAttempts) {
          return {
            status: "error",
            data: null as any,
            results: [],
            resultCount: 0,
            error: {
              code: "MCP_TRANSPORT_ERROR",
              retryable: false,
              recovery: err.message,
            },
            provenance: {
              tool: toolName,
              requestId: correlationId,
              sourceMode: "LIVE_QLOO",
              timestamp: new Date().toISOString(),
              correlationId,
            },
          };
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    return {
      status: "error",
      data: null as any,
      results: [],
      resultCount: 0,
      error: { code: "UNKNOWN_ERROR", retryable: false },
      provenance: {
        tool: toolName,
        requestId: correlationId,
        sourceMode: "LIVE_QLOO",
        timestamp: new Date().toISOString(),
      },
    };
  }

  private extractStructuredContent(response: any): any {
    if (!response) return null;
    if (response.structuredContent) return response.structuredContent;
    if (Array.isArray(response.content)) {
      const textBlock = response.content.find((c: any) => c.type === "text");
      if (textBlock && typeof textBlock.text === "string") {
        try {
          return JSON.parse(textBlock.text);
        } catch {
          return null;
        }
      }
    }
    return response;
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

  private sendNotification(method: string, params: any): void {
    if (!this.childProcess || !this.childProcess.stdin) return;
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
    }) + "\n";
    try {
      this.childProcess.stdin.write(payload);
    } catch {
      // Ignored for notifications
    }
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
      } catch {
        // Non-JSON line from process output
      }
    }
  }

  private computeCacheKey(tool: string, args: any): string {
    const raw = `${tool}:${JSON.stringify(args, Object.keys(args || {}).sort())}`;
    return createHash("sha256").update(raw).digest("hex");
  }

  private getMockFixtureResult<T>(tool: string, args: any, requestId: string): QlooToolResult<T> {
    let mockResults: any[] = [];
    let summary = "Synthetic fixture data";

    switch (tool) {
      case "qloo_describe": {
        const entityName = String(args.entity || "Unknown");
        mockResults = [
          {
            entity_id: `ent_fix_${entityName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
            name: entityName,
            type: args.type || "brand",
            description: `Demonstration entity record for ${entityName}`,
          },
        ];
        summary = `Resolved fixture for ${entityName}`;
        break;
      }

      case "qloo_find_tags": {
        mockResults = [
          { tag_urn: "tag:aesthetic:archive_fashion", name: "archive fashion" },
          { tag_urn: "tag:aesthetic:cinematic_nostalgia", name: "cinematic nostalgia" },
          { tag_urn: "tag:aesthetic:folk_melancholia", name: "folk melancholia" },
          { tag_urn: "tag:aesthetic:mid_century_workwear", name: "mid-century workwear" },
        ];
        summary = "Discovered 4 demonstration aesthetic tags";
        break;
      }

      case "qloo_recommend": {
        const targetType = args.target_type || "brand";
        if (targetType === "movie") {
          mockResults = [
            { entity_id: "ent_fix_film_1", name: "Past Lives", type: "movie", score: 0.92, summary: "Muted romantic drama exploring fate and identity" },
            { entity_id: "ent_fix_film_2", name: "Aftersun", type: "movie", score: 0.88, summary: "Reflective summer memory aesthetic" },
          ];
        } else if (targetType === "brand") {
          mockResults = [
            { entity_id: "ent_fix_brand_1", name: "Toast UK", type: "brand", score: 0.89, summary: "Thoughtful garments crafted in natural materials" },
            { entity_id: "ent_fix_brand_2", name: "Margaret Howell", type: "brand", score: 0.86, summary: "Timeless British utilitarian design" },
          ];
        } else if (targetType === "place") {
          mockResults = [
            { entity_id: "ent_fix_place_1", name: "Nitehawk Cinema", type: "place", score: 0.87, location: "Williamsburg, Brooklyn" },
            { entity_id: "ent_fix_place_2", name: "Word Bookstore", type: "place", score: 0.84, location: "Greenpoint, Brooklyn" },
          ];
        } else {
          mockResults = [
            { entity_id: "ent_fix_artist_1", name: "Phoebe Bridgers", type: "artist", score: 0.91 },
            { entity_id: "ent_fix_artist_2", name: "Boygenius", type: "artist", score: 0.87 },
          ];
        }
        summary = `Discovered ${mockResults.length} ${targetType} candidates`;
        break;
      }

      case "qloo_rank": {
        const options: string[] = args.options || [];
        mockResults = options.map((opt, idx) => ({
          option: opt,
          rank: idx + 1,
          score: Number((0.95 - idx * 0.04).toFixed(3)),
        }));
        summary = `Ranked ${options.length} options in unified batch`;
        break;
      }

      default:
        mockResults = [{ status: "ok" }];
    }

    return {
      status: "ok",
      summary,
      data: { results: mockResults } as T,
      results: mockResults,
      resultCount: mockResults.length,
      provenance: {
        tool,
        requestId,
        sourceMode: "DEMO_FIXTURE",
        timestamp: new Date().toISOString(),
        correlationId: requestId,
      },
    };
  }
}
