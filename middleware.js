/**
 * magpie-cron gateway middleware
 *
 * Intercepts requests sent to models and rejects them if a cron-scheduled
 * blackout / disabled window is currently active for that model or provider.
 */

// Simple lightweight 5-field cron parser supporting:
// * (any), */n (step), n (exact number), a,b (lists), a-b (ranges)
function parseCronField(field, min, max) {
  const values = new Set();
  const parts = field.split(",");

  for (const part of parts) {
    if (part === "*") {
      for (let i = min; i <= max; i++) values.add(i);
    } else if (part.startsWith("*/")) {
      const step = parseInt(part.slice(2), 10);
      if (!isNaN(step) && step > 0) {
        for (let i = min; i <= max; i += step) values.add(i);
      }
    } else if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.max(min, start); i <= Math.min(max, end); i++) values.add(i);
      }
    } else {
      const val = parseInt(part, 10);
      if (!isNaN(val) && val >= min && val <= max) {
        values.add(val);
      }
    }
  }

  return values;
}

/**
 * Checks if the given date matches the 5-field cron expression (minute hour day-of-month month day-of-week).
 */
export function isCronActive(cronExpr, date = new Date()) {
  if (!cronExpr || typeof cronExpr !== "string") return false;
  const fields = cronExpr.trim().split(/\s+/);
  if (fields.length !== 5) return false;

  const [minField, hourField, domField, monthField, dowField] = fields;

  const curMinute = date.getMinutes();
  const curHour = date.getHours();
  const curDom = date.getDate();
  const curMonth = date.getMonth() + 1; // 1-12
  const curDow = date.getDay(); // 0-6 (0 is Sunday)

  const minutes = parseCronField(minField, 0, 59);
  const hours = parseCronField(hourField, 0, 23);
  const doms = parseCronField(domField, 1, 31);
  const months = parseCronField(monthField, 1, 12);
  const dows = parseCronField(dowField, 0, 6);

  if (!minutes.has(curMinute)) return false;
  if (!hours.has(curHour)) return false;
  if (!doms.has(curDom)) return false;
  if (!months.has(curMonth)) return false;
  if (!dows.has(curDow)) return false;

  return true;
}

/**
 * Check if a rule is currently active, considering durationMinutes
 */
export function isRuleCurrentlyBlocking(rule, now = new Date()) {
  if (!rule || !rule.enabled) return false;
  if (rule.action !== "disable") return false;

  const durationMin = rule.durationMinutes ? parseInt(rule.durationMinutes, 10) : 0;

  // If no duration specified, it is active whenever current minute matches the cron expression
  if (!durationMin || durationMin <= 0) {
    return isCronActive(rule.cron, now);
  }

  // If duration is specified, check if any minute in the last `durationMin` window matched the cron
  // Check in 1-minute steps backwards
  const checkDate = new Date(now.getTime());
  for (let offset = 0; offset < durationMin; offset++) {
    checkDate.setTime(now.getTime() - offset * 60 * 1000);
    if (isCronActive(rule.cron, checkDate)) {
      return true;
    }
  }

  return false;
}

/**
 * Helper to match a target model string against rule (supports exact match or provider/* glob)
 */
function matchesTarget(rule, providerId, modelName) {
  const fullModelId = providerId ? `${providerId}/${modelName}` : modelName;

  // 1. If rule targets provider only: rule.provider matches providerId and no specific modelId
  if (rule.provider && (!rule.modelId || rule.modelId === "*" || rule.modelId === rule.provider)) {
    if (rule.provider === providerId || rule.provider === "*") {
      return true;
    }
  }

  // 2. Specific model matching
  if (rule.modelId) {
    // Model ID may be specified as "provider/model" or bare "model"
    if (rule.modelId === fullModelId || rule.modelId === modelName) {
      return true;
    }
    // Simple wildcard support: "provider/*" or "*model*"
    if (rule.modelId.includes("*")) {
      const regexPattern = "^" + rule.modelId.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&").replace(/\*/g, ".*") + "$";
      const reg = new RegExp(regexPattern);
      if (reg.test(fullModelId) || reg.test(modelName)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Gateway hook: onRequest
 * Intercepts requests before routing
 */
export function onRequest(body, ctx) {
  const options = ctx.options || {};
  const rules = Array.isArray(options.rules) ? options.rules : [];
  if (rules.length === 0) return body;

  const requestedModel = body.model;
  const now = new Date();

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (isRuleCurrentlyBlocking(rule, now)) {
      let providerId = "";
      let modelName = requestedModel;
      if (requestedModel.includes("/")) {
        const parts = requestedModel.split("/");
        providerId = parts[0];
        modelName = parts.slice(1).join("/");
      }

      if (matchesTarget(rule, providerId, modelName)) {
        return ctx.reject(
          403,
          `[magpie-cron] Model '${requestedModel}' is currently disabled by scheduled rule: '${rule.name || rule.cron}'`
        );
      }
    }
  }

  return body;
}

/**
 * Gateway hook: onProvider
 * Intercepts request as it is about to go to a specific provider
 */
export function onProvider(body, ctx) {
  const options = ctx.options || {};
  const rules = Array.isArray(options.rules) ? options.rules : [];
  if (rules.length === 0) return body;

  const now = new Date();
  const provider = ctx.provider;
  if (!provider) return body;

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (isRuleCurrentlyBlocking(rule, now)) {
      if (matchesTarget(rule, provider.id, provider.model)) {
        return ctx.reject(
          403,
          `[magpie-cron] Provider '${provider.id}' model '${provider.model}' is currently disabled by rule '${rule.name || rule.cron}'`
        );
      }
    }
  }

  return body;
}
