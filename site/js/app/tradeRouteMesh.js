(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  root.AGGS_TRADE_ROUTE_MESH = {
  "version": "map-derived-overlay-v1",
  "sourceAsset": "assets/ag-trade-zones.png",
  "width": 8800,
  "height": 5806,
  "nodes": [
    {
      "id": "zone:vesperan_strait",
      "zoneId": "vesperan_strait",
      "label": "Vesperan Strait",
      "type": "strait",
      "color": "#5e464b",
      "chokepoint": true,
      "x": 6.674,
      "y": 72.516,
      "sampleCount": 100853,
      "source": "overlay-color",
      "bounds": {
        "x": 3.432,
        "y": 21.03,
        "width": 62.909,
        "height": 53.893
      }
    },
    {
      "id": "zone:boynak_canal",
      "zoneId": "boynak_canal",
      "label": "Boynak Canal",
      "type": "strait",
      "color": "#2f81bb",
      "chokepoint": true,
      "x": 4.427,
      "y": 52.046,
      "sampleCount": 5744,
      "source": "overlay-color",
      "bounds": {
        "x": 3.693,
        "y": 50.81,
        "width": 1.83,
        "height": 2.256
      }
    },
    {
      "id": "zone:ve_ulka_canal",
      "zoneId": "ve_ulka_canal",
      "label": "Ve Ulka Canal",
      "type": "strait",
      "color": "#cfd75c",
      "chokepoint": true,
      "x": 97.774,
      "y": 66.004,
      "sampleCount": 2344,
      "source": "overlay-color",
      "bounds": {
        "x": 97.352,
        "y": 65.518,
        "width": 1.057,
        "height": 0.947
      }
    },
    {
      "id": "zone:bakor_canal",
      "zoneId": "bakor_canal",
      "label": "Bakor Canal",
      "type": "strait",
      "color": "#4ba24b",
      "chokepoint": true,
      "x": 95.983,
      "y": 40.478,
      "sampleCount": 1169,
      "source": "overlay-color",
      "bounds": {
        "x": 95.398,
        "y": 39.752,
        "width": 1.261,
        "height": 1.395
      }
    },
    {
      "id": "zone:rosanovka",
      "zoneId": "rosanovka",
      "label": "Rosanovka",
      "type": "strait",
      "color": "#cf87ac",
      "chokepoint": true,
      "x": 36.553,
      "y": 15.258,
      "sampleCount": 52636,
      "source": "overlay-color",
      "bounds": {
        "x": 33.432,
        "y": 13.899,
        "width": 6.523,
        "height": 4.013
      }
    },
    {
      "id": "zone:hoshiya",
      "zoneId": "hoshiya",
      "label": "Hoshiya",
      "type": "sea_zone",
      "color": "#183b41",
      "chokepoint": false,
      "x": 43.293,
      "y": 24.85,
      "sampleCount": 502609,
      "source": "overlay-color",
      "bounds": {
        "x": 38.045,
        "y": 15.088,
        "width": 11.932,
        "height": 18.877
      }
    },
    {
      "id": "zone:azagorian",
      "zoneId": "azagorian",
      "label": "Azagorian",
      "type": "sea_zone",
      "color": "#181e41",
      "chokepoint": false,
      "x": 23.995,
      "y": 36.832,
      "sampleCount": 3414223,
      "source": "overlay-color",
      "bounds": {
        "x": 9.318,
        "y": 12.78,
        "width": 29.943,
        "height": 51.602
      }
    },
    {
      "id": "zone:beryl_strait",
      "zoneId": "beryl_strait",
      "label": "Beryl Strait",
      "type": "strait",
      "color": "#3d1841",
      "chokepoint": true,
      "x": 1.017,
      "y": 62.012,
      "sampleCount": 49159,
      "source": "overlay-color",
      "bounds": {
        "x": 0.045,
        "y": 58.595,
        "width": 2.057,
        "height": 6.579
      }
    },
    {
      "id": "zone:hano",
      "zoneId": "hano",
      "label": "Hano",
      "type": "sea_zone",
      "color": "#8b546d",
      "chokepoint": false,
      "x": 93.029,
      "y": 54.746,
      "sampleCount": 200328,
      "source": "overlay-color",
      "bounds": {
        "x": 90.761,
        "y": 46.917,
        "width": 4.659,
        "height": 15.88
      }
    },
    {
      "id": "zone:orion",
      "zoneId": "orion",
      "label": "Orion",
      "type": "sea_zone",
      "color": "#8b6754",
      "chokepoint": false,
      "x": 62.045,
      "y": 38.944,
      "sampleCount": 1243526,
      "source": "overlay-color",
      "bounds": {
        "x": 53.716,
        "y": 28.264,
        "width": 15.307,
        "height": 23.51
      }
    },
    {
      "id": "zone:marcius",
      "zoneId": "marcius",
      "label": "Marcius",
      "type": "sea_zone",
      "color": "#70548b",
      "chokepoint": false,
      "x": 4.366,
      "y": 67.558,
      "sampleCount": 242538,
      "source": "overlay-color",
      "bounds": {
        "x": 0.545,
        "y": 62.573,
        "width": 7.864,
        "height": 10.455
      }
    },
    {
      "id": "zone:okeanus",
      "zoneId": "okeanus",
      "label": "Okeanus",
      "type": "sea_zone",
      "color": "#7a5bc2",
      "chokepoint": false,
      "x": 12.203,
      "y": 60.448,
      "sampleCount": 318835,
      "source": "overlay-color",
      "bounds": {
        "x": 7.636,
        "y": 52.497,
        "width": 10.591,
        "height": 15.983
      }
    },
    {
      "id": "zone:karthalis",
      "zoneId": "karthalis",
      "label": "Karthalis",
      "type": "sea_zone",
      "color": "#82d322",
      "chokepoint": false,
      "x": 86.0,
      "y": 8.0,
      "sampleCount": 0,
      "source": "fallback-anchor",
      "bounds": {
        "x": 85.5,
        "y": 7.5,
        "width": 1,
        "height": 1
      }
    },
    {
      "id": "zone:newberry_strait",
      "zoneId": "newberry_strait",
      "label": "Newberry Strait",
      "type": "strait",
      "color": "#ff00fe",
      "chokepoint": true,
      "x": 9.2,
      "y": 37.4,
      "sampleCount": 0,
      "source": "fallback-anchor",
      "bounds": {
        "x": 8.7,
        "y": 36.9,
        "width": 1,
        "height": 1
      }
    },
    {
      "id": "zone:corvessa",
      "zoneId": "corvessa",
      "label": "Corvessa",
      "type": "sea_zone",
      "color": "#6cadc6",
      "chokepoint": false,
      "x": 97.0,
      "y": 39.0,
      "sampleCount": 0,
      "source": "fallback-anchor",
      "bounds": {
        "x": 96.5,
        "y": 38.5,
        "width": 1,
        "height": 1
      }
    },
    {
      "id": "zone:mare_solthar",
      "zoneId": "mare_solthar",
      "label": "Mare Solthar",
      "type": "sea_zone",
      "color": "#00ffff",
      "chokepoint": false,
      "x": 94.0,
      "y": 30.0,
      "sampleCount": 0,
      "source": "fallback-anchor",
      "bounds": {
        "x": 93.5,
        "y": 29.5,
        "width": 1,
        "height": 1
      }
    },
    {
      "id": "zone:caldran_ocean",
      "zoneId": "caldran_ocean",
      "label": "Caldran Ocean",
      "type": "sea_zone",
      "color": "#441521",
      "chokepoint": false,
      "x": 23.0,
      "y": 82.0,
      "sampleCount": 0,
      "source": "fallback-anchor",
      "bounds": {
        "x": 22.5,
        "y": 81.5,
        "width": 1,
        "height": 1
      }
    },
    {
      "id": "zone:whitewater",
      "zoneId": "whitewater",
      "label": "Whitewater",
      "type": "sea_zone",
      "color": "#e6e6e6",
      "chokepoint": false,
      "x": 43.188,
      "y": 63.305,
      "sampleCount": 314,
      "source": "overlay-color",
      "bounds": {
        "x": 0.0,
        "y": 3.548,
        "width": 99.761,
        "height": 94.643
      }
    },
    {
      "id": "zone:crownward",
      "zoneId": "crownward",
      "label": "Crownward",
      "type": "sea_zone",
      "color": "#f2fc24",
      "chokepoint": false,
      "x": 99.0,
      "y": 70.0,
      "sampleCount": 0,
      "source": "fallback-anchor",
      "bounds": {
        "x": 98.5,
        "y": 69.5,
        "width": 1,
        "height": 1
      }
    },
    {
      "id": "zone:sea_of_xanaqu",
      "zoneId": "sea_of_xanaqu",
      "label": "Sea of Xanaqu",
      "type": "sea_zone",
      "color": "#fe3521",
      "chokepoint": false,
      "x": 38.0,
      "y": 74.0,
      "sampleCount": 0,
      "source": "fallback-anchor",
      "bounds": {
        "x": 37.5,
        "y": 73.5,
        "width": 1,
        "height": 1
      }
    },
    {
      "id": "zone:the_storm_expanse",
      "zoneId": "the_storm_expanse",
      "label": "The Storm Expanse",
      "type": "sea_zone",
      "color": "#0f1c21",
      "chokepoint": false,
      "x": 56.0,
      "y": 82.0,
      "sampleCount": 0,
      "source": "fallback-anchor",
      "bounds": {
        "x": 55.5,
        "y": 81.5,
        "width": 1,
        "height": 1
      }
    }
  ],
  "edges": [
    {
      "from": "zone:azagorian",
      "to": "zone:boynak_canal",
      "mode": "maritime",
      "cost": 20.325,
      "chokepoints": [
        "boynak_canal"
      ]
    },
    {
      "from": "zone:azagorian",
      "to": "zone:hoshiya",
      "mode": "maritime",
      "cost": 22.715,
      "chokepoints": []
    },
    {
      "from": "zone:azagorian",
      "to": "zone:newberry_strait",
      "mode": "maritime",
      "cost": 12.141,
      "chokepoints": [
        "newberry_strait"
      ]
    },
    {
      "from": "zone:azagorian",
      "to": "zone:okeanus",
      "mode": "maritime",
      "cost": 26.396,
      "chokepoints": []
    },
    {
      "from": "zone:azagorian",
      "to": "zone:rosanovka",
      "mode": "maritime",
      "cost": 20.469,
      "chokepoints": [
        "rosanovka"
      ]
    },
    {
      "from": "zone:bakor_canal",
      "to": "zone:corvessa",
      "mode": "maritime",
      "cost": 1.471,
      "chokepoints": [
        "bakor_canal"
      ]
    },
    {
      "from": "zone:bakor_canal",
      "to": "zone:crownward",
      "mode": "maritime",
      "cost": 24.334,
      "chokepoints": [
        "bakor_canal"
      ]
    },
    {
      "from": "zone:bakor_canal",
      "to": "zone:hano",
      "mode": "maritime",
      "cost": 11.948,
      "chokepoints": [
        "bakor_canal"
      ]
    },
    {
      "from": "zone:bakor_canal",
      "to": "zone:karthalis",
      "mode": "maritime",
      "cost": 27.862,
      "chokepoints": [
        "bakor_canal"
      ]
    },
    {
      "from": "zone:bakor_canal",
      "to": "zone:mare_solthar",
      "mode": "maritime",
      "cost": 8.744,
      "chokepoints": [
        "bakor_canal"
      ]
    },
    {
      "from": "zone:bakor_canal",
      "to": "zone:orion",
      "mode": "maritime",
      "cost": 27.858,
      "chokepoints": [
        "bakor_canal"
      ]
    },
    {
      "from": "zone:bakor_canal",
      "to": "zone:ve_ulka_canal",
      "mode": "maritime",
      "cost": 20.983,
      "chokepoints": [
        "bakor_canal",
        "ve_ulka_canal"
      ]
    },
    {
      "from": "zone:beryl_strait",
      "to": "zone:boynak_canal",
      "mode": "maritime",
      "cost": 8.637,
      "chokepoints": [
        "beryl_strait",
        "boynak_canal"
      ]
    },
    {
      "from": "zone:beryl_strait",
      "to": "zone:marcius",
      "mode": "maritime",
      "cost": 5.313,
      "chokepoints": [
        "beryl_strait"
      ]
    },
    {
      "from": "zone:beryl_strait",
      "to": "zone:newberry_strait",
      "mode": "maritime",
      "cost": 21.268,
      "chokepoints": [
        "newberry_strait",
        "beryl_strait"
      ]
    },
    {
      "from": "zone:beryl_strait",
      "to": "zone:okeanus",
      "mode": "maritime",
      "cost": 9.262,
      "chokepoints": [
        "beryl_strait"
      ]
    },
    {
      "from": "zone:beryl_strait",
      "to": "zone:vesperan_strait",
      "mode": "maritime",
      "cost": 9.783,
      "chokepoints": [
        "beryl_strait",
        "vesperan_strait"
      ]
    },
    {
      "from": "zone:boynak_canal",
      "to": "zone:marcius",
      "mode": "maritime",
      "cost": 12.72,
      "chokepoints": [
        "boynak_canal"
      ]
    },
    {
      "from": "zone:boynak_canal",
      "to": "zone:newberry_strait",
      "mode": "maritime",
      "cost": 12.631,
      "chokepoints": [
        "newberry_strait",
        "boynak_canal"
      ]
    },
    {
      "from": "zone:boynak_canal",
      "to": "zone:okeanus",
      "mode": "maritime",
      "cost": 9.387,
      "chokepoints": [
        "boynak_canal"
      ]
    },
    {
      "from": "zone:boynak_canal",
      "to": "zone:vesperan_strait",
      "mode": "maritime",
      "cost": 16.886,
      "chokepoints": [
        "boynak_canal",
        "vesperan_strait"
      ]
    },
    {
      "from": "zone:caldran_ocean",
      "to": "zone:marcius",
      "mode": "maritime",
      "cost": 23.575,
      "chokepoints": []
    },
    {
      "from": "zone:caldran_ocean",
      "to": "zone:okeanus",
      "mode": "maritime",
      "cost": 24.105,
      "chokepoints": []
    },
    {
      "from": "zone:caldran_ocean",
      "to": "zone:sea_of_xanaqu",
      "mode": "maritime",
      "cost": 17.0,
      "chokepoints": []
    },
    {
      "from": "zone:caldran_ocean",
      "to": "zone:the_storm_expanse",
      "mode": "maritime",
      "cost": 33.0,
      "chokepoints": []
    },
    {
      "from": "zone:caldran_ocean",
      "to": "zone:vesperan_strait",
      "mode": "maritime",
      "cost": 15.482,
      "chokepoints": [
        "vesperan_strait"
      ]
    },
    {
      "from": "zone:caldran_ocean",
      "to": "zone:whitewater",
      "mode": "maritime",
      "cost": 27.515,
      "chokepoints": []
    },
    {
      "from": "zone:corvessa",
      "to": "zone:crownward",
      "mode": "maritime",
      "cost": 31.064,
      "chokepoints": []
    },
    {
      "from": "zone:corvessa",
      "to": "zone:hano",
      "mode": "maritime",
      "cost": 16.239,
      "chokepoints": []
    },
    {
      "from": "zone:corvessa",
      "to": "zone:karthalis",
      "mode": "maritime",
      "cost": 32.894,
      "chokepoints": []
    },
    {
      "from": "zone:corvessa",
      "to": "zone:mare_solthar",
      "mode": "maritime",
      "cost": 9.487,
      "chokepoints": []
    },
    {
      "from": "zone:corvessa",
      "to": "zone:ve_ulka_canal",
      "mode": "maritime",
      "cost": 22.152,
      "chokepoints": [
        "ve_ulka_canal"
      ]
    },
    {
      "from": "zone:crownward",
      "to": "zone:hano",
      "mode": "maritime",
      "cost": 16.381,
      "chokepoints": []
    },
    {
      "from": "zone:crownward",
      "to": "zone:mare_solthar",
      "mode": "maritime",
      "cost": 40.311,
      "chokepoints": []
    },
    {
      "from": "zone:crownward",
      "to": "zone:the_storm_expanse",
      "mode": "maritime",
      "cost": 44.643,
      "chokepoints": []
    },
    {
      "from": "zone:crownward",
      "to": "zone:ve_ulka_canal",
      "mode": "maritime",
      "cost": 3.427,
      "chokepoints": [
        "ve_ulka_canal"
      ]
    },
    {
      "from": "zone:hano",
      "to": "zone:mare_solthar",
      "mode": "maritime",
      "cost": 24.765,
      "chokepoints": []
    },
    {
      "from": "zone:hano",
      "to": "zone:orion",
      "mode": "maritime",
      "cost": 34.781,
      "chokepoints": []
    },
    {
      "from": "zone:hano",
      "to": "zone:ve_ulka_canal",
      "mode": "maritime",
      "cost": 10.018,
      "chokepoints": [
        "ve_ulka_canal"
      ]
    },
    {
      "from": "zone:hoshiya",
      "to": "zone:karthalis",
      "mode": "maritime",
      "cost": 45.911,
      "chokepoints": []
    },
    {
      "from": "zone:hoshiya",
      "to": "zone:newberry_strait",
      "mode": "maritime",
      "cost": 29.79,
      "chokepoints": [
        "newberry_strait"
      ]
    },
    {
      "from": "zone:hoshiya",
      "to": "zone:orion",
      "mode": "maritime",
      "cost": 23.458,
      "chokepoints": []
    },
    {
      "from": "zone:hoshiya",
      "to": "zone:rosanovka",
      "mode": "maritime",
      "cost": 9.613,
      "chokepoints": [
        "rosanovka"
      ]
    },
    {
      "from": "zone:hoshiya",
      "to": "zone:whitewater",
      "mode": "maritime",
      "cost": 38.455,
      "chokepoints": []
    },
    {
      "from": "zone:karthalis",
      "to": "zone:mare_solthar",
      "mode": "maritime",
      "cost": 23.409,
      "chokepoints": []
    },
    {
      "from": "zone:karthalis",
      "to": "zone:orion",
      "mode": "maritime",
      "cost": 39.133,
      "chokepoints": []
    },
    {
      "from": "zone:marcius",
      "to": "zone:newberry_strait",
      "mode": "maritime",
      "cost": 25.045,
      "chokepoints": [
        "newberry_strait"
      ]
    },
    {
      "from": "zone:marcius",
      "to": "zone:okeanus",
      "mode": "maritime",
      "cost": 10.582,
      "chokepoints": []
    },
    {
      "from": "zone:marcius",
      "to": "zone:vesperan_strait",
      "mode": "maritime",
      "cost": 4.484,
      "chokepoints": [
        "vesperan_strait"
      ]
    },
    {
      "from": "zone:mare_solthar",
      "to": "zone:orion",
      "mode": "maritime",
      "cost": 33.183,
      "chokepoints": []
    },
    {
      "from": "zone:mare_solthar",
      "to": "zone:ve_ulka_canal",
      "mode": "maritime",
      "cost": 29.685,
      "chokepoints": [
        "ve_ulka_canal"
      ]
    },
    {
      "from": "zone:newberry_strait",
      "to": "zone:okeanus",
      "mode": "maritime",
      "cost": 19.059,
      "chokepoints": [
        "newberry_strait"
      ]
    },
    {
      "from": "zone:newberry_strait",
      "to": "zone:rosanovka",
      "mode": "maritime",
      "cost": 28.857,
      "chokepoints": [
        "rosanovka",
        "newberry_strait"
      ]
    },
    {
      "from": "zone:okeanus",
      "to": "zone:sea_of_xanaqu",
      "mode": "maritime",
      "cost": 29.14,
      "chokepoints": []
    },
    {
      "from": "zone:okeanus",
      "to": "zone:vesperan_strait",
      "mode": "maritime",
      "cost": 10.885,
      "chokepoints": [
        "vesperan_strait"
      ]
    },
    {
      "from": "zone:okeanus",
      "to": "zone:whitewater",
      "mode": "maritime",
      "cost": 31.116,
      "chokepoints": []
    },
    {
      "from": "zone:orion",
      "to": "zone:rosanovka",
      "mode": "maritime",
      "cost": 28.534,
      "chokepoints": [
        "rosanovka"
      ]
    },
    {
      "from": "zone:orion",
      "to": "zone:the_storm_expanse",
      "mode": "maritime",
      "cost": 43.478,
      "chokepoints": []
    },
    {
      "from": "zone:orion",
      "to": "zone:whitewater",
      "mode": "maritime",
      "cost": 30.807,
      "chokepoints": []
    },
    {
      "from": "zone:rosanovka",
      "to": "zone:whitewater",
      "mode": "maritime",
      "cost": 39.772,
      "chokepoints": [
        "rosanovka"
      ]
    },
    {
      "from": "zone:sea_of_xanaqu",
      "to": "zone:the_storm_expanse",
      "mode": "maritime",
      "cost": 19.698,
      "chokepoints": []
    },
    {
      "from": "zone:sea_of_xanaqu",
      "to": "zone:vesperan_strait",
      "mode": "maritime",
      "cost": 25.716,
      "chokepoints": [
        "vesperan_strait"
      ]
    },
    {
      "from": "zone:sea_of_xanaqu",
      "to": "zone:whitewater",
      "mode": "maritime",
      "cost": 11.887,
      "chokepoints": []
    },
    {
      "from": "zone:the_storm_expanse",
      "to": "zone:whitewater",
      "mode": "maritime",
      "cost": 22.664,
      "chokepoints": []
    }
  ]
};
})();
