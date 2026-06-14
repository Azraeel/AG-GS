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
      governanceMetrics,
      calculateBudgetBreakdownForNation
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

    function governmentalEfficiencyRiskForPercent(efficiencyPercent) {
      const efficiency = number(efficiencyPercent, 100);
      if (efficiency < 50) return 5;
      if (efficiency < 70) return 4;
      if (efficiency < 85) return 3;
      if (efficiency < 95) return 2;
      if (efficiency < 99.99) return 1;
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

    function serviceRateFromStoredDebt(national, debtPrincipal, interestRate) {
      const storedServiceRate = number(national.debtServiceRate, null);
      if (storedServiceRate !== null && storedServiceRate >= 0) return roundPercent(storedServiceRate);
      if (debtPrincipal <= 0) return 0;
      const storedDebtService = number(national.debtService, null);
      if (storedDebtService !== null && storedDebtService > 0) return roundPercent((storedDebtService / debtPrincipal) * 100);
      return roundPercent(interestRate);
    }

    function debtProjectionForRate({ budgetCapacity, primaryBalance, debtPrincipal, debtServiceRate, treasuryReserve }) {
      const debtService = roundCurrency(debtPrincipal * (Math.max(0, debtServiceRate) / 100));
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

    function nextDebtServiceRateForProjection({ debtPrincipal, debtServiceRate, interestRate, debtRepayment, deficitBorrowing, nextDebtPrincipal }) {
      if (nextDebtPrincipal <= 0) return 0;
      const repriceShare = Math.max(0, Math.min(1, number(DEBT_RULES.annualServiceRateRepriceShare, 0.2)));
      const remainingOldDebt = Math.max(roundCurrency(debtPrincipal - debtRepayment), 0);
      const repricedOldRate = debtServiceRate + (interestRate - debtServiceRate) * repriceShare;
      const weightedServiceCost = remainingOldDebt * repricedOldRate + Math.max(0, deficitBorrowing) * interestRate;
      return roundPercent(weightedServiceCost / nextDebtPrincipal);
    }

    function calculateFiscalForNation(data, id, options = {}) {
      const national = data.national?.[id];
      if (!national) return null;
      const trade = data.trade?.[id] || {};
      const military = data.military?.[id] || {};
      const industrial = data.industrial?.[id] || {};
      const budgetCapacity = roundCurrency(options.budgetCapacity ?? national.budgetCapacity);
      const budgetExpenditure = roundCurrency(options.budgetExpenditure ?? national.effectiveBudgetExpenditure ?? national.budgetExpenditure);
      const storedDebtPercent = Math.max(0, number(national.debt, 0));
      const storedDebtPrincipal = number(national.debtPrincipal, null);
      const debtPrincipal = storedDebtPrincipal !== null && storedDebtPrincipal > 0
        ? roundCurrency(storedDebtPrincipal)
        : roundCurrency(budgetCapacity * (storedDebtPercent / 100));
      const debtPercent = budgetCapacity > 0 ? roundPercent((debtPrincipal / budgetCapacity) * 100) : storedDebtPercent;
      const treasuryReserve = Math.max(0, roundCurrency(national.treasuryReserve));
      const primaryBalance = roundCurrency(budgetCapacity - budgetExpenditure);
      const governance = governanceMetrics(national);
      const debtRisk = debtRiskForPercent(debtPercent);
      const stabilityRisk = stabilityRiskForPercent(national.governmentalStability);
      const healthRisk = HEALTH_INTEREST_RISK[national.economicHealth] || 0;
      const corruptionRisk = corruptionRiskForPercent(governance.governmentalCorruption);
      const governmentalEfficiencyRisk = governmentalEfficiencyRiskForPercent(governance.governmentalEfficiency);
      const deficitRisk = deficitRiskForBalance(primaryBalance, budgetCapacity);
      const sanctionsRisk = sanctionsRiskForLevel(trade.sanctionsLevel || "None");
      const mobilizationRisk = mobilizationRiskForLevel(military.mobilizationLevel || industrial.mobilizationLevel || "None");
      const tradeBalanceRisk = tradeBalanceRiskForBalance(trade.tradeBalance, budgetCapacity);
      const preliminaryInterestRate = Math.max(0, roundPercent(DEBT_RULES.baseInterestRate + debtRisk + stabilityRisk + healthRisk + corruptionRisk + governmentalEfficiencyRisk + deficitRisk + sanctionsRisk + mobilizationRisk + tradeBalanceRisk));
      const preliminaryProjection = debtProjectionForRate({ budgetCapacity, primaryBalance, debtPrincipal, treasuryReserve, debtServiceRate: preliminaryInterestRate });
      const debtTrendRisk = debtTrendRiskForChange(debtPercent, preliminaryProjection.nextDebtPercent);
      const computedInterestRate = Math.max(0, roundPercent(preliminaryInterestRate + debtTrendRisk));
      const interestRateAdjustment = roundPercent(national.interestRateAdjustment);
      const interestRate = Math.max(0, roundPercent(computedInterestRate + interestRateAdjustment));
      const debtServiceRate = serviceRateFromStoredDebt(national, debtPrincipal, interestRate);
      const projection = debtProjectionForRate({ budgetCapacity, primaryBalance, debtPrincipal, treasuryReserve, debtServiceRate });
      const nextDebtServiceRate = nextDebtServiceRateForProjection({
        debtPrincipal,
        debtServiceRate,
        interestRate,
        debtRepayment: projection.debtRepayment,
        deficitBorrowing: projection.deficitBorrowing,
        nextDebtPrincipal: projection.nextDebtPrincipal
      });
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
        debtServiceRate,
        debtRisk,
        stabilityRisk,
        healthRisk,
        corruptionRisk,
        governmentalEfficiencyRisk,
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
        nextDebtServiceRate,
        repaymentShare: DEBT_RULES.repaymentShare * 100,
        maxDebtPaydownRate: DEBT_RULES.maxDebtPaydownRate * 100
      };
    }

    function applyFiscalFields(national, fiscal) {
      national.primaryBalance = fiscal.primaryBalance;
      national.debt = fiscal.debtPercent;
      national.debtPrincipal = fiscal.debtPrincipal;
      national.treasuryReserve = fiscal.treasuryReserve;
      national.computedInterestRate = fiscal.computedInterestRate;
      national.interestRateAdjustment = fiscal.interestRateAdjustment;
      national.interestRate = fiscal.interestRate;
      national.debtServiceRate = fiscal.debtServiceRate;
      national.debtRisk = fiscal.debtRisk;
      national.stabilityRisk = fiscal.stabilityRisk;
      national.healthRisk = fiscal.healthRisk;
      national.corruptionRisk = fiscal.corruptionRisk;
      national.governmentalEfficiencyRisk = fiscal.governmentalEfficiencyRisk;
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
      national.projectedDebtServiceRate = fiscal.nextDebtServiceRate;
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
        debtServiceRate: fiscal.debtServiceRate,
        debtService: fiscal.debtService,
        effectiveBalance: fiscal.effectiveBalance,
        repayment: fiscal.debtRepayment,
        treasuryDeposit: fiscal.treasuryDeposit,
        treasuryDrawdown: fiscal.treasuryDrawdown,
        nextTreasuryReserve: fiscal.nextTreasuryReserve,
        deficitBorrowing: fiscal.deficitBorrowing,
        nextDebtPrincipal: fiscal.nextDebtPrincipal,
        nextDebtPercent: fiscal.nextDebtPercent,
        nextDebtServiceRate: fiscal.nextDebtServiceRate,
        debtChange: fiscal.debtChange
      };
    }

    function archivedNationIds(data) {
      return new Set(data.meta?.archivedNationIds || []);
    }

    function recalculateBudgets(data, options = {}) {
      const shouldUpdateDebt = options.updateDebt === true;
      const archived = archivedNationIds(data);
      for (const id of Object.keys(data.national || {})) {
        if (archived.has(id)) continue;
        const national = data.national[id];
        const budgetBreakdown = calculateBudgetBreakdownForNation(data, id, {
          version: options.budgetFormulaVersion,
          tariffFormulaVersion: options.tariffFormulaVersion
        });
        const budgetCapacity = budgetBreakdown?.budgetCapacity ?? null;
        if (budgetCapacity === null) continue;
        national.budgetCapacity = budgetCapacity;
        national.wartimeBudgetPeakBonus = Math.max(0, roundCurrency(budgetBreakdown.wartimeBudgetPeakBonus));
        national.wartimeBudgetBonus = Math.max(0, roundCurrency(budgetBreakdown.wartimeBudgetBonus));
        national.wartimeBudgetAutoExpenditure = Math.max(0, roundCurrency(budgetBreakdown.wartimeBudgetAutoExpenditure));
        national.wartimeBudgetHeadroom = Math.max(0, roundCurrency(budgetBreakdown.wartimeBudgetHeadroom));
        national.effectiveBudgetExpenditure = roundCurrency(budgetBreakdown.effectiveBudgetExpenditure ?? number(national.budgetExpenditure, 0));
        national.mobilizationEffectiveness = roundPercent(budgetBreakdown.mobilizationEffectiveness);
        national.mobilizationAbility = roundPercent(budgetBreakdown.mobilizationAbility);
        national.mobilizationEnduranceYears = roundPercent(budgetBreakdown.mobilizationEnduranceYears);
        national.urbanStrain = roundPercent(budgetBreakdown.urbanStrain?.urbanStrain || 0);
        national.urbanCapacity = roundPercent(budgetBreakdown.urbanStrain?.urbanCapacity || 0);
        national.urbanPressure = roundPercent(budgetBreakdown.urbanStrain?.urbanPressure || 0);
        national.mobilizedBudgetCapacity = roundCurrency(budgetCapacity + national.wartimeBudgetBonus);
        let fiscal = calculateFiscalForNation(data, id, { budgetCapacity, budgetExpenditure: national.effectiveBudgetExpenditure });
        if (!fiscal) continue;
        applyFiscalFields(national, fiscal);
        if (shouldUpdateDebt) {
          national.debtPrincipal = fiscal.nextDebtPrincipal;
          national.debt = fiscal.nextDebtPercent;
          national.debtServiceRate = fiscal.nextDebtServiceRate;
          national.treasuryReserve = fiscal.nextTreasuryReserve;
          fiscal = calculateFiscalForNation(data, id, { budgetCapacity, budgetExpenditure: national.effectiveBudgetExpenditure });
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
