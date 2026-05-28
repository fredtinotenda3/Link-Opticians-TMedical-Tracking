// FILE: lib/automation/risk.engine.ts
// Detects duplicate claims, missing data, and suspicious submissions before creation

import { connectDB } from "@/lib/mongodb";
import Claim from "@/lib/models/Claim";

export interface RiskAssessment {
  score: number;        // 0–100
  level: "low" | "medium" | "high" | "critical";
  flags: string[];
  recommendations: string[];
}

export class ClaimRiskEngine {
  static async assess(claimData: Partial<any>): Promise<RiskAssessment> {
    await connectDB();

    const flags: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // 1. Check for duplicate claim number
    if (claimData.claimNumber) {
      const duplicate = await Claim.findOne({
        claimNumber: claimData.claimNumber,
        isDeleted: false,
        status: { $nin: ["superseded", "rejected"] },
      });
      if (duplicate) {
        flags.push(`Duplicate claim number: ${claimData.claimNumber} already exists`);
        recommendations.push("Verify this is not a duplicate submission");
        score += 40;
      }
    }

    // 2. Check for same patient + same service date (possible duplicate service)
    if (claimData.patientId && claimData.serviceDate && claimData.medicalAid) {
      const sameService = await Claim.findOne({
        patientId: claimData.patientId,
        serviceDate: new Date(claimData.serviceDate),
        medicalAid: claimData.medicalAid,
        isDeleted: false,
        status: { $nin: ["superseded", "rejected"] },
      });
      if (sameService) {
        flags.push(
          `Patient ${claimData.patientName} already has a claim for ${claimData.medicalAid} on this service date`
        );
        recommendations.push("Check if this is a resubmission or duplicate");
        score += 25;
      }
    }

    // 3. Missing invoice number
    if (!claimData.invoiceNumber) {
      flags.push("No invoice number provided");
      recommendations.push("Add invoice number for better tracking");
      score += 5;
    }

    // 4. Future service date
    if (claimData.serviceDate && new Date(claimData.serviceDate) > new Date()) {
      flags.push("Service date is in the future");
      recommendations.push("Verify service date is correct");
      score += 15;
    }

    // 5. Service date after submission date
    if (
      claimData.serviceDate &&
      claimData.submissionDate &&
      new Date(claimData.serviceDate) > new Date(claimData.submissionDate)
    ) {
      flags.push("Service date is after submission date");
      recommendations.push("Service date cannot be after the date of submission");
      score += 20;
    }

    // 6. Unusually high amount
    const amount = claimData.amountZWG || claimData.amount || 0;
    const currency = claimData.currency || "USD";
    const HIGH_THRESHOLD = currency === "USD" ? 500 : 500000;
    if (amount > HIGH_THRESHOLD) {
      flags.push(`Unusually high claim amount: ${amount} ${currency}`);
      recommendations.push("Verify claim amount with supporting documentation");
      score += 15;
    }

    // 7. Same member + same medical aid — multiple active claims
    if (claimData.memberNumber && claimData.medicalAid) {
      const activeCount = await Claim.countDocuments({
        memberNumber: claimData.memberNumber,
        medicalAid: claimData.medicalAid,
        status: { $in: ["pending", "approved"] },
        isDeleted: false,
      });
      if (activeCount >= 3) {
        flags.push(
          `Member ${claimData.memberNumber} already has ${activeCount} active claims with ${claimData.medicalAid}`
        );
        recommendations.push("Review member's claim history before submission");
        score += 10;
      }
    }

    // Clamp score
    score = Math.min(score, 100);

    const level: RiskAssessment["level"] =
      score >= 60 ? "critical" :
      score >= 35 ? "high" :
      score >= 15 ? "medium" : "low";

    return { score, level, flags, recommendations };
  }

  static getRiskLabel(score: number): string {
    if (score >= 60) return "⚠️ Critical Risk";
    if (score >= 35) return "⚠️ High Risk";
    if (score >= 15) return "⚠️ Medium Risk";
    return "✅ Low Risk";
  }

  static getRiskColor(score: number): string {
    if (score >= 60) return "text-red-700 bg-red-50 border-red-200";
    if (score >= 35) return "text-orange-700 bg-orange-50 border-orange-200";
    if (score >= 15) return "text-yellow-700 bg-yellow-50 border-yellow-200";
    return "text-green-700 bg-green-50 border-green-200";
  }
}