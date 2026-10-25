/* Aegis · simulated scenario data
 * Every product, seller, price, delivery estimate and history event here is
 * fictional and illustrative. Nothing is a real measurement or listing.
 */
(function (A) {
  "use strict";

  A.CATEGORY_LABELS = {
    essentials: "Everyday essentials",
    kitchen: "Kitchen & home",
    electronics: "Electronics",
    gifts: "Gifts",
    subscriptions: "Subscriptions & renewals"
  };

  A.PRIORITY_LABELS = { value: "Value for money", speed: "Fastest delivery", quality: "Top-rated sellers" };

  A.DEFAULT_POLICY = {
    version: 1,
    cap: 15000,
    priorities: ["value", "speed", "quality"],
    tolerance: 0.10,
    rules: { capBlocks: true, pausePaidMisfit: true, minRating: 4.0 },
    autonomy: { essentials: "auto", kitchen: "auto", electronics: "auto", gifts: "auto", subscriptions: "never" },
    scoped: []
  };

  A.USER = { name: "Riya", agent: "Kai" };

  function offer(id, title, price, days, seller, rating, extra) {
    var o = { id: id, title: title, price: price, days: days, seller: seller, rating: rating, sponsored: false, tier: 2, thumb: "box" };
    for (var k in extra || {}) o[k] = extra[k];
    return o;
  }

  /* Each request: the need, the comparable offers on Flipkart (simulated), and how Kai frames its pick. */
  A.REQUESTS = {
    refill: {
      id: "refill", need: "Detergent refill (2 L)", category: "essentials", thumb: "bottle",
      offers: [
        offer("det-a", "Liquid detergent refill, 2 L", 549, 1, "HomeBasics Retail", 4.4, { thumb: "bottle" }),
        offer("det-b", "Liquid detergent refill, 2 L", 529, 3, "DailyNeeds Mart", 4.2, { thumb: "bottle" })
      ],
      rationale: { text: "Your usual detergent from your usual seller. You reorder about every five weeks.", inferences: [] }
    },
    fryer: {
      id: "fryer", need: "Air fryer for a family of four", category: "kitchen", thumb: "fryer",
      offers: [
        offer("fry-crisp", "CrispAir Pro air fryer, 5.5 L", 6499, 1, "CrispAir Brand Store", 4.5, { sponsored: true, tier: 3, thumb: "fryer" }),
        offer("fry-home", "HomeChef air fryer, 5 L", 4999, 3, "KitchenKart", 4.3, { thumb: "fryer" }),
        offer("fry-crisp-std", "CrispAir Pro air fryer, 5.5 L", 6349, 4, "ApplianceHub", 4.5, { sponsored: true, tier: 3, thumb: "fryer" }),
        offer("fry-cook", "Cookwell air fryer, 4.2 L", 4299, 2, "BudgetBazaar", 3.6, { thumb: "fryer" })
      ],
      rationale: { text: "Top result for “air fryer for four”. Well rated and arrives tomorrow.", inferences: [] }
    },
    phone: {
      id: "phone", need: "5G phone with a good camera", category: "electronics", thumb: "phone",
      offers: [
        offer("ph-nova", "Nova X5 Pro 5G, 8/256 GB", 17499, 1, "Nova Official Store", 4.6, { sponsored: true, tier: 3, thumb: "phoneA" }),
        offer("ph-kite-exp", "Kite 5G Plus, 8/128 GB", 14999, 1, "TechWorld Express", 4.3, { thumb: "phoneB" }),
        offer("ph-kite", "Kite 5G Plus, 8/128 GB", 13299, 4, "TechWorld", 4.3, { thumb: "phoneB" }),
        offer("ph-orbit", "Orbit M14 5G, 6/128 GB", 12499, 3, "QuickMobiles", 3.7, { thumb: "phoneB" })
      ],
      rationale: { text: "Premium build and next-day delivery. You've been choosing faster delivery lately, so I picked the quickest well-rated phone.", inferences: ["prefers_speed"] }
    },
    gift: {
      id: "gift", need: "Birthday gift for my sister, by Friday", category: "gifts", thumb: "gift",
      context: { deadlineDays: 3, label: "Needed by Friday" },
      offers: [
        offer("gift-exp", "Personalised photo frame", 1449, 1, "GiftCraft", 4.6, { thumb: "gift" }),
        offer("gift-2d", "Personalised photo frame", 1249, 2, "FrameStudio", 4.4, { thumb: "gift" }),
        offer("gift-std", "Personalised photo frame", 1099, 5, "FrameStudio", 4.4, { thumb: "gift" })
      ],
      rationale: { text: "It arrives tomorrow, well before Friday. You like paying for speed.", inferences: ["prefers_speed"] }
    },
    renewal: {
      id: "renewal", need: "Streaming plan renewal", category: "subscriptions", thumb: "renew",
      offers: [offer("ott", "StreamPlus annual plan", 1499, 0, "StreamPlus", 4.5, { thumb: "renew", days: 0 })],
      rationale: { text: "Your plan expires in 3 days. Renewing annually saves ₹289 over monthly.", inferences: [] }
    }
  };

  /* Ten orders over eight weeks. Question: when faster delivery costs extra, does Riya pay for it?
   * provenance: chosen = she picked it; defaulted = Kai pre-selected express and she didn't change it;
   * context = a one-off reason (a gift with a deadline). */
  A.EVIDENCE = [
    { id: "E1", date: "28 Aug", item: "Shampoo", offer: "Express +₹79", outcome: "standard", provenance: "chosen" },
    { id: "E2", date: "02 Sep", item: "Phone charger", offer: "Express +₹99", outcome: "standard", provenance: "chosen" },
    { id: "E3", date: "06 Sep", item: "Gift for a friend", offer: "Express +₹149", outcome: "express", provenance: "context" },
    { id: "E4", date: "11 Sep", item: "Notebooks", offer: "Express +₹49", outcome: "standard", provenance: "chosen" },
    { id: "E5", date: "16 Sep", item: "Coffee beans", offer: "Express pre-selected", outcome: "express", provenance: "defaulted" },
    { id: "E6", date: "21 Sep", item: "Desk lamp", offer: "Express +₹99", outcome: "standard", provenance: "chosen" },
    { id: "E7", date: "27 Sep", item: "Earbuds", offer: "Express pre-selected", outcome: "express", provenance: "defaulted" },
    { id: "E8", date: "03 Oct", item: "Phone case", offer: "Express pre-selected", outcome: "express", provenance: "defaulted" },
    { id: "E9", date: "09 Oct", item: "Detergent", offer: "Express +₹59", outcome: "standard", provenance: "chosen" },
    { id: "E10", date: "15 Oct", item: "Water bottle", offer: "Express pre-selected", outcome: "express", provenance: "defaulted" }
  ];
})(window.Aegis = window.Aegis || {});
