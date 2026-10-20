import { CronExpressionParser } from "cron-parser";
import { ScheduleRule } from "../shared/types";
import { Storage } from "./storage";
import { PaseoConfigManager } from "./paseo-config";

export class CronEngine {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number = 30000; // check every 30s
  private nextRunMap: Map<string, Date> = new Map();

  constructor(
    private storage: Storage,
    private configManager: PaseoConfigManager
  ) {}

  start() {
    this.refreshNextRuns();
    this.timer = setInterval(() => {
      this.tick();
    }, this.intervalMs);
    console.log("[magie-cron] Cron engine started");
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[magie-cron] Cron engine stopped");
    }
  }

  refreshNextRuns() {
    const rules = this.storage.getRules();
    const now = new Date();

    for (const rule of rules) {
      if (!rule.enabled) {
        this.nextRunMap.delete(rule.id);
        continue;
      }
      try {
        const interval = CronExpressionParser.parse(rule.cron, { currentDate: now });
        const next = interval.next().toDate();
        this.nextRunMap.set(rule.id, next);
      } catch (e) {
        console.error(`[magie-cron] Invalid cron expression for rule ${rule.id} ("${rule.cron}"):`, e);
      }
    }
  }

  async tick() {
    const now = new Date();
    const rules = this.storage.getRules();

    for (const rule of rules) {
      if (!rule.enabled) continue;

      let nextRun = this.nextRunMap.get(rule.id);
      if (!nextRun) {
        try {
          const interval = CronExpressionParser.parse(rule.cron, { currentDate: now });
          nextRun = interval.next().toDate();
          this.nextRunMap.set(rule.id, nextRun);
        } catch {
          continue;
        }
      }

      if (now >= nextRun) {
        console.log(`[magie-cron] Rule ${rule.id} (${rule.name}) triggered at ${now.toISOString()}`);
        await this.executeRule(rule);

        try {
          const interval = CronExpressionParser.parse(rule.cron, { currentDate: now });
          this.nextRunMap.set(rule.id, interval.next().toDate());
        } catch {}

        this.storage.updateRule(rule.id, { lastTriggeredAt: now.toISOString() });
      }
    }
  }

  async executeRule(rule: ScheduleRule) {
    const shouldDisable = rule.action === "disable";
    console.log(
      `[magie-cron] Executing rule ${rule.name}: ${rule.action} on ${rule.provider}${
        rule.modelId ? ` (model: ${rule.modelId})` : ""
      }`
    );

    await this.configManager.setModelStatus(rule.provider, rule.modelId, shouldDisable);

    // If durationMinutes is defined, schedule auto-revert
    if (rule.durationMinutes && rule.durationMinutes > 0) {
      const revertMs = rule.durationMinutes * 60 * 1000;
      console.log(`[magie-cron] Scheduling auto-revert for rule ${rule.name} in ${rule.durationMinutes} minutes`);
      setTimeout(async () => {
        console.log(`[magie-cron] Auto-reverting rule ${rule.name} (re-enabling)`);
        await this.configManager.setModelStatus(rule.provider, rule.modelId, !shouldDisable);
      }, revertMs);
    }
  }
}
