import { onRequest, onProvider, isCronActive, isRuleCurrentlyBlocking } from "./middleware.js";

/**
 * OpenCode / Magpie Plugin Entry
 */
export default async function plugin(input, options) {
  return {
    // OpenCode plugin hooks
    config(config) {
      // Configuration hook
    },
  };
}

export { onRequest, onProvider, isCronActive, isRuleCurrentlyBlocking };
