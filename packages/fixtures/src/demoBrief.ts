import { InventoryBrief } from "@lastrack/contracts";

export const SYNTHETIC_JUDGE_BRIEF: InventoryBrief = {
  itemName: "Olive Linen Overshirt",
  category: "Apparel / Tops",
  colorMaterials: ["Olive Green", "100% Washed European Linen", "Horn Buttons"],
  unitsOnHand: 42,
  daysSlow: 28,
  city: "Brooklyn, New York",
  currency: "USD",
  budgetCap: 600,
  maxMarkdownPercent: 10,
  testWindowDays: 14,
  anchorNames: [
    { name: "A24", expectedType: "brand" },
    { name: "Phoebe Bridgers", expectedType: "person" },
    { name: "Bode", expectedType: "brand" },
  ],
  forbiddenTactics: [
    "paid influencer campaign",
    "individual demographic targeting",
  ],
  isSyntheticDemo: true,
};
