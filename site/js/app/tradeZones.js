(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  root.AGGS_TRADE_ZONES = {
    version: "20260603-player-drawn-trade-zones",
    assetPath: "assets/ag-trade-zones.png",
    width: 8800,
    height: 5806,
    zones: [
      { id: "vesperan_strait", label: "Vesperan Strait", type: "strait", color: "#5e464b", chokepoint: true },
      { id: "boynak_canal", label: "Boynak Canal", type: "strait", color: "#2f81bb", chokepoint: true },
      { id: "ve_ulka_canal", label: "Ve Ulka Canal", type: "strait", color: "#cfd75c", chokepoint: true },
      { id: "bakor_canal", label: "Bakor Canal", type: "strait", color: "#4ba24b", chokepoint: true },
      { id: "rosanovka", label: "Rosanovka", type: "strait", color: "#cf87ac", chokepoint: true },
      { id: "hoshiya", label: "Hoshiya", type: "sea_zone", color: "#183b41", chokepoint: false },
      { id: "azagorian", label: "Azagorian", type: "sea_zone", color: "#181e41", chokepoint: false },
      { id: "beryl_strait", label: "Beryl Strait", type: "strait", color: "#3d1841", chokepoint: true },
      { id: "hano", label: "Hano", type: "sea_zone", color: "#8b546d", chokepoint: false },
      { id: "orion", label: "Orion", type: "sea_zone", color: "#8b6754", chokepoint: false },
      { id: "marcius", label: "Marcius", type: "sea_zone", color: "#70548b", chokepoint: false },
      { id: "okeanus", label: "Okeanus", type: "sea_zone", color: "#7a5bc2", chokepoint: false },
      { id: "karthalis", label: "Karthalis", type: "sea_zone", color: "#82d322", chokepoint: false },
      { id: "newberry_strait", label: "Newberry Strait", type: "strait", color: "#ff00fe", chokepoint: true },
      { id: "corvessa", label: "Corvessa", type: "sea_zone", color: "#6cadc6", chokepoint: false },
      { id: "mare_solthar", label: "Mare Solthar", type: "sea_zone", color: "#00ffff", chokepoint: false },
      { id: "caldran_ocean", label: "Caldran Ocean", type: "sea_zone", color: "#441521", chokepoint: false },
      { id: "whitewater", label: "Whitewater", type: "sea_zone", color: "#e6e6e6", chokepoint: false },
      { id: "crownward", label: "Crownward", type: "sea_zone", color: "#f2fc24", chokepoint: false },
      { id: "sea_of_xanaqu", label: "Sea of Xanaqu", type: "sea_zone", color: "#fe3521", chokepoint: false },
      { id: "the_storm_expanse", label: "The Storm Expanse", type: "sea_zone", color: "#0f1c21", chokepoint: false }
    ]
  };
})();
