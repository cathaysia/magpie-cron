import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { ProviderInfo } from "../shared/types";

const execAsync = promisify(exec);

export class PaseoConfigManager {
  private configPath: string;

  constructor() {
    this.configPath = path.join(os.homedir(), ".paseo", "config.json");
  }

  private readRawConfig(): any {
    if (!fs.existsSync(this.configPath)) {
      return {};
    }
    const raw = fs.readFileSync(this.configPath, "utf-8");
    return JSON.parse(raw);
  }

  private writeRawConfig(config: any): void {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  async reloadDaemon(): Promise<void> {
    try {
      await execAsync("paseo reload");
      console.log("[magie-cron] Paseo configuration reloaded successfully");
    } catch (err) {
      console.warn("[magie-cron] paseo reload failed (daemon might not be running or in path):", err);
    }
  }

  getProviders(): ProviderInfo[] {
    const root = this.readRawConfig();
    const providersObj = root?.agents?.providers || {};
    const result: ProviderInfo[] = [];

    for (const [providerId, provData] of Object.entries<any>(providersObj)) {
      const enabled = provData.enabled !== false;
      const label = provData.label || providerId;
      const additionalModels: Array<{ id: string; label: string }> = (provData.additionalModels || []).map((m: any) => ({
        id: m.id,
        label: m.label || m.id,
      }));
      const models: Array<{ id: string; label: string }> = (provData.models || []).map((m: any) => ({
        id: m.id,
        label: m.label || m.id,
      }));

      result.push({
        id: providerId,
        label,
        enabled,
        models,
        additionalModels,
      });
    }

    return result;
  }

  /**
   * Set model disabled or enabled.
   * If modelId is omitted or matches provider, toggles provider.enabled.
   * If modelId is specified, moves it out of additionalModels/models to a backup or restores it,
   * or sets provider.enabled if modelId represents the provider.
   */
  async setModelStatus(providerId: string, modelId?: string, disabled: boolean = true): Promise<void> {
    const root = this.readRawConfig();
    if (!root.agents) {
      root.agents = {};
    }
    if (!root.agents.providers) {
      root.agents.providers = {};
    }
    if (!root.agents.providers[providerId]) {
      root.agents.providers[providerId] = { enabled: true };
    }

    const providerConfig = root.agents.providers[providerId];

    if (!modelId || modelId === "" || modelId === providerId) {
      // Toggle entire provider
      providerConfig.enabled = !disabled;
    } else {
      // Toggle specific model under provider
      // Store disabled models under _disabledModels in providerConfig to preserve details
      if (!providerConfig._disabledModels) {
        providerConfig._disabledModels = [];
      }

      if (disabled) {
        // Disable model: find in additionalModels or models, move to _disabledModels
        if (Array.isArray(providerConfig.additionalModels)) {
          const idx = providerConfig.additionalModels.findIndex((m: any) => m.id === modelId);
          if (idx !== -1) {
            const [removed] = providerConfig.additionalModels.splice(idx, 1);
            if (!providerConfig._disabledModels.some((m: any) => m.id === modelId)) {
              providerConfig._disabledModels.push({ ...removed, _source: "additionalModels" });
            }
          }
        }
        if (Array.isArray(providerConfig.models)) {
          const idx = providerConfig.models.findIndex((m: any) => m.id === modelId);
          if (idx !== -1) {
            const [removed] = providerConfig.models.splice(idx, 1);
            if (!providerConfig._disabledModels.some((m: any) => m.id === modelId)) {
              providerConfig._disabledModels.push({ ...removed, _source: "models" });
            }
          }
        }
      } else {
        // Enable model: restore from _disabledModels to original array
        const idx = providerConfig._disabledModels.findIndex((m: any) => m.id === modelId);
        if (idx !== -1) {
          const [restored] = providerConfig._disabledModels.splice(idx, 1);
          const source = restored._source || "additionalModels";
          delete restored._source;

          if (source === "models") {
            if (!Array.isArray(providerConfig.models)) providerConfig.models = [];
            if (!providerConfig.models.some((m: any) => m.id === modelId)) {
              providerConfig.models.push(restored);
            }
          } else {
            if (!Array.isArray(providerConfig.additionalModels)) providerConfig.additionalModels = [];
            if (!providerConfig.additionalModels.some((m: any) => m.id === modelId)) {
              providerConfig.additionalModels.push(restored);
            }
          }
        }
      }
    }

    this.writeRawConfig(root);
    await this.reloadDaemon();
  }

  isModelBlocked(providerId: string, modelId?: string): boolean {
    const root = this.readRawConfig();
    const providerConfig = root?.agents?.providers?.[providerId];
    if (!providerConfig) return false;

    if (providerConfig.enabled === false) {
      return true;
    }

    if (!modelId) {
      return false;
    }

    if (Array.isArray(providerConfig._disabledModels)) {
      return providerConfig._disabledModels.some((m: any) => m.id === modelId);
    }

    return false;
  }
}
