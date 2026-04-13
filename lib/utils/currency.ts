export function formatCurrency(amount: number, currency: "USD" | "ZWG"): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } else {
    return new Intl.NumberFormat("en-ZW", {
      style: "currency",
      currency: "ZWG",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

export function getCurrencySymbol(currency: "USD" | "ZWG"): string {
  return currency === "USD" ? "$" : "ZWG ";
}