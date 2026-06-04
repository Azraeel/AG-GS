(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  root.AGGS_TRADE_LANE_SKELETON = {
    version: "precision-lane-skeleton-v1",
    map: { width: 8800, height: 5806 },
    nodes: [
      { id: "lane:southern_solara_gate", label: "Solara Gate", type: "lane", x: 7.5, y: 88.2, zones: ["mare_solthar"] },
      { id: "lane:southwest_khalindar_trunk", label: "Southwest Khalindar Trunk", type: "lane", x: 21.5, y: 83.4, zones: ["the_storm_expanse"] },
      { id: "lane:xanaqu_south_approach", label: "Xanaqu South Approach", type: "lane", x: 35.5, y: 78.8, zones: ["sea_of_xanaqu"] },
      { id: "lane:central_southern_trunk", label: "Central Southern Trunk", type: "lane", x: 48.8, y: 74.2, zones: ["okeanus"] },
      { id: "lane:orinian_bend", label: "Orinian Bend", type: "lane", x: 64.8, y: 67.6, zones: ["orion"] },
      { id: "lane:eastern_orinian_approach", label: "Eastern Orinian Approach", type: "lane", x: 72.8, y: 47.5, zones: ["orion"] },
      { id: "lane:volgastan_southern_approach", label: "Volgastan Southern Approach", type: "lane", x: 83.3, y: 62.7, zones: ["orion"] },
      { id: "lane:far_east_gate", label: "Far East Gate", type: "lane", x: 96.4, y: 55.5, zones: ["whitewater"] },
      { id: "lane:western_far_coast", label: "Western Far Coast", type: "lane", x: 4.8, y: 47.2, zones: ["vesperan_strait"] },
      { id: "lane:western_south_gate", label: "Western South Gate", type: "lane", x: 6.1, y: 64.8, zones: ["vesperan_strait"] },
      { id: "choke:vesperan_strait", label: "Vesperan Strait", type: "chokepoint", chokepoint: true, zoneId: "vesperan_strait", x: 6.7, y: 72.5, zones: ["vesperan_strait"] },
      { id: "choke:boynak_canal", label: "Boynak Canal", type: "chokepoint", chokepoint: true, zoneId: "boynak_canal", x: 4.4, y: 52.0, zones: ["boynak_canal"] }
    ],
    edges: [
      { from: "lane:southern_solara_gate", to: "lane:southwest_khalindar_trunk", class: "coastal", cost: 13.8, zones: ["mare_solthar", "the_storm_expanse"], path: [{ x: 7.5, y: 88.2 }, { x: 13.2, y: 88.6 }, { x: 21.5, y: 83.4 }] },
      { from: "lane:southwest_khalindar_trunk", to: "lane:xanaqu_south_approach", class: "open_ocean", cost: 14.4, zones: ["the_storm_expanse", "sea_of_xanaqu"], path: [{ x: 21.5, y: 83.4 }, { x: 28.7, y: 82.5 }, { x: 35.5, y: 78.8 }] },
      { from: "lane:xanaqu_south_approach", to: "lane:central_southern_trunk", class: "open_ocean", cost: 13.8, zones: ["sea_of_xanaqu", "okeanus"], path: [{ x: 35.5, y: 78.8 }, { x: 42.1, y: 77.2 }, { x: 48.8, y: 74.2 }] },
      { from: "lane:central_southern_trunk", to: "lane:orinian_bend", class: "open_ocean", cost: 17.2, zones: ["okeanus", "orion"], path: [{ x: 48.8, y: 74.2 }, { x: 57.5, y: 73.8 }, { x: 64.8, y: 67.6 }] },
      { from: "lane:orinian_bend", to: "lane:eastern_orinian_approach", class: "coastal", cost: 15.6, zones: ["orion"], path: [{ x: 64.8, y: 67.6 }, { x: 68.2, y: 59.2 }, { x: 72.8, y: 47.5 }] },
      { from: "lane:orinian_bend", to: "lane:volgastan_southern_approach", class: "open_ocean", cost: 18.2, zones: ["orion"], path: [{ x: 64.8, y: 67.6 }, { x: 74.5, y: 68.2 }, { x: 83.3, y: 62.7 }] },
      { from: "lane:volgastan_southern_approach", to: "lane:far_east_gate", class: "coastal", cost: 14.8, zones: ["orion", "whitewater"], path: [{ x: 83.3, y: 62.7 }, { x: 90.5, y: 60.2 }, { x: 96.4, y: 55.5 }] },
      { from: "lane:western_far_coast", to: "choke:boynak_canal", class: "canal", cost: 5.2, zones: ["boynak_canal"], chokepoints: ["boynak_canal"], path: [{ x: 4.8, y: 47.2 }, { x: 4.4, y: 52.0 }] },
      { from: "choke:boynak_canal", to: "lane:western_south_gate", class: "canal", cost: 8.2, zones: ["vesperan_strait"], chokepoints: ["boynak_canal"], path: [{ x: 4.4, y: 52.0 }, { x: 5.2, y: 58.7 }, { x: 6.1, y: 64.8 }] },
      { from: "lane:western_south_gate", to: "choke:vesperan_strait", class: "strait", cost: 8.0, zones: ["vesperan_strait"], chokepoints: ["vesperan_strait"], path: [{ x: 6.1, y: 64.8 }, { x: 6.7, y: 72.5 }] },
      { from: "choke:vesperan_strait", to: "lane:southern_solara_gate", class: "strait", cost: 15.0, zones: ["vesperan_strait", "mare_solthar"], chokepoints: ["vesperan_strait"], path: [{ x: 6.7, y: 72.5 }, { x: 6.9, y: 80.1 }, { x: 7.5, y: 88.2 }] },
      { from: "lane:western_south_gate", to: "lane:southwest_khalindar_trunk", class: "open_ocean", cost: 19.2, zones: ["vesperan_strait", "the_storm_expanse"], path: [{ x: 6.1, y: 64.8 }, { x: 12.5, y: 72.4 }, { x: 21.5, y: 83.4 }] },
      { from: "lane:eastern_orinian_approach", to: "lane:far_east_gate", class: "coastal", cost: 24.0, zones: ["orion", "whitewater"], path: [{ x: 72.8, y: 47.5 }, { x: 84.6, y: 43.8 }, { x: 96.4, y: 55.5 }] },
      { from: "lane:xanaqu_south_approach", to: "lane:eastern_orinian_approach", class: "open_ocean", cost: 39.0, zones: ["sea_of_xanaqu", "okeanus", "orion"], path: [{ x: 35.5, y: 78.8 }, { x: 52.0, y: 71.0 }, { x: 64.0, y: 54.0 }, { x: 72.8, y: 47.5 }] }
    ]
  };
})();
