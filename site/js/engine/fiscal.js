(function () {
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

    function debtProjectionForInterest({ budgetCapacity, primaryBalance, debtPrincipal, interestRate }) {
      const debtService = roundCurrency(debtPrincipal * (Math.max(0, interestRate) / 100));
      const effectiveBalance = roundCurrency(primaryBalance - debtService);
      const surplusForRepayment = Math.max(effectiveBalance, 0);
      const repaymentShareLimit = roundCurrency(surplusForRepayment * DEBT_RULES.repaymentShare);
      const maxDebtPaydown = roundCurrency(debtPrincipal * DEBT_RULES.maxDebtPaydownRate);
      const debtRepayment = Math.min(repaymentShareLimit, maxDebtPaydown, debtPrincipal);
      const deficitBorrowing = Math.max(-effectiveBalance, 0);
      const nextDebtPrincipal = Math.max(roundCurrency(debtPrincipal + deficitBorrowing - debtRepayment), 0);
      const nextDebtPercent = budgetCapacity > 0 ? roundPercent((nextDebtPrincipal / budgetCapacity) * 100) : 0;
      const debtChange = roundCurrency(nextDebtPrincipal - debtPrincipal);
      return {
        debtService,
        effectiveBalance,
        repaymentShareLimit,
        maxDebtPaydown,
        debtRepayment,
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
      const preliminaryProjection = debtProjectionForInterest({ budgetCapacity, primaryBalance, debtPrincipal, interestRate: preliminaryInterestRate });
      const debtTrendRisk = debtTrendRiskForChange(debtPercent, preliminaryProjection.nextDebtPercent);
      const computedInterestRate = Math.max(0, roundPercent(preliminaryInterestRate + debtTrendRisk));
      const interestRateAdjustment = roundPercent(national.interestRateAdjustment);
      const interestRate = Math.max(0, roundPercent(computedInterestRate + interestRateAdjustment));
      const projection = debtProjectionForInterest({ budgetCapacity, primaryBalance, debtPrincipal, interestRate });
      return {
        budgetCapacity,
        budgetExpenditure,
        primaryBalance,
        debtPercent: roundPercent(debtPercent),
        debtPrincipal,
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
        deficitBorrowing: fiscal.deficitBorrowing,
        nextDebtPrincipal: fiscal.nextDebtPrincipal,
        nextDebtPercent: fiscal.nextDebtPercent,
        debtChange: fiscal.debtChange
      };
    }

    function recalculateBudgets(data, options = {}) {
      const shouldUpdateDebt = options.updateDebt === true;
      for (const id of Object.keys(data.national || {})) {
        const national = data.national[id];
        const budgetCapacity = calculateBudgetForNation(data, id, { version: options.budgetFormulaVersion });
        if (budgetCapacity === null) continue;
        national.budgetCapacity = budgetCapacity;
        let fiscal = calculateFiscalForNation(data, id, { budgetCapacity });
        if (!fiscal) continue;
        applyFiscalFields(national, fiscal);
        if (shouldUpdateDebt) {
          national.debt = fiscal.nextDebtPercent;
          fiscal = calculateFiscalForNation(data, id, { budgetCapacity });
          if (fiscal) applyFiscalFields(national, fiscal);
        }
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
