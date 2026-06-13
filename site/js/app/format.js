(function () {
  window.AGGS_APP_FORMAT = function createFormat(Engine) {
    const decimalPercentFields = new Set(["national.taxRate"]);
    const precisePercentFields = new Set(["national.governmentalEfficiency", "national.effectiveGovernmentalEfficiency"]);
    const wholePercentFields = new Set([
      "national.debt",
      "national.computedInterestRate",
      "national.interestRateAdjustment",
      "national.interestRate",
      "national.debtServiceRate",
      "national.projectedDebt",
      "national.projectedDebtServiceRate",
      "national.debtRisk",
      "national.stabilityRisk",
      "national.healthRisk",
      "national.corruptionRisk",
      "national.governmentalEfficiencyRisk",
      "national.deficitRisk",
      "national.sanctionsRisk",
      "national.mobilizationRisk",
      "national.tradeBalanceRisk",
      "national.debtTrendRisk",
      "national.literacyRate",
      "national.urbanizationRate",
      "national.industrialSophistication",
      "national.industrialSophisticationBaseline"
    ]);

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function safeText(value, fallback = "Unknown") {
      return escapeHtml(value === null || value === undefined || value === "" ? fallback : value);
    }

    function safeColor(value) {
      const color = String(value || "").trim();
      return /^#[0-9a-f]{3,8}$/i.test(color) ? color : "#8a94a6";
    }

    function safeStatus(value, tone = "") {
      const className = tone ? ` ${escapeHtml(tone)}` : "";
      return `<span class="status${className}">${safeText(value)}</span>`;
    }

    function fmtNumber(value) {
      return value === null || value === undefined || value === "" ? "Unknown" : Number(value).toLocaleString("en-US");
    }

    function fmtYear(value) {
      const year = Number(value);
      return Number.isFinite(year) ? String(Math.trunc(year)) : "Unknown";
    }

    function fmtCompact(value) {
      if (value === null || value === undefined || value === "") return "Unknown";
      return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
    }

    function fmtDateTime(value) {
      if (!value) return "Not recorded";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "Not recorded";
      return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
    }

    function fmtPercent(value) {
      if (value === null || value === undefined || value === "") return "Unknown";
      const percent = Engine.number(value, NaN);
      if (!Number.isFinite(percent)) return `${value}%`;
      return `${Math.floor(percent).toLocaleString("en-US")}%`;
    }

    function fmtDecimalPercent(value) {
      if (value === null || value === undefined || value === "") return "Unknown";
      const percent = Engine.number(value, 0) * 100;
      return `${Number(percent.toFixed(4)).toLocaleString("en-US", { maximumFractionDigits: 4 })}%`;
    }

    function fmtPrecisePercent(value) {
      if (value === null || value === undefined || value === "") return "Unknown";
      const percent = Engine.number(value, NaN);
      if (!Number.isFinite(percent)) return `${value}%`;
      return `${Number(percent.toFixed(4)).toLocaleString("en-US", { maximumFractionDigits: 4 })}%`;
    }

    function isPercentText(value) {
      return typeof value === "string" && value.trim().endsWith("%");
    }

    function fmtSigned(value) {
      if (value === null || value === undefined || value === "") return "Unknown";
      return value > 0 ? `+${fmtNumber(value)}` : fmtNumber(value);
    }

    function fmtCost(value) {
      return value === null || value === undefined ? "Unknown" : Number(value).toLocaleString("en-US", { maximumFractionDigits: 6 });
    }

    function fmtHistoryValue(value) {
      if (value === null || value === undefined || value === "") return "Unknown";
      const numeric = typeof value === "number" || (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)));
      if (!numeric) return String(value);
      return Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 });
    }

    function fieldKey(dataset, path) {
      return `${dataset}.${path}`;
    }

    function isDecimalPercentField(dataset, path) {
      return decimalPercentFields.has(fieldKey(dataset, path));
    }

    function isDecimalPercentChangeKey(key) {
      return decimalPercentFields.has(key);
    }

    function isPrecisePercentChangeKey(key) {
      return precisePercentFields.has(key);
    }

    function isWholePercentChangeKey(key) {
      return wholePercentFields.has(key);
    }

    function trimInputNumber(value, maximumFractionDigits = 6) {
      const number = Number(value);
      return Number.isFinite(number) ? String(Number(number.toFixed(maximumFractionDigits))) : "";
    }

    function editFieldValue(dataset, path, value) {
      if (!isDecimalPercentField(dataset, path)) return value ?? "";
      return trimInputNumber(Engine.number(value, 0) * 100);
    }

    function historyFieldValue(dataset, path, value) {
      const key = fieldKey(dataset, path);
      if (isDecimalPercentChangeKey(key)) return fmtDecimalPercent(value);
      if (isPrecisePercentChangeKey(key)) return fmtPrecisePercent(value);
      if (isWholePercentChangeKey(key)) return fmtPercent(fmtHistoryValue(value));
      return value;
    }

    function fmtHistoryChangeValue(key, value) {
      if (isDecimalPercentChangeKey(key)) return isPercentText(value) ? fmtHistoryValue(value) : fmtDecimalPercent(value);
      if (isPrecisePercentChangeKey(key)) return isPercentText(value) ? fmtHistoryValue(value) : fmtPrecisePercent(value);
      if (isWholePercentChangeKey(key)) return isPercentText(value) ? fmtHistoryValue(value) : fmtPercent(fmtHistoryValue(value));
      return fmtHistoryValue(value);
    }

    function fmtHistoryDelta(key, value) {
      if (isDecimalPercentChangeKey(key)) {
        const percentDelta = Engine.number(value, 0) * 100;
        return `${fmtSigned(Number(percentDelta.toFixed(4)))} pts`;
      }
      if (isPrecisePercentChangeKey(key)) return `${fmtSigned(value)} pts`;
      if (isWholePercentChangeKey(key)) return `${fmtSigned(value)} pts`;
      return fmtSigned(value);
    }

    return {
      escapeHtml,
      safeText,
      safeColor,
      safeStatus,
      fmtNumber,
      fmtYear,
      fmtCompact,
      fmtDateTime,
      fmtPercent,
      fmtDecimalPercent,
      fmtPrecisePercent,
      isPercentText,
      fmtSigned,
      fmtCost,
      fmtHistoryValue,
      fieldKey,
      isDecimalPercentField,
      isDecimalPercentChangeKey,
      isPrecisePercentChangeKey,
      isWholePercentChangeKey,
      trimInputNumber,
      editFieldValue,
      historyFieldValue,
      fmtHistoryChangeValue,
      fmtHistoryDelta
    };
  };
})();
