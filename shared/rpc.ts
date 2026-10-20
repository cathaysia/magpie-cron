import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";
import { PluginConfigSchema, ProviderInfoSchema, ScheduleRuleSchema } from "./types";

export const getRulesRpc = defineRpc({
  name: "magie-cron.get-rules",
  input: z.object({}),
  output: z.object({
    rules: z.array(ScheduleRuleSchema),
  }),
});

export const saveRulesRpc = defineRpc({
  name: "magie-cron.save-rules",
  input: z.object({
    rules: z.array(ScheduleRuleSchema),
  }),
  output: z.object({
    success: z.boolean(),
  }),
});

export const triggerRuleRpc = defineRpc({
  name: "magie-cron.trigger-rule",
  input: z.object({
    ruleId: z.string(),
  }),
  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
});

export const getProvidersRpc = defineRpc({
  name: "magie-cron.get-providers",
  input: z.object({}),
  output: z.object({
    providers: z.array(ProviderInfoSchema),
  }),
});

export const toggleModelStatusRpc = defineRpc({
  name: "magie-cron.toggle-model-status",
  input: z.object({
    provider: z.string(),
    modelId: z.string(),
    disabled: z.boolean(),
  }),
  output: z.object({
    success: z.boolean(),
  }),
});
