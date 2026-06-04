(function () {
  window.AGGS_ENGINE_MODULES = window.AGGS_ENGINE_MODULES || {};

  window.AGGS_ENGINE_MODULES.createTradePolicyHelpers = function createTradePolicyHelpers(deps) {
    const { number, clamp, transitModes = ["Open", "Block Land", "Block Maritime", "Block All"] } = deps;

    function cloneTargetedTariffs(targetedTariffs = {}) {
      return Object.fromEntries(
        Object.entries(targetedTariffs || {}).map(([importerId, overrides]) => [
          importerId,
          Object.fromEntries(Object.entries(overrides || {}).map(([exporterId, value]) => [exporterId, clamp(number(value, 0), 0, 50)]))
        ])
      );
    }

    function cloneExportAnchors(exportAnchors = {}) {
      return Object.fromEntries(
        Object.entries(exportAnchors || {}).map(([exporterId, anchors]) => [
          exporterId,
          Object.fromEntries(Object.entries(anchors || {}).map(([importerId, value]) => [importerId, clamp(number(value, 0), 0, 95)]))
        ])
      );
    }

    function cloneImportAnchors(importAnchors = {}) {
      return Object.fromEntries(
        Object.entries(importAnchors || {}).map(([importerId, anchors]) => [
          importerId,
          Object.fromEntries(Object.entries(anchors || {}).map(([exporterId, value]) => [exporterId, clamp(number(value, 0), 0, 95)]))
        ])
      );
    }

    function normalizeLanePolicy(policy = {}) {
      const sanctionsLevel = ["None", "Light", "Moderate", "Heavy", "Total"].includes(policy.sanctionsLevel) ? policy.sanctionsLevel : "None";
      return {
        embargo: policy.embargo === true,
        sanctionsLevel
      };
    }

    function normalizeTransitMode(value) {
      return transitModes.includes(value) ? value : "Open";
    }

    function cloneLanePolicies(lanePolicies = {}) {
      return Object.fromEntries(
        Object.entries(lanePolicies || {}).map(([importerId, policies]) => [
          importerId,
          Object.fromEntries(Object.entries(policies || {}).map(([exporterId, policy]) => [exporterId, normalizeLanePolicy(policy)]))
        ])
      );
    }

    function cloneTransitPolicies(transitPolicies = {}) {
      return Object.fromEntries(
        Object.entries(transitPolicies || {}).map(([blockerId, policies]) => [
          blockerId,
          Object.fromEntries(Object.entries(policies || {}).map(([targetId, value]) => [targetId, normalizeTransitMode(value)]))
        ])
      );
    }

    function normalizeChokepointStatus(value) {
      return ["Open", "Disrupted", "Blockaded"].includes(value) ? value : "Open";
    }

    function normalizeChokepointControl(control = {}) {
      const status = normalizeChokepointStatus(control.status);
      const severity = status === "Blockaded"
        ? 100
        : status === "Disrupted"
          ? clamp(number(control.severity, 35), 0, 100)
          : 0;
      const targeted = Object.fromEntries(
        Object.entries(control.targeted || {}).map(([nationId, targetControl]) => [nationId, normalizeChokepointControl(targetControl)])
      );
      return { status, severity, targeted };
    }

    function cloneChokepoints(chokepoints = {}) {
      return Object.fromEntries(
        Object.entries(chokepoints || {}).map(([id, control]) => [id, normalizeChokepointControl(control)])
      );
    }

    return {
      cloneTargetedTariffs,
      cloneExportAnchors,
      cloneImportAnchors,
      normalizeLanePolicy,
      normalizeTransitMode,
      cloneLanePolicies,
      cloneTransitPolicies,
      normalizeChokepointControl,
      cloneChokepoints
    };
  };
})();
