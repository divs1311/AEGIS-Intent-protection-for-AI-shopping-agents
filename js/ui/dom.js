/* Aegis · UI helpers: escaping, formatting, icons, product illustrations, seal */
(function (A) {
  "use strict";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function inr(n) { return A.policy.inr(n); }
  function pct(x) { return A.policy.pct(x); }
  function days(d) { return d === 0 ? "Instant" : d === 1 ? "Tomorrow" : "In " + d + " days"; }
  function short(h, n) { return h ? h.slice(0, n || 8) : ""; }

  var P = {
    shield: '<path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    pause: '<path d="M9 6v12M15 6v12"/>',
    block: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    cart: '<path d="M3 4h2l2.4 11h10.2l2-8H6.3"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
    rules: '<path d="M5 6h9M18 6h1M5 12h3M12 12h7M5 18h11M20 18h-1"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    drift: '<path d="M4 18c3-1 4-7 7-7s3 4 5 4 3-5 4-8"/><path d="M4 21h16"/>',
    ledger: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
    lab: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 001.8 3h10.4a2 2 0 001.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    bot: '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4"/><circle cx="9" cy="13.5" r="1"/><circle cx="15" cy="13.5" r="1"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    edit: '<path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M13 7l4 4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.4"/>',
    truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    star: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    refresh: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 5v6h-6"/>',
    play: '<path d="M8 5v14l11-7z"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    chip: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'
  };

  function icon(name, size, cls) {
    size = size || 18;
    return '<svg class="ic' + (cls ? " " + cls : "") + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || "") + "</svg>";
  }

  var TH = {
    bottle: '<rect x="25" y="9" width="14" height="7" rx="2" fill="#AFC0EE"/><path d="M20 18h24a4 4 0 014 4v31a4 4 0 01-4 4H20a4 4 0 01-4-4V22a4 4 0 014-4z" fill="#E3E9FA"/><rect x="21" y="30" width="22" height="13" rx="3" fill="#3346C9"/>',
    fryer: '<rect x="15" y="12" width="34" height="42" rx="11" fill="#222C48"/><rect x="20" y="18" width="24" height="8" rx="3" fill="#3346C9"/><circle cx="32" cy="40" r="8" fill="#E3E9FA"/><path d="M28 40h8" stroke="#222C48" stroke-width="2" stroke-linecap="round"/>',
    phoneA: '<rect x="20" y="6" width="24" height="52" rx="6" fill="#1D2540"/><rect x="23" y="12" width="18" height="38" rx="3" fill="#E3E9FA"/><circle cx="26" cy="9.4" r="1.3" fill="#C9A44C"/><path d="M26 39l5-6 4 4 4-6" stroke="#1D2540" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
    phoneB: '<rect x="20" y="6" width="24" height="52" rx="6" fill="#3346C9"/><rect x="23" y="12" width="18" height="38" rx="3" fill="#EEF1FB"/><circle cx="26" cy="9.4" r="1.3" fill="#BFD0FF"/><path d="M26 39l5-6 4 4 4-6" stroke="#3346C9" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
    gift: '<rect x="13" y="26" width="38" height="28" rx="3" fill="#E3E9FA"/><rect x="11" y="19" width="42" height="9" rx="2" fill="#C0267D"/><rect x="29" y="19" width="6" height="35" fill="#C0267D"/><path d="M32 19c-4-8-12-8-11-2 1 3 6 3 11 2zM32 19c4-8 12-8 11-2-1 3-6 3-11 2z" fill="#C0267D"/>',
    renew: '<rect x="12" y="14" width="40" height="28" rx="4" fill="#222C48"/><path d="M28 23l9 5-9 5z" fill="#E3E9FA"/><rect x="24" y="46" width="16" height="3" rx="1.5" fill="#AFC0EE"/>',
    box: '<path d="M12 22l20-10 20 10v22L32 54 12 44z" fill="#E3E9FA"/><path d="M12 22l20 10 20-10M32 32v22" stroke="#3346C9" stroke-width="2" fill="none"/>'
  };
  function thumb(k) { return '<svg viewBox="0 0 64 64" class="thumb-svg" aria-hidden="true">' + (TH[k] || TH.box) + "</svg>"; }

  var VERDICT = {
    pass: { label: "Passed", word: "Countersigned", cls: "pass", icon: "check" },
    pause: { label: "Paused", word: "Paused for you", cls: "pause", icon: "pause" },
    block: { label: "Blocked", word: "Blocked", cls: "block", icon: "block" }
  };

  /* The countersignature seal: the one bold, memorable element. */
  function seal(verdict, hash, opts) {
    opts = opts || {};
    var v = VERDICT[verdict] || VERDICT.pass, size = opts.size || 112, id = "sealpath" + Math.random().toString(36).slice(2, 7);
    var ring = (verdict === "pass" ? "COUNTERSIGNED BY AEGIS" : verdict === "pause" ? "HELD FOR YOUR DECISION" : "STOPPED BEFORE PAYMENT") + " · " + short(hash, 6) + " · ";
    return '<svg class="seal seal-' + v.cls + (opts.animate ? " seal-in" : "") + '" width="' + size + '" height="' + size + '" viewBox="0 0 120 120" role="img" aria-label="' + esc(v.label) + '">' +
      '<defs><path id="' + id + '" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"/></defs>' +
      '<circle cx="60" cy="60" r="56" class="seal-outer"/><circle cx="60" cy="60" r="36" class="seal-inner"/>' +
      '<text class="seal-ring"><textPath href="#' + id + '" startOffset="0" textLength="280" lengthAdjust="spacing">' + esc(ring) + "</textPath></text>" +
      '<g transform="translate(48 40) scale(1)" class="seal-glyph">' + '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' + P[v.icon] + "</svg></g>" +
      '<text x="60" y="80" text-anchor="middle" class="seal-word">' + esc(v.label) + "</text></svg>";
  }

  function chip(verdict, text) {
    var v = VERDICT[verdict] || { cls: "info", icon: "info", label: verdict };
    return '<span class="chip chip-' + v.cls + '">' + icon(v.icon, 13) + esc(text || v.label) + "</span>";
  }

  A.ui = { esc: esc, inr: inr, pct: pct, days: days, short: short, icon: icon, thumb: thumb, seal: seal, chip: chip, VERDICT: VERDICT };
})(window.Aegis = window.Aegis || {});
