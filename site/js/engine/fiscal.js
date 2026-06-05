(function () {
  const TRADE_V4_NORMALIZED_BALANCE_MIN = 10000;
  const TRADE_V4_NORMALIZED_BALANCE_RATIO = 0.08;

  window.AGGS_ENGINE_MODULES = window.AGGS_ENGINE_MODULES || {};

  window.AGGS_ENGINE_MODULES.createFiscal = function createFiscal(deps) {
    const {
      number,
      roundCurrency,
      roundPercent,
      DEBT_RULES,
      HEALTH_INTEREST_RISK,
      SANCTIONS_INTEREST_RISK,
      MOBILIZATION_INTEREST_RISK,
      calculateBudgetForNation
    } = deps;

    function debtRiskForPercent(debtPercent) {
      const debt = number(debtPercent, 0);
      if (debt >= 200) return 10;
      if (debt >= 100) return 6;
      if (debt >= 50) return 3;
      if (debt >= 25) return 1;
      return 0;
    }

    function stabilityRiskForPercent(stabilityPercent) {
      const stability = number(stabilityPercent, 100);
      if (stability < 40) return 3;
      if (stability < 60) return 2;
      if (stability < 75) return 1;
      return 0;
    }

    function corruptionRiskForPercent(corruptionPercent) {
      const corruption = number(corruptionPercent, 0);
      if (corruption >= 75) return 3;
      if (corruption >= 50) return 2;
      if (corruption >= 30) return 1;
      return 0;
    }

    function deficitRiskForBalance(primaryBalance, budgetCapacity) {
      if (primaryBalance >= 0) return 0;
      if (budgetCapacity <= 0) return 4;
      const deficitRatio = (Math.abs(primaryBalance) / budgetCapacity) * 100;
      if (deficitRatio >= 30) return 4;
      if (deficitRatio >= 15) return 3;
      if (deficitRatio >= 5) return 2;
      return 1;
    }

    function sanctionsRiskForLevel(level) {
      return SANCTIONS_INTEREST_RISK[level] || 0;
    }

    function mobilizationRiskForLevel(level) {
      return MOBILIZATION_INTEREST_RISK[level] || 0;
    }

    function tradeBalanceRiskForBalance(tradeBalance, budgetCapacity) {
      if (budgetCapacity <= 0) return 0;
      const tradeRatio = (number(tradeBalance, 0) / budgetCapacity) * 100;
      if (tradeRatio >= 15) return -1;
      if (tradeRatio <= -50) return 3;
      if (tradeRatio <= -25) return 2;
      if (tradeRatio <= -10) return 1;
      return 0;
    }

    function debtTrendRiskForChange(currentDebtPercent, nextDebtPercent) {
      const trend = number(nextDebtPercent, currentDebtPercent) - number(currentDebtPercent, 0);
      if (trend <= -1) return -1;
      if (trend <= 1) return 0;
      if (trend <= 10) return 1;
      if (trend <= 25) return 2;
      return 3;
    }

    function debtProjectionForInterest({ budgetCapacity, primaryBalance, debtPrincipal, interestRate, treasuryReserve }) {
      const debtService = roundCurrency(debtPrincipal * (Math.max(0, interestRate) / 100));
      const effectiveBalance = roundCurrency(primaryBalance - debtService);
      const surplusForRepayment = Math.max(effectiveBalance, 0);
      const repaymentShareLimit = roundCurrency(surplusForRepayment * DEBT_RULES.repaymentShare);
      const maxDebtPaydown = roundCurrency(debtPrincipal * DEBT_RULES.maxDebtPaydownRate);
      const debtRepayment = Math.min(repaymentShareLimit, maxDebtPaydown, debtPrincipal);
      const treasuryDeposit = Math.max(roundCurrency(surplusForRepayment - debtRepayment), 0);
      const deficitBeforeReserve = Math.max(-effectiveBalance, 0);
      const treasuryDrawdown = Math.min(Math.max(roundCurrency(treasuryReserve), 0), deficitBeforeReserve);
      const deficitBorrowing = Math.max(roundCurrency(deficitBeforeReserve - treasuryDrawdown), 0);
      const treasuryChange = roundCurrency(treasuryDeposit - treasuryDrawdown);
      const nextTreasuryReserve = Math.max(roundCurrency(treasuryReserve + treasuryChange), 0);
      const nextDebtPrincipal = Math.max(roundCurrency(debtPrincipal + deficitBorrowing - debtRepayment), 0);
      const nextDebtPercent = budgetCapacity > 0 ? roundPercent((nextDebtPrincipal / budgetCapacity) * 100) : 0;
      const debtChange = roundCurrency(nextDebtPrincipal - debtPrincipal);
      return {
        debtService,
        effectiveBalance,
        repaymentShareLimit,
        maxDebtPaydown,
        debtRepayment,
        treasuryDeposit,
        deficitBeforeReserve,
        treasuryDrawdown,
        treasuryChange,
        nextTreasuryReserve,
        deficitBorrowing,
        nextDebtPrincipal,
        nextDebtPercent,
        debtChange
      };
    }

    function calculateFiscalForNation(data, id, options = {}) {
      const national = data.national?.[id];
      if (!national) return null;
      const trade = data.trade?.[id] || {};
      const military = data.military?.[id] || {};
      const industrial = data.industrial?.[id] || {};
      const budgetCapacity = roundCurrency(options.budgetCapacity ?? national.budgetCapacity);
      const budgetExpenditure = roundCurrency(options.budgetExpenditure ?? national.budgetExpenditure);
      const debtPercent = Math.max(0, number(national.debt, 0));
      const debtPrincipal = roundCurrency(budgetCapacity * (debtPercent / 100));
      const treasuryReserve = Math.max(0, roundCurrency(national.treasuryReserve));
      const primaryBalance = roundCurrency(budgetCapacity - budgetExpenditure);
      const debtRisk = debtRiskForPercent(debtPercent);
      const stabilityRisk = stabilityRiskForPercent(national.governmentalStability);
      const healthRisk = HEALTH_INTEREST_RISK[national.economicHealth] || 0;
      const corruptionRisk = corruptionRiskForPercent(national.corruption);
      const deficitRisk = deficitRiskForBalance(primaryBalance, budgetCapacity);
      const sanctionsRisk = sanctionsRiskForLevel(trade.sanctionsLevel || "None");
      const mobilizationRisk = mobilizationRiskForLevel(military.mobilizationLevel || industrial.mobilizationLevel || "None");
      const tradeBalanceRisk = tradeBalanceRiskForBalance(trade.tradeBalance, budgetCapacity);
      const preliminaryInterestRate = Math.max(0, roundPercent(DEBT_RULES.baseInterestRate + debtRisk + stabilityRisk + healthRisk + corruptionRisk + deficitRisk + sanctionsRisk + mobilizationRisk + tradeBalanceRisk));
      const preliminaryProjection = debtProjectionForInterest({ budgetCapacity, primaryBalance, debtPrincipal, treasuryReserve, interestRate: preliminaryInterestRate });
      const debtTrendRisk = debtTrendRiskForChange(debtPercent, preliminaryProjection.nextDebtPercent);
      const computedInterestRate = Math.max(0, roundPercent(preliminaryInterestRate + debtTrendRisk));
      const interestRateAdjustment = roundPercent(national.interestRateAdjustment);
      const interestRate = Math.max(0, roundPercent(computedInterestRate + interestRateAdjustment));
      const projection = debtProjectionForInterest({ budgetCapacity, primaryBalance, debtPrincipal, treasuryReserve, interestRate });
      return {
        budgetCapacity,
        budgetExpenditure,
        primaryBalance,
        debtPercent: roundPercent(debtPercent),
        debtPrincipal,
        treasuryReserve,
        computedInterestRate,
        interestRateAdjustment,
        interestRate,
        debtRisk,
        stabilityRisk,
        healthRisk,
        corruptionRisk,
        deficitRisk,
        sanctionsRisk,
        mobilizationRisk,
        tradeBalanceRisk,
        debtTrendRisk,
        debtService: projection.debtService,
        effectiveBalance: projection.effectiveBalance,
        repaymentShareLimit: projection.repaymentShareLimit,
        maxDebtPaydown: projection.maxDebtPaydown,
        debtRepayment: projection.debtRepayment,
        treasuryDeposit: projection.treasuryDeposit,
        deficitBeforeReserve: projection.deficitBeforeReserve,
        treasuryDrawdown: projection.treasuryDrawdown,
        treasuryChange: projection.treasuryChange,
        nextTreasuryReserve: projection.nextTreasuryReserve,
        deficitBorrowing: projection.deficitBorrowing,
        debtChange: projection.debtChange,
        nextDebtPrincipal: projection.nextDebtPrincipal,
        nextDebtPercent: projection.nextDebtPercent,
        repaymentShare: DEBT_RULES.repaymentShare * 100,
        maxDebtPaydownRate: DEBT_RULES.maxDebtPaydownRate * 100
      };
    }

    function applyFiscalFields(national, fiscal) {
      national.primaryBalance = fiscal.primaryBalance;
      national.debtPrincipal = fiscal.debtPrincipal;
      national.treasuryReserve = fiscal.treasuryReserve;
      national.computedInterestRate = fiscal.computedInterestRate;
      national.interestRateAdjustment = fiscal.interestRateAdjustment;
      national.interestRate = fiscal.interestRate;
      national.debtRisk = fiscal.debtRisk;
      national.stabilityRisk = fiscal.stabilityRisk;
      national.healthRisk = fiscal.healthRisk;
      national.corruptionRisk = fiscal.corruptionRisk;
      national.deficitRisk = fiscal.deficitRisk;
      national.sanctionsRisk = fiscal.sanctionsRisk;
      national.mobilizationRisk = fiscal.mobilizationRisk;
      national.tradeBalanceRisk = fiscal.tradeBalanceRisk;
      national.debtTrendRisk = fiscal.debtTrendRisk;
      national.debtService = fiscal.debtService;
      national.budgetBalance = fiscal.effectiveBalance;
      national.debtRepayment = fiscal.debtRepayment;
      national.treasuryDeposit = fiscal.treasuryDeposit;
      national.deficitBeforeReserve = fiscal.deficitBeforeReserve;
      national.treasuryDrawdown = fiscal.treasuryDrawdown;
      national.treasuryChange = fiscal.treasuryChange;
      national.projectedTreasuryReserve = fiscal.nextTreasuryReserve;
      national.deficitBorrowing = fiscal.deficitBorrowing;
      national.debtChange = fiscal.debtChange;
      national.projectedDebt = fiscal.nextDebtPercent;
      national.projectedDebtPrincipal = fiscal.nextDebtPrincipal;
      national.maxDebtPaydown = fiscal.maxDebtPaydown;
      national.repaymentShareLimit = fiscal.repaymentShareLimit;
    }

    function calculateAnnualDebtUpdate(data, id) {
      const fiscal = calculateFiscalForNation(data, id);
      if (!fiscal) return null;
      return {
        debtPrincipal: fiscal.debtPrincipal,
        computedInterestRate: fiscal.computedInterestRate,
        interestRateAdjustment: fiscal.interestRateAdjustment,
        interestRate: fiscal.interestRate,
        debtService: fiscal.debtService,
        effectiveBalance: fiscal.effectiveBalance,
        repayment: fiscal.debtRepayment,
        treasuryDeposit: fiscal.treasuryDeposit,
        treasuryDrawdown: fiscal.treasuryDrawdown,
        nextTreasuryReserve: fiscal.nextTreasuryReserve,
        deficitBorrowing: fiscal.deficitBorrowing,
        nextDebtPrincipal: fiscal.nextDebtPrincipal,
        nextDebtPercent: fiscal.nextDebtPercent,
        debtChange: fiscal.debtChange
      };
    }

    function applyBudgetBalanceTarget(data, id, national, budgetCapacity, targetBalance) {
      let budgetExpenditure = Math.max(0, roundCurrency(budgetCapacity - targetBalance));
      let fiscal = null;
      let best = null;

      function consider(candidateExpenditure) {
        const candidate = Math.max(0, roundCurrency(candidateExpenditure));
        const candidateFiscal = calculateFiscalForNation(data, id, { budgetCapacity, budgetExpenditure: candidate });
        if (!candidateFiscal) return;
        const diff = Math.abs(roundCurrency(candidateFiscal.effectiveBalance - targetBalance));
        if (!best || diff < best.diff) {
          best = { budgetExpenditure: candidate, fiscal: candidateFiscal, diff };
        }
      }

      for (let attempt = 0; attempt < 6; attempt++) {
        fiscal = calculateFiscalForNation(data, id, { budgetCapacity, budgetExpenditure });
        if (!fiscal) return null;
        consider(budgetExpenditure);
        const error = roundCurrency(fiscal.effectiveBalance - targetBalance);
        if (Math.abs(error) <= 1) break;
        budgetExpenditure = Math.max(0, roundCurrency(budgetExpenditure + error));
      }
      for (let offset = 1; offset <= 512 && (!best || best.diff > 1); offset++) {
        consider(budgetExpenditure - offset);
        consider(budgetExpenditure + offset);
      }
      if (!best) return null;
      national.budgetExpenditure = best.budgetExpenditure;
      return best.fiscal;
    }

    function normalizeBudgetBalanceTarget(targetBalance, budgetCapacity) {
      const band = Math.max(TRADE_V4_NORMALIZED_BALANCE_MIN, roundCurrency(number(budgetCapacity, 0) * TRADE_V4_NORMALIZED_BALANCE_RATIO));
      return Math.max(-band, Math.min(band, roundCurrency(targetBalance)));
    }

    function recalculateBudgets(data, options = {}) {
      const shouldUpdateDebt = options.updateDebt === true;
      const balanceTargets = data.meta?.tradeV4BudgetBalanceTargets && typeof data.meta.tradeV4BudgetBalanceTargets === "object" && !Array.isArray(data.meta.tradeV4BudgetBalanceTargets)
        ? data.meta.tradeV4BudgetBalanceTargets
        : null;
      const balanceTargetMode = data.meta?.tradeV4BudgetBalanceTargetMode || "";
      const exactBalanceTargets = data.meta?.tradeV4BudgetBalanceExactTargets && typeof data.meta.tradeV4BudgetBalanceExactTargets === "object" && !Array.isArray(data.meta.tradeV4BudgetBalanceExactTargets)
        ? data.meta.tradeV4BudgetBalanceExactTargets
        : {};
      for (const id of Object.keys(data.national || {})) {
        const national = data.national[id];
        const budgetCapacity = calculateBudgetForNation(data, id, {
          version: options.budgetFormulaVersion,
          tariffFormulaVersion: options.tariffFormulaVersion
        });
        if (budgetCapacity === null) continue;
        national.budgetCapacity = budgetCapacity;
        const rawBalanceTarget = balanceTargets ? number(balanceTargets[id], null) : null;
        const balanceTarget = Number.isFinite(rawBalanceTarget) && balanceTargetMode === "normalize" && !exactBalanceTargets[id]
          ? normalizeBudgetBalanceTarget(rawBalanceTarget, budgetCapacity)
          : rawBalanceTarget;
        let fiscal = Number.isFinite(balanceTarget)
          ? applyBudgetBalanceTarget(data, id, national, budgetCapacity, balanceTarget)
          : calculateFiscalForNation(data, id, { budgetCapacity });
        if (!fiscal) continue;
        applyFiscalFields(national, fiscal);
        if (shouldUpdateDebt) {
          national.debt = fiscal.nextDebtPercent;
          national.treasuryReserve = fiscal.nextTreasuryReserve;
          fiscal = calculateFiscalForNation(data, id, { budgetCapacity });
          if (fiscal) applyFiscalFields(national, fiscal);
        }
      }
      if (balanceTargets && data.meta && options.keepTradeV4BudgetBalanceTargets !== true) {
        delete data.meta.tradeV4BudgetBalanceTargets;
        delete data.meta.tradeV4BudgetBalanceTargetMode;
        delete data.meta.tradeV4BudgetBalanceExactTargets;
      }
      return data;
    }

    return {
      calculateFiscalForNation,
      calculateAnnualDebtUpdate,
      recalculateBudgets
    };
  };
})();
