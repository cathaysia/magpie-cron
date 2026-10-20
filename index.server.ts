import type { PluginServerContext } from "@getpaseo/plugin/server";
import { Storage } from "./server/storage";
import { PaseoConfigManager } from "./server/paseo-config";
import { CronEngine } from "./server/cron";
import {
  getRulesRpc,
  saveRulesRpc,
  triggerRuleRpc,
  getProvidersRpc,
  toggleModelStatusRpc,
} from "./shared/rpc";

export default function contribute(server: PluginServerContext) {
  const storage = new Storage();
  const configManager = new PaseoConfigManager();
  const cronEngine = new CronEngine(storage, configManager);

  cronEngine.start();

  // Intercept agent creation to enforce disabled model / provider restrictions
  const unregisterBefore = server.before("agent.create", async ({ request }) => {
    const provider = request.config.provider;
    const model = request.config.model;

    if (configManager.isModelBlocked(provider, model)) {
      throw new Error(
        `[magie-cron] Agent creation blocked: provider '${provider}' or model '${model}' is currently scheduled to be disabled.`
      );
    }
  });

  // Handle RPCs
  server.handle(getRulesRpc, async () => {
    const rules = storage.getRules();
    return { rules };
  });

  server.handle(saveRulesRpc, async ({ rules }) => {
    storage.saveRules(rules);
    cronEngine.refreshNextRuns();
    return { success: true };
  });

  server.handle(triggerRuleRpc, async ({ ruleId }) => {
    const rules = storage.getRules();
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) {
      return { success: false, message: "Rule not found" };
    }
    await cronEngine.executeRule(rule);
    return { success: true, message: `Rule '${rule.name}' triggered successfully` };
  });

  server.handle(getProvidersRpc, async () => {
    const providers = configManager.getProviders();
    return { providers };
  });

  server.handle(toggleModelStatusRpc, async ({ provider, modelId, disabled }) => {
    await configManager.setModelStatus(provider, modelId, disabled);
    return { success: true };
  });

  return () => {
    cronEngine.stop();
    unregisterBefore();
  };
}
