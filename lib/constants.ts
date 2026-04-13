export const MEDICAL_AIDS = [
  "PSMAS",
  "CIMAS",
  "Emerald",
  "Advantage Health",
  "Fidelity Life",
  "First Mutual",
  "Alliance Health",
  "Cellmed Health",
  "FBC health",
  "EMF",
  "Minerva",
  "Maisha",
  "Other",
];

export const BRANCHES = [
  "Robinson House",
  "Kensington",
  "Honey Dew",
  "Chipinge",
  "Chiredzi",
];

export const STATUSES = ["pending", "approved", "rejected", "paid", "partial"] as const;

// NEW: Currency options
export const CURRENCIES = ["USD", "ZWG"] as const;
export type Currency = typeof CURRENCIES[number];