# AG-GS Stat Cause-Effect Overview

Last verified against the codebase: 2026-06-13

This document explains how website stats currently work, what controls what, and which stats are display-only. It is based on the live client engine files under `site/`, especially `site/engine.js`, `site/js/engine/fiscal.js`, `site/js/engine/trade.js`, `site/js/app/editorView.js`, and `site/js/app/statusTables.js`.

## Reading Rules

- **Editable/raw** means a GM can directly edit the value in the editor or record tools.
- **Derived** means the engine overwrites the value during recalculation.
- **Yearly simulation** means the value changes only when the simulation advances years.
- **Display-only / recordkeeping** means the website shows it but the current formulas do not use it to change BC, trade, debt, population, or supply.
- **BC** means Budget Capacity. The website has a peacetime BC and, during mobilization, a displayed wartime BC.

## Core Data Flow

Normal edit flow:

```text
GM edit
  -> Engine.updateValue()
  -> Engine.recalculateAll()
  -> recalculateTrade()
  -> recalculateBudgets()
  -> fiscal/debt projections
  -> UI refresh
```

`recalculateAll()` loops trade and budget up to 8 times until the recalculation signature stabilizes. This is needed because trade affects budget, and budget is also one input to trade.

Yearly simulation flow:

```text
advancePopulation()
advanceGovernance()
recalculateTrade()
advanceIndustry()
recalculateBudgets()
advanceMobilizationFinance()
recalculateTrade()
recalculateBudgets(updateDebt = true)
recalculateTrade()
recalculateBudgets()
advanceMilitarySupply()
snapshot()
```

The most important consequence: normal edits instantly recalculate trade, BC, fiscal balance, and projections. Some long-term stats, especially crime, corruption, effective governmental efficiency, population, industry growth, mobilization spending, debt principal movement, and military supply growth, only move through yearly simulation.

## Big Separation Rules

### Peacetime BC vs Wartime Display BC

- `national.budgetCapacity` is peacetime BC.
- `national.wartimeBudgetBonus` is derived wartime headroom.
- `national.mobilizedBudgetCapacity` is displayed BC: `budgetCapacity + wartimeBudgetBonus`.
- Trade uses peacetime economic inputs, not displayed wartime BC.
- Mobilization can make a country look much larger on displayed BC without inflating trade.
- Auto mobilization expenditure only starts after yearly simulation advances mobilization finance.

### Physical Industry vs Effective Industry

- Physical counts are what the player owns.
- Effective output is what formulas use.
- Missing sector data means all civilian/military factories are Basic and all shipyards are Medium.
- Editing sector tiers syncs the physical total.
- Literacy and industrial sophistication modify high-tier effective output; Basic factories and Medium shipyards stay simple physical counts.
- Sophistication is baselined on migration, so existing high-tier output stays stable until the stat changes relative to its starting value.

Current industrial weights:

| Sector | Basic / Medium | Improved / Large | Advanced / Mega |
|---|---:|---:|---:|
| Civilian | 1x | 5x | 30x |
| Military | 1x | 4x | 12x |
| Shipyards | 1x | 10x | 40x |

Literacy below 95% discounts only advanced/high-tier effective output. Basic factories and Medium shipyards are unaffected.

### Archives

Archived nations are hidden from active views and excluded from active trade/budget recalculation. Their rows remain in the data so they can be restored.

## National Stats

### Governmental Stability

Type: editable/raw.

Direct effects:

- Fiscal interest risk: lower stability increases borrowing risk.
- Tax burden: low stability increases tax pressure.
- Population: affects natural growth and migration attractiveness.
- Industry: high stability helps growth; low stability worsens contraction.
- Trade: affects physical trade base and value-added strength.
- Mobilization: affects wartime state capacity, mobilization ability, and endurance.
- Auto fiscal model: high stability is one condition for High Capacity State / Welfare State auto-detection.

Does not directly do:

- It does not directly edit public unrest, debt, factories, or population outside yearly formulas.

### Public Unrest

Type: editable/raw.

Direct effects:

- Population yearly simulation: unrest increases stress penalty and reduces migration.
- Governance yearly simulation: unrest pushes crime and governmental corruption upward.
- Tax watchlist: tax pressure can suggest unrest increases, but the GM must apply them.

Does not directly do:

- It does not instantly reduce BC or trade by itself except through formulas that read it in yearly population/governance paths.

### War Support

Type: editable/raw.

Direct effects:

- Wartime BC: increases mobilization readiness/resolve and Total mobilization upside.
- Mobilization finance: increases ability and endurance.
- Industry yearly simulation: military factory growth requires war support thresholds.

Military factory growth thresholds:

| Mobilization | Minimum War Support | Growth Threshold |
|---|---:|---:|
| None | 95% | 30 base growth |
| Partial | 75% | 16 base growth |
| Full | 60% | 9 base growth |
| Total | 45% | 6 base growth |

Does not directly do:

- It does not change peacetime trade.
- It does not directly change debt until mobilization finance creates auto expenditure and yearly debt update runs.

### Governmental Efficiency

Type: editable visible target, with a lagged derived applied value.

UI labels:

- Gov Efficiency / Gov Efficiency % = `governmentalEfficiency`.
- Applied Efficiency = `effectiveGovernmentalEfficiency`.

Related fields:

- `governmentalEfficiency`: visible/target efficiency.
- `effectiveGovernmentalEfficiency`: applied efficiency used by formulas.

How it works:

- `governanceMetrics()` uses `effectiveGovernmentalEfficiency` when present.
- Near-perfect changes are intentionally gentle.
- Deeper inefficiency creates a nonlinear bureaucracy penalty.
- Yearly governance moves visible efficiency toward a target, then moves applied efficiency toward visible efficiency more slowly.

Direct effects through applied efficiency:

- BC administrative capacity.
- Population stress and migration drag.
- Trade physical base, value-added strength, tariff collection, and logistics.
- Industry growth/contraction.
- Tax collection, tax pressure, and tariff pressure.
- Debt interest risk by broad efficiency bands.
- Mobilization wartime state capacity, ability, and endurance.

Does not directly do:

- It should not hard-cliff BC from tiny edits like 100% to 99.99%.

### Governmental Corruption

Type: editable/raw and yearly-simulation affected.

UI labels:

- Gov Corruption / Gov Corruption % = `governmentalCorruption`.

Direct effects:

- Blends into `fiscalCorruption`, `logisticsCorruption`, `socialCorruption`, and `stateCapacityCorruption`.
- Fiscal corruption reduces BC and tax/tariff collection.
- Logistics corruption reduces trade strength.
- Social corruption hurts population growth/migration.
- State-capacity corruption hurts mobilization and industry.
- Debt interest risk uses governmental corruption.

Yearly causes:

- High crime raises governmental corruption over time.
- Low stability, unrest, and bad economic health also push corruption upward.
- Development mildly lowers corruption targets.

### Crime Rate

Type: editable/raw and yearly-simulation affected.

Direct effects:

- Blends heavily into social/logistics corruption.
- Hurts population and trade through those blended metrics.
- High crime eventually raises governmental corruption.
- Very high crime contributes to governmental efficiency decline over time.

Yearly causes:

- Low literacy pushes crime upward.
- Unrest, low stability, and bad economic health push crime upward.
- Development mildly reduces crime pressure.

### Legacy Corruption

Type: legacy fallback.

Current behavior:

- `corruption` is still kept as a fallback for older data.
- New logic prefers `governmentalCorruption` and `crimeRate`.

### Literacy Rate

Type: editable/raw.

Neutral point:

- 95% literacy is neutral.

Direct effects:

- Below 95% discounts Improved/Advanced factories and Large/Mega shipyards.
- Advanced/Mega tiers are penalized more strongly than Improved/Large tiers.
- Above 95% slightly slows natural population growth during yearly population simulation.
- Low literacy raises crime target during yearly governance simulation.

Does not directly do:

- It does not directly change BC, debt, trade shares, or raw population on edit.
- Its BC effect comes only through effective high-tier industrial output.

### Development

Type: editable/raw.

Current behavior:

- `developmentLevel` remains the overall 0-20 development summary.
- If component fields are present, overall development is derived from Urbanization, Rural Development, Infrastructure, and Living Standard.
- Existing rows seed components from their current `developmentLevel`, so the migration is neutral.

Direct effects:

- BC: increases industrial contribution, tax revenue, collection, and development multipliers.
- Trade: increases physical trade base, value-added strength, production, trade capacity, and tariff resilience.
- Population: increases demographic maturity, lowering natural growth but improving migration attractiveness.
- Industry yearly simulation: improves growth scaling.
- Military supply: increases maximum supported equipment complexity.
- Fiscal model: high development is required for auto High Capacity State / Welfare State.
- Mobilization: increases wartime foundation, state capacity, ability, and endurance.

### Development Components

Types: editable/raw component fields.

Fields:

- `urbanizationRate`: 0-100%, converted to a 0-20 contribution internally.
- `ruralDevelopment`: 0-20 countryside productivity, services, and rural state reach.
- `infrastructureLevel`: 0-20 roads, power, logistics, ports, rail, and internal movement.
- `livingStandard`: 0-20 public health, formal consumer economy, and general prosperity.

Derived overall development:

```text
developmentLevel =
  urbanization contribution * 15%
  + rural development * 20%
  + infrastructure * 35%
  + living standard * 30%
```

Important:

- Editing old `Development` resets the component fields to match that overall value.
- Editing a component recalculates `developmentLevel`.
- Industrial Sophistication is not part of overall development, so it does not become a hidden general BC booster.

### Industrial Sophistication

Type: editable/auto-derived national stat with a stored baseline.

Meaning:

- Represents machine tooling, precision manufacturing, supplier networks, standards, maintenance culture, process control, and the ability to support complex production chains.
- It is not literacy. Literacy is the human-capital bottleneck; sophistication is the production-chain and tooling bottleneck.

Current behavior:

- If missing, the engine auto-determines it from development, infrastructure, literacy, and industrial depth.
- The first determined value becomes `industrialSophisticationBaseline`.
- High-tier output uses current sophistication relative to the baseline, so no nation jumps at migration.
- Manual edits mark the value as GM-overridden.

Direct effects:

- Improved/Advanced civilian factory effective output.
- Improved/Advanced military factory effective output.
- Large/Mega shipyard effective output.
- Military supply growth through the effective military output and a direct sophistication supply multiplier.
- Yearly industrial modernization.

Does not directly do:

- It does not improve Basic factories or Medium shipyards.
- It does not directly change population, crime, corruption, or raw trade shares.
- It does not directly alter general BC except through high-tier effective output.

### Budget Capacity

Type: derived peacetime output.

Primary causes:

- Effective civilian factories.
- Effective military factories, scaled by mobilization factory multiplier.
- Effective shipyards.
- Population and tax model.
- Development.
- Tax rate and fiscal model.
- Trade balance.
- Tariff revenue when tariff2026 is active.
- Governmental efficiency and fiscal corruption.
- Economic health.
- Physical industry maintenance cost.
- Manual `budgetAdjustment`, if present.

Important:

- `budgetCapacity` is peacetime.
- `displayBudgetCapacity()` shows `mobilizedBudgetCapacity` when wartime bonus exists.
- Debt percent is recalculated from debt principal over peacetime BC.

### Expenditure

Type: editable/raw.

Direct effects:

- Fiscal primary balance.
- Effective balance after debt service.
- Treasury deposits/drawdowns.
- Deficit borrowing.
- Projected debt.
- Interest risk through deficit risk.

Related derived field:

- `effectiveBudgetExpenditure` equals base expenditure plus auto mobilization BE when auto wartime spending is active.

### Primary Balance

Type: derived.

Formula:

```text
primaryBalance = budgetCapacity - effectiveBudgetExpenditure
```

This is before debt service. When mobilization auto-BE has started, it is already included through effective expenditure.

### Budget Balance

Type: derived.

Formula:

```text
budgetBalance = primaryBalance - debtService
```

This is the effective balance after debt service.

### Treasury Reserve

Type: editable/current balance, with derived projections.

Direct effects:

- Deficits draw from treasury before creating new borrowing.
- Surpluses deposit into treasury after debt repayment.

Related derived fields:

- `treasuryDeposit`
- `deficitBeforeReserve`
- `treasuryDrawdown`
- `treasuryChange`
- `projectedTreasuryReserve`
- `maxDebtPaydown`, shown as Paydown Cap

### Debt, Debt Principal, and Debt Service

Types:

- `debt`: derived debt percent, but editable in the editor.
- `debtPrincipal`: stored nominal debt amount.
- `debtServiceRate`: stored service rate on current debt.
- `debtService`: derived annual service cost.

Important behavior:

- Editing debt percent resets `debtPrincipal` to the current peacetime BC.
- Budget growth does not instantly reprice existing debt principal.
- Yearly simulation with `updateDebt = true` applies repayment, borrowing, treasury movement, and gradual debt service repricing.

Debt projection logic:

```text
debtService = debtPrincipal * debtServiceRate
effectiveBalance = primaryBalance - debtService
if surplus:
  repay up to 25% of surplus, capped at 10% of debt principal
  deposit remaining surplus to treasury
if deficit:
  draw treasury first
  borrow remaining deficit
projectedDebt = projectedDebtPrincipal / budgetCapacity
```

### Interest Rate

Type: derived risk rate plus stored/manual adjustment.

Base rate:

- 2%.

Risk contributors:

- Debt percent.
- Stability.
- Economic health.
- Governmental corruption.
- Governmental efficiency band.
- Deficit ratio.
- Sanctions.
- Mobilization.
- Trade balance.
- Debt trend.
- `interestRateAdjustment`, if present.

Debt service rate:

- Existing debt uses stored `debtServiceRate`.
- New borrowing uses current interest rate.
- Old debt reprices gradually by `annualServiceRateRepriceShare` of 20% per annual update.

### Fiscal Model

Type: editable override or automatic model.

Manual options:

- Standard
- High Capacity State
- Welfare State
- Command Economy
- Low Capacity State
- Extractive State

Auto behavior:

- If no explicit fiscal model is set, high development, high stability, high applied efficiency, strong economy, and large industry can auto-select High Capacity State.
- If the same high-capacity conditions exist and tax rate is high enough, it can auto-select Welfare State.

Direct effects:

- Sustainable tax rate.
- Tax pressure.
- Collection floor.
- Tax yield.
- Population, immigration, and industry tax penalties.

### Economic Health

Type: editable/raw.

Options:

- Prosperity
- Expansion
- Recovery
- Slowdown
- Recession
- Depression

Direct effects:

- BC multiplier.
- Trade health factor.
- Population natural growth and migration.
- Industry yearly growth/contraction.
- Tax and tariff pressure.
- Interest risk.
- Governance yearly crime/corruption pressure.

### Immigration Rate

Type: editable/raw.

Direct effects:

- Adds to yearly migration growth after tax penalty.
- Does not instantly change current population.

### Tax Rate

Type: editable/raw.

Important input behavior:

- Values above 1 are treated as percent values.
- Values at or below 1 are treated as decimal rates and multiplied by 100.

Direct effects:

- Tax revenue.
- Tax burden and collection drag.
- Population growth penalty.
- Immigration penalty.
- Industry growth multiplier.
- Public unrest recommendations.
- Fiscal model auto detection through tax-rate conditions.

Does not directly do:

- It does not automatically change public unrest unless the GM applies the watchlist recommendation.

## Trade Stats

### Import Reliance

Type: editable/raw.

Direct effects:

- Increases import demand score.
- Tilts the nation toward import flow.
- Affects import share used in tariff revenue and tariff exposure.
- Large import reliance can penalize yearly industry growth if imports exceed minimum industrial needs.

### Export Reliance

Type: editable/raw.

Direct effects:

- Increases export supply score.
- Tilts the nation toward export flow.
- Helps structural trade balance when export reliance exceeds import reliance.

### Economic Trade Diversity

Type: editable/raw.

Direct effects:

- Improves diversity resilience.
- Improves value-added strength.
- Increases export supply and world-pool capacity.
- Helps visible partner spread.
- Increases economic impact score.
- Reduces some tariff/import-cost sensitivity.

### Autarky

Type: editable/raw.

Direct effects:

- Reduces import access.
- Reduces export access.
- Reduces overall trade access.
- Increases raw import cost inside trade balance.
- Reduces economic impact score through lower openness.

### Trade Policy

Type: editable/raw.

Policy effects:

| Policy | General behavior |
|---|---|
| Protectionist | Lower access, import demand, export supply, capacity; lower tariff sensitivity |
| Balanced | Neutral |
| Open Market | Higher access, demand, supply, capacity |
| Free Trade | Highest access, demand, supply, capacity; stricter tariff comfort line |

Trade policy affects:

- Network access.
- Import demand.
- Export supply.
- World capacity.
- Trade balance risk.
- Sustainable tariff rate.
- Tariff collection profile.

### Tariff Rate

Type: editable/raw.

Direct effects:

- Reduces demand/flow access as tariffs rise.
- Generates tariff revenue.
- Creates import cost.
- Raises tariff burden if above the policy comfort line.
- Can reduce trade capacity, export access, import demand, and services multiplier through tariff shock.
- Affects yearly industry through trade volatility.

Targeted tariffs:

- Stored in `tradeNetwork.targetedTariffs`.
- Override importer/exporter lane tariff.
- Affect lane flow, tariff revenue, and import cost without changing the base national tariff field.

### Sanctions

Type: raw field and lane-policy field.

Direct effects:

- National sanctions reduce network access, demand/supply, and fiscal interest risk.
- Lane sanctions reduce a specific lane through `lanePolicyMultiplier`.
- Embargo sets lane multiplier to 0.

### Trade Disruption

Type: editable/raw.

Neutral point:

- `0%` is neutral and preserves existing trade behavior.

Direct effects:

- Reduces the disrupted nation's import demand, export supply, world-pool capacity, lane affinity, partner reach, and logistics.
- Lowers maritime/corridor/reliability logistics readouts, so port damage or wartime disruption shows on the trade tab.
- Adds a trade-balance penalty so collapsed imports do not accidentally make a disrupted economy look healthier.
- Affects BC indirectly through lower trade balance and tariff flow.

Does not directly do:

- It does not delete shipyards, factories, ports, or geography.
- It does not set sanctions or embargoes; it represents physical/war disruption rather than policy restriction.

### Trade Flow

Type: derived.

Formula concept:

```text
tradeFlow = networkImportFlow + networkExportFlow
```

Main causes:

- Import demand score.
- Export supply score.
- World trade pool capacity.
- Trade policy.
- Sanctions.
- Trade disruption.
- Tariffs.
- Autarky.
- Diversity.
- Geography/route efficiency.
- Anchors and targeted lane controls.
- Effective industrial output.
- Population, development, budget, stability, corruption, and economic health.

### Trade Balance

Type: derived.

Main causes:

- Export flow.
- Import flow.
- Export reliance vs import reliance.
- Value-added strength.
- Productive import credit.
- Autarky import cost.
- Tariff revenue and import costs.
- Network/lane deltas.

Budget effect:

- Positive trade balance improves BC through the trade-impact multiplier.
- Negative trade balance hurts BC.
- Trade balance also affects fiscal interest risk.

### Trade Capacity

Type: derived.

Main causes:

- World-pool capacity score.
- Logistics.
- Diversity resilience.
- Value-added strength.

### Economic Impact Score

Type: derived.

Main causes:

- Trade flow.
- Positive or negative trade balance relative to BC.
- Trade diversity.
- Low autarky.

Yearly effect:

- Used by industry growth when translating trade balance into industrial growth/contraction pressure.

### Trade Network Controls

Trade network data lives under `data.tradeNetwork`.

Controls:

- `exportAnchors`: force a share of one exporter toward selected importers.
- `importAnchors`: force a share of one importer toward selected exporters.
- `targetedTariffs`: set lane-specific tariff rates.
- `lanePolicies`: set lane embargoes/sanctions.
- `transitPolicies`: block land, maritime, or all transit through another country.
- `chokepoints`: disrupt or blockade strategic route nodes.
- `geography`: controls coordinates, coast/landlocked status, route access, ports, regions, neighbors, and map distance.

Important:

- Anchors are capped to 95% internally.
- Embargoed anchor share reduces available flow.
- Route gravity and diffuse market flow are used so giant economies stay important without every country becoming unrealistically tied to one hub.

## Industrial Stats

### Civilian Factories

Type: editable physical total with tier breakdown.

UI tier labels:

- Basic Civilian.
- Improved Civilian.
- Advanced Civilian.

Direct effects:

- Effective civilian output contributes to BC.
- Effective civilian output contributes to trade physical base and value-added strength.
- Civilian factory count contributes to mobilization wartime foundation and finance ability.
- Yearly industry growth changes civilian factories.

### Military Factories

Type: editable physical total with tier breakdown.

UI tier labels:

- Basic Military.
- Improved Military.
- Advanced Military.

Direct effects:

- Effective military output contributes to BC, scaled by mobilization factory multiplier.
- Effective military output contributes to trade physical base.
- Effective military output contributes to mobilization wartime foundation.
- Effective military output drives yearly military supply growth.
- Yearly military factory growth requires sufficient war support and mobilization.

### Shipyards

Type: editable physical total with tier breakdown.

UI tier labels:

- Medium Shipyards.
- Large Shipyards.
- Mega Shipyards.

Direct effects:

- Effective shipyard output contributes strongly to BC.
- Effective shipyard output contributes strongly to trade physical base and value-added strength.
- Effective shipyard output contributes to mobilization wartime foundation and endurance.
- Yearly industry growth changes shipyards.

Important:

- Shipyards are economic/naval-industrial capacity.
- Navy inventory ship counts are separate recordkeeping and do not create shipyards.

### Industrial Mobilization Level

Type: editable/raw, but usually shadowed by military mobilization.

Budget and yearly formulas use:

```text
military.mobilizationLevel || industrial.mobilizationLevel || "None"
```

Because military mobilization is normally present, it is the effective mobilization value in most live rows.

### Yearly Industry Growth

Main causes:

- Economic health.
- Number of consecutive years in the same health status.
- Existing industrial scale.
- Development.
- Stability.
- State-capacity corruption.
- Governmental efficiency.
- Trade balance and economic impact score.
- Tariff volatility.
- Import reliance.
- Tax industry growth multiplier.
- Mobilization civilian penalty.
- War support and mobilization for military factory growth.

Outputs:

- Civilian factories.
- Military factories.
- Shipyards.
- Default/basic sector counts are adjusted along with physical totals.
- Modernization can convert Basic Civilian to Improved Civilian, Improved Civilian to Advanced Civilian, Basic Military to Improved Military, Improved Military to Advanced Military, Medium Shipyards to Large Shipyards, and Large Shipyards to Mega Shipyards.
- Modernization requires industrial sophistication and is affected by literacy, development, infrastructure, economic health, and sector-specific military or shipyard depth.
- Modernization upgrades existing lower-tier stock; it does not create advanced factories from nothing.

## Population Stats

### Current Population

Type: editable per year.

Direct effects:

- BC population contribution.
- Trade physical base, import demand floor, and market size.
- Mobilization wartime foundation and endurance.
- Overview/world totals.

Yearly changes:

- Population only changes when the simulation advances to a new year.

### Child Policy

Type: editable/raw.

Direct yearly effect:

- Adds a policy effect to natural population growth.
- Effect is damped by high development/maturity.

Policies:

- 5 Child Policy
- 4 Child Policy
- 3 Child Policy
- 2 Child Policy
- 1 Child Policy
- No Policy

### Population Growth Formula

Main yearly causes:

- Economic health.
- Development/maturity.
- Stability.
- Public unrest.
- Social corruption.
- Governmental efficiency drag.
- Tax burden.
- Immigration rate.
- Child policy.
- Literacy above 95%.
- Population size damping and inertia damping.

Outputs:

- New population value for the target year.
- Simulation metadata such as natural growth, migration growth, damping, literacy slowdown, and stress penalty.

## Military Stats

### Military Organization

Type: editable/raw.

Direct effects:

- Increases yearly military supply gain.
- Displayed in military status.

### Military Supply

Type: editable/current value and yearly-simulation affected.

Yearly supply gain depends on:

- Effective military factory output.
- Industrial sophistication.
- Mobilization supply multiplier.
- Equipment complexity multiplier.
- Development vs equipment complexity tech gap.
- Military organization.

Does not currently do:

- It does not feed back into BC, trade, or debt.

### Military Mobilization

Type: editable/raw.

Levels:

- None
- Partial
- Full
- Total

Direct effects:

- Wartime displayed BC bonus.
- Mobilization auto expenditure after yearly finance starts.
- Fiscal interest risk.
- Military supply multiplier.
- Civilian industry yearly growth penalty.
- Military factory growth threshold/multiplier.
- Military factory contribution to BC through mobilization factory multiplier.

Mobilization constants:

| Level | Military growth multiplier | Civilian penalty | Military factory BC multiplier | Maintenance cost | Supply multiplier |
|---|---:|---:|---:|---:|---:|
| None | 0.25 | 0 | 0.4 | 1 | 1 |
| Partial | 0.5 | -0.2 | 0.6 | 1.5 | 1.25 |
| Full | 1 | -0.4 | 0.8 | 2 | 1.5 |
| Total | 1.5 | -0.6 | 1 | 3 | 2 |

### Equipment Complexity

Type: editable/raw.

Direct effects:

- Lower complexity gives a better `complexityMultiplier`.
- If complexity exceeds what development can support, military supply growth gets a tech-gap penalty.

Does not currently do:

- It does not change equipment records or procurement costs.

### Cyber Security

Type: editable/raw.

Current effect:

- Display-only in the current formula set.

### Personnel Fields

Fields:

- Combat Personnel
- Support Personnel
- Air Force Personnel
- Naval Personnel
- Reserve Forces
- Paramilitary / Irregular

Current effects:

- Displayed in Military Status and Nations dossier.
- Active total sums combat, support, air force, naval, and paramilitary/irregular.

Does not currently do:

- Personnel counts do not affect BC, trade, supply, debt, or mobilization formulas yet.
- Reserve forces are shown separately and are not included in active total.

## Intelligence Stats

Fields:

- HUMINT
- SIGINT
- Counterintelligence
- Covert Action
- Analysis & Doctrine
- Global Reach
- Internal Surveillance
- Secrecy & Denial

Current effect:

- Display-only in the current formula set.

Does not currently do:

- Intelligence does not affect trade, BC, debt, population, military supply, or simulation yet.

## Naval Inventory

Type: editable recordkeeping.

Fields:

- Category.
- Class name.
- Count.
- Total.
- Total note.

Current behavior:

- Total is computed from all category ship counts.
- Fleet total appears in overview/nation dossier/naval page.

Does not currently do:

- Navy inventory does not change shipyards.
- Navy inventory does not change trade routes, port strength, trade flow, military supply, or BC.

## Equipment Library

Type: editable recordkeeping.

Fields:

- Name.
- Category.
- Subcategory.
- Role.
- Era.
- Status.
- Origin.
- Notes.
- Detailed parsed sections when imported from a template.

Current behavior:

- Equipment records attach to nations.
- Roster import and detailed template import create/update records.
- Equipment reference costs are shown as global reference data.

Does not currently do:

- Equipment records do not change military supply, BC, debt, trade, or personnel.
- Equipment reference costs do not currently calculate budgets.

## Eclipse and Elections

Fields:

- Eclipse Status.
- Leader Elections.
- Parliament Elections.

Current effect:

- Display/search/coverage only.

Does not currently do:

- These fields do not affect BC, trade, debt, population, industry, or military supply.

## Overview, Coverage, and History

### Coverage

Type: derived UI indicator.

Behavior:

- Checks whether each dataset has a row for a nation.
- Datasets are National, Trade, Industrial, Population, Military, Intelligence, Eclipse, Elections, and Naval.
- Coverage does not affect formulas.

### Change History

Type: derived audit trail.

Behavior:

- Tracks recent edits and some create/archive/import actions.
- Displays before/after values and derived impact badges.
- Does not affect formulas.

### Snapshot / Simulation Log

Type: derived yearly log.

Snapshot fields:

- Year.
- Total population.
- Displayed budget capacity total.
- Trade flow total.
- Average crime rate.
- Average governmental corruption.
- Average governmental efficiency.
- Average applied governmental efficiency.
- Average military supply.

Does not currently do:

- Snapshots are reporting/history. They do not feed formulas.

## What Most Directly Controls BC

Strongest direct BC inputs:

- Effective civilian factories.
- Effective military factories.
- Effective shipyards.
- Development.
- Industrial sophistication through high-tier effective output.
- Population and tax rate.
- Governmental efficiency.
- Governmental corruption/crime through fiscal corruption.
- Economic health.
- Trade balance.
- Tariff revenue when tariff2026 is active.
- Mobilization level for displayed wartime BC and military-factory contribution.
- Base expenditure does not change BC; it changes balance and debt pressure.

## What Most Directly Controls Trade

Strongest direct trade inputs:

- Import reliance.
- Export reliance.
- Trade diversity.
- Autarky.
- Trade policy.
- Tariffs and targeted tariffs.
- Sanctions/embargoes.
- Trade disruption.
- Effective factories and shipyards.
- Population.
- Budget capacity.
- Development.
- Stability.
- Logistics corruption and governmental efficiency.
- Economic health.
- Geography, route type, ports/coast, distance, transit, and chokepoints.
- Import/export anchors.

## What Most Directly Controls Debt

Strongest direct debt inputs:

- Budget capacity.
- Effective expenditure.
- Existing debt principal.
- Debt service rate.
- Treasury reserve.
- Interest risk factors.
- Yearly `updateDebt = true`.

Risk factors that raise interest:

- High debt percent.
- Low stability.
- Bad economic health.
- High governmental corruption.
- Low governmental efficiency band.
- Deficit ratio.
- Sanctions.
- Mobilization.
- Negative trade balance.
- Rising projected debt trend.

## What Most Directly Controls Population

Strongest yearly population inputs:

- Current population.
- Economic health.
- Development/maturity.
- Stability.
- Public unrest.
- Social corruption.
- Governmental efficiency drag.
- Immigration rate.
- Child policy.
- Tax burden.
- High literacy slowdown above 95%.
- Size damping and inertia.

## What Most Directly Controls Military Supply

Strongest yearly supply inputs:

- Current military supply.
- Effective military factories.
- Industrial sophistication.
- Mobilization level.
- Equipment complexity.
- Development level.
- Military organization.

## Current Display-Only Stats

These are visible but do not currently drive major formulas:

- Cyber Security.
- Intelligence stats.
- Personnel counts, except active total display.
- Reserve forces.
- Navy inventory, except fleet total display.
- Equipment records.
- Eclipse status.
- Election schedule.
- Coverage.
- Change history.

## Source File Map

| System | Primary files |
|---|---|
| Editor fields | `site/js/app/editorView.js` |
| Status tables | `site/js/app/statusTables.js` |
| Core constants and yearly simulation | `site/engine.js` |
| Fiscal/debt/interest | `site/js/engine/fiscal.js` |
| Trade network and routes | `site/js/engine/trade.js` |
| Trade policy normalization | `site/js/engine/tradePolicy.js` |
| Equipment/naval records | `site/js/app/records.js`, `site/js/app/recordsParser.js` |
| Tabs/datasets | `site/js/app/config.js` |

## Maintenance Rule

When changing formulas or adding a new stat effect, update this document in the same commit. The most important thing to preserve is whether a stat is:

- Instant recalculation.
- Yearly simulation only.
- Display-only.
- A raw input.
- A derived output.
