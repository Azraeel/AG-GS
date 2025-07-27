# Enhanced Trade System Documentation

## Overview
The Enhanced Trade System transforms your static trade automater into a dynamic, realistic economic simulation that significantly impacts your nation roleplay experience.

## Key Improvements

### 1. **Trade Policies**
Nations can now choose between three trade policies:

- **Protectionist**:
  - Effects: -15% efficiency, -10% capacity, +15% autarky
  - Best for: Nations wanting economic independence and stability
  - Trade-off: Lower trade volumes but more self-reliant

- **Balanced** (Default):
  - Effects: No modifiers
  - Best for: Most nations as a starting point

- **Open Market** (NEW):
  - Effects: +10% efficiency, +8% capacity, -10% autarky
  - Best for: Nations wanting moderate trade expansion
  - Trade-off: Balanced approach between security and growth

- **Free Trade**:
  - Effects: +20% efficiency, +15% capacity, -20% autarky
  - Best for: Nations with strong economies wanting maximum trade
  - Trade-off: Higher trade dependency and volatility

### 2. **Sanctions System**
Diplomatic consequences now have real economic impact:

- **None**: No penalties
- **Light**: -10% efficiency, -5% capacity, -15% flow, -20% balance
- **Moderate**: -25% efficiency, -15% capacity, -30% flow, -40% balance
- **Heavy**: -45% efficiency, -30% capacity, -50% flow, -60% balance
- **Total**: -70% efficiency, -50% capacity, -80% flow, -85% balance

### 3. **Tariff Rates**
Nations can set their own tariff rates:
- Range: 0% to 50%
- Each 1% tariff reduces efficiency by 2% and capacity by 1.5%
- Tariffs generate government revenue (added to trade balance and budget)
- Higher tariffs = less trade but more government income
- Default: 5%

### 4. **Improved Trade Mechanics**
The trade calculation system has been redesigned for realism:
- **Trade Power**: Economic influence and trading strength (the big number)
- **Trade Capacity**: Infrastructure limitation (Development + Shipyards only)
- **Trade Flow**: Trade Power × Trade Capacity × Trade Efficiency
- **Autarky Index**: User-editable self-sufficiency level (0-100)
- **Economic Trade Diversity**: User-editable trade network size (1-500)

### 5. **Realistic Trade Balance**
No more artificial balance points:
- **Minimum Import Requirements**: Based on population and factories
- **Autarky Reduction**: High autarky reduces import needs
- **Development Efficiency**: Higher development improves import efficiency
- **Diversity Multiplier**: More trade partners = better export prices
- **No 17/17 = 0 Balance**: Removed unrealistic perfect balance scenarios

### 6. **Enhanced Industrial Growth Integration**
Trade now meaningfully affects industrial development:
- **Import Dependency Penalty**: Excess imports hurt factory growth
- **Development-Import Ratio**: Low development + high imports = slower growth
- **Minimum Import Requirements**: Nations need imports to support industry
- **Export Specialization**: High exports with diversity boost economic power

### 7. **Economic Impact Score**
Shows how trade-dependent each nation is:
- Calculated from trade balance, import/export reliance, and autarky
- Higher scores = more trade affects your economy
- Used to scale trade's impact on economic health and budget

## Enhanced Economic Integration

### Trade Balance Impact on Growth
- **Positive trade balance**: Boosts industrial growth
- **Negative trade balance**: Hurts growth 50% more than positive helps
- **Volatility**: Reduces all industrial growth
- **Economic Impact Score**: Scales how much trade affects your nation

### Budget Capacity Effects
- Trade balance affects tax collection efficiency
- 10% of trade-to-GDP ratio affects budget capacity
- Tariff revenue directly adds to budget capacity
- Range: 70% to 130% of base budget capacity

### Economic Health Changes
- Strong positive trade balance can improve economic health
- Poor trade performance can worsen economic health
- High volatility always hurts economic health
- Changes occur gradually over time

## Installation Instructions

1. **Initialize the System**:
   - Go to "Enhanced Trade System" menu → "Initialize Enhanced Trade System"
   - This adds four new columns to your Trade Status sheet

2. **New Columns Added**:
   - **Trade Policy**: Set to "Balanced" by default (now includes "Open Market")
   - **Sanctions Level**: Set to "None" by default
   - **Tariff Rate**: Set to 5% by default
   - **Economic Impact Score**: Calculated automatically

3. **Updated User-Editable Values**:
   - **Import Reliance** (0-100): How much you import relative to economy
   - **Export Reliance** (0-100): How much you export relative to economy
   - **Economic Trade Diversity** (1-500): Trade network size and variety
   - **Autarky Index** (0-100): Self-sufficiency level

## How to Use

### Setting Trade Policies
1. Use menu: "Enhanced Trade System" → "Set Trade Policy"
2. Enter nation name and desired policy
3. Or manually edit the "Trade Policy" column

### Applying Sanctions
1. Use menu: "Enhanced Trade System" → "Apply Sanctions"
2. Enter target nation and sanction level
3. Or manually edit the "Sanctions Level" column

### Setting Tariff Rates
1. Use menu: "Enhanced Trade System" → "Set Tariff Rate"
2. Enter nation name and tariff rate (0-50%)
3. Or manually edit the "Tariff Rate" column

### Setting Trade Values
1. **Autarky Index**: Manually edit (0-100) - higher = more self-sufficient
2. **Import Reliance**: Set based on your nation's import needs (0-100)
3. **Export Reliance**: Set based on your nation's export capacity (0-100)
4. **Economic Trade Diversity**: Set trade network size (1-500)
   - Low (1-100): Limited partners, vulnerable but specialized
   - Medium (101-300): Balanced trade relationships
   - High (301-500): Global trade network, stable but complex

### Monitoring the System
- **Trade Power**: Your economic influence - the big number that drives everything
- **Trade Capacity**: Your infrastructure limit - invest in development and shipyards
- **Trade Flow**: Actual trade volume - result of Power × Capacity × Efficiency
- **Autarky Index**: Your self-sufficiency level - set this manually
- **Tariff Rate**: Your current tariff level - higher rates reduce trade but increase revenue
- **Economic Impact Score**: Higher scores mean trade affects your economy more
- **Economic Health**: May change based on trade performance
- **Budget Capacity**: Now affected by trade balance and tariff revenue

### Real-Time Updates
- Any manual edit to trade categories triggers immediate recalculation
- No need to wait for year changes to see effects
- Experiment with different values to see immediate impact

## Realistic Scenarios

### Trade War
1. Apply "Heavy" or "Total" sanctions to target nations
2. Set your policy to "Protectionist" to reduce dependency
3. Watch as trade flows decrease and volatility increases
4. Economic health may decline due to reduced trade

### Economic Boom
1. Set policy to "Free Trade" to maximize benefits
2. Positive trade events reduce volatility
3. Strong trade balance improves economic health
4. Budget capacity increases from trade efficiency

### Market Crisis
1. High volatility events occur randomly
2. All nations suffer reduced growth
3. Nations with high Economic Impact Scores suffer more
4. Protectionist policies provide some protection

## Balance Considerations

The system is designed to be realistic but not game-breaking:
- Trade impact is significant but not overwhelming
- Negative effects are stronger than positive (realistic)
- Volatility provides uncertainty without chaos
- Economic health changes gradually
- Budget impacts are meaningful but capped

## Compatibility

- Works with existing Economic Automater
- Enhances existing trade calculations
- Backward compatible if enhanced columns don't exist
- Integrates with population, industrial, and military systems

## Tips for Roleplay

1. **Choose policies that match your nation's character**
2. **Use sanctions as diplomatic tools**
3. **React to trade events in your roleplay**
4. **Consider trade when making economic decisions**
5. **Monitor Economic Impact Score to understand your trade dependency**

The Enhanced Trade System makes trade a living, breathing part of your economy that responds to your decisions and world events, creating more engaging and realistic nation roleplay.
