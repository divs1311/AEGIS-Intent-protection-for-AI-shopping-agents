/* Aegis core · tamper-evident decision ledger
 *
 * Append-only and hash-chained: each entry stores the hash of the one before it,
 * and its own hash covers its content plus that link. Changing any past entry
 * breaks verification from that entry onward, so the record can't be quietly
 * rewritten by the agent, a merchandising system or anyone else.
 *
 * Countersignatures use HMAC-SHA-256 with a demo device key. In production the
 * key would live in secure hardware on the user's device; here it is simulated.
 */
(function (A) {
  "use strict";

  var C = A.crypto;
  var GENESIS = "0000000000000000000000000000000000000000000000000000000000000000";
  var DEMO_KEY = "aegis-demo-device-key (simulated, not a real secret)";

  function entryBody(e) {
    return { seq: e.seq, t: e.t, kind: e.kind, actor: e.actor, title: e.title, detail: e.detail, outcome: e.outcome, policyVersion: e.policyVersion, prev: e.prev };
  }

  function create() {
    var entries = [];
    return {
      entries: entries,
      head: function () { return entries.length ? entries[entries.length - 1].hash : GENESIS; },
      append: function (e) {
        var rec = {
          seq: entries.length + 1, t: e.t, kind: e.kind, actor: e.actor, title: e.title,
          detail: e.detail || "", outcome: e.outcome, policyVersion: e.policyVersion, prev: this.head()
        };
        rec.hash = C.sha256(C.canonical(entryBody(rec)));
        entries.push(rec);
        return rec;
      },
      verify: function () {
        var prev = GENESIS;
        for (var i = 0; i < entries.length; i++) {
          var e = entries[i];
          if (e.prev !== prev) return { ok: false, brokenAt: e.seq, reason: "link" };
          if (C.sha256(C.canonical(entryBody(e))) !== e.hash) return { ok: false, brokenAt: e.seq, reason: "content" };
          prev = e.hash;
        }
        return { ok: true, count: entries.length, head: prev };
      }
    };
  }

  /* Countersign an approved cart: binds cart, policy version and verdict together. */
  function countersign(cart, policyHash, verdict, decisionId) {
    var payload = { cart: C.sha256(C.canonical(cart)), policy: policyHash, verdict: verdict, decision: decisionId };
    return { payload: payload, sig: C.hmacSha256(DEMO_KEY, C.canonical(payload)), alg: "HMAC-SHA256 (demo key)" };
  }

  function checkSignature(sigObj) {
    return C.hmacSha256(DEMO_KEY, C.canonical(sigObj.payload)) === sigObj.sig;
  }

  A.ledger = { create: create, countersign: countersign, checkSignature: checkSignature, GENESIS: GENESIS };
})(window.Aegis = window.Aegis || {});
