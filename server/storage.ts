import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { PluginConfig, PluginConfigSchema, ScheduleRule } from "../shared/types";

export class Storage {
  private configPath: string;

  constructor(customPath?: string) {
    if (customPath) {
      this.configPath = customPath;
    } else {
      const paseoDir = path.join(os.homedir(), ".paseo");
      if (!fs.existsSync(paseoDir)) {
        fs.mkdirSync(paseoDir, { recursive: true });
      }
      this.configPath = path.join(paseoDir, "magie-cron.json");
    }
  }

  load(): PluginConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, "utf-8");
        const parsed = JSON.parse(raw);
        return PluginConfigSchema.parse(parsed);
      }
    } catch (e) {
      console.error("[magie-cron] Failed to read config file, initializing new one:", e);
    }
    return { rules: [] };
  }

  save(config: PluginConfig): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf-8");
    } catch (e) {
      console.error("[magie-cron] Failed to write config file:", e);
      throw e;
    }
  }

  getRules(): ScheduleRule[] {
    return this.load().rules;
  }

  saveRules(rules: ScheduleRule[]): void {
    this.save({ rules });
  }

  updateRule(ruleId: string, patch: Partial<ScheduleRule>): void {
    const rules = this.getRules();
    const idx = rules.findIndex((r) => r.id === ruleId);
    if (idx !== -1) {
      rules[idx] = { ...rules[idx], ...patch };
      this.saveRules(rules);
    }
  }
}
