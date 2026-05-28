// FILE: lib/utils/claimNumber.ts
// Auto-generates enterprise claim references: CLM-2026-HRE-00001

import { connectDB } from "@/lib/mongodb";
import Claim from "@/lib/models/Claim";

const BRANCH_CODES: Record<string, string> = {
  "Robinson House": "RBH",
  "Kensington":     "KEN",
  "Honey Dew":      "HDW",
  "Chipinge":       "CHI",
  "Chiredzi":       "CZI",
};

function getBranchCode(branchName: string): string {
  return (
    BRANCH_CODES[branchName] ||
    branchName
      .replace(/[^a-zA-Z]/g, "")
      .substring(0, 3)
      .toUpperCase() ||
    "UNK"
  );
}

export async function generateClaimReference(
  branch: string,
  currency: "USD" | "ZWG" = "USD"
): Promise<string> {
  await connectDB();

  const year = new Date().getFullYear();
  const branchCode = getBranchCode(branch);
  const prefix = currency === "ZWG" ? "Z" : "";

  // Find highest existing sequence for this year/branch/currency
  const pattern = new RegExp(
    `^${prefix}CLM-${year}-${branchCode}-\\d+$`
  );

  const latest = await Claim.findOne(
    { claimReference: { $regex: pattern } },
    { claimReference: 1 }
  )
    .sort({ claimReference: -1 })
    .lean();

  let sequence = 1;
  if (latest?.claimReference) {
    const parts = latest.claimReference.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }

  const seq = String(sequence).padStart(5, "0");
  return `${prefix}CLM-${year}-${branchCode}-${seq}`;
}

// Generate a suggested claim number for new claims
export function suggestClaimNumber(branch: string, currency: "USD" | "ZWG" = "USD"): string {
  const year = new Date().getFullYear();
  const branchCode = getBranchCode(branch);
  const rand = Math.floor(Math.random() * 9000) + 1000;
  const prefix = currency === "ZWG" ? "Z" : "";
  return `${prefix}CLM-${year}-${branchCode}-${rand}`;
}