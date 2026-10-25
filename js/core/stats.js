/* Aegis core · stats
 * Seeded PRNG (mulberry32) for reproducible simulations, and Beta-distribution
 * helpers evaluated on a fine grid (density, mean, credible interval).
 */
(function (A) {
  "use strict";

  function mulberry32(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var GRID = 801;

  /* Beta(a, b) density on a grid over (0,1); returns {xs, ys} normalised to integrate to 1. */
  function betaGrid(a, b) {
    var xs = new Float64Array(GRID), ys = new Float64Array(GRID), i, x, lmax = -Infinity, lp = new Float64Array(GRID);
    for (i = 0; i < GRID; i++) {
      x = (i + 0.5) / GRID; xs[i] = x;
      lp[i] = (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x);
      if (lp[i] > lmax) lmax = lp[i];
    }
    var sum = 0;
    for (i = 0; i < GRID; i++) { ys[i] = Math.exp(lp[i] - lmax); sum += ys[i]; }
    var dx = 1 / GRID;
    for (i = 0; i < GRID; i++) ys[i] = ys[i] / (sum * dx);
    return { xs: xs, ys: ys };
  }

  function betaMean(a, b) { return a / (a + b); }

  /* Equal-tailed credible interval at level `level` (e.g. 0.9). */
  function betaInterval(a, b, level) {
    var g = betaGrid(a, b), dx = 1 / GRID, cum = 0, lo = null, hi = null, tail = (1 - level) / 2;
    for (var i = 0; i < GRID; i++) {
      cum += g.ys[i] * dx;
      if (lo === null && cum >= tail) lo = g.xs[i];
      if (hi === null && cum >= 1 - tail) { hi = g.xs[i]; break; }
    }
    return [lo, hi === null ? 1 : hi];
  }

  /* Probability mass of Beta(a,b) above x. */
  function betaTail(a, b, x) {
    var g = betaGrid(a, b), dx = 1 / GRID, m = 0;
    for (var i = 0; i < GRID; i++) if (g.xs[i] > x) m += g.ys[i] * dx;
    return m;
  }

  A.stats = { mulberry32: mulberry32, betaGrid: betaGrid, betaMean: betaMean, betaInterval: betaInterval, betaTail: betaTail };
})(window.Aegis = window.Aegis || {});
