// FILE: app/api/claims/[id]/resubmit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Claim from "@/lib/models/Claim";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const original = await Claim.findById(id);
    if (!original) {
      return NextResponse.json({ success: false, error: "Claim not found" }, { status: 404 });
    }

    if (original.status !== "rejected") {
      return NextResponse.json(
        { success: false, error: "Only rejected claims can be resubmitted" },
        { status: 400 }
      );
    }

    const body = await req.json(); // { claimNumber, submissionDate, notes }

    // Create new claim linked to original, preserving currency and amount
    const resubmittedData: any = {
      claimNumber:       body.claimNumber,
      patientName:       original.patientName,
      patientId:         original.patientId,
      medicalAid:        original.medicalAid,
      memberNumber:      original.memberNumber,
      branch:            original.branch,
      serviceDate:       original.serviceDate,
      submissionDate:    body.submissionDate || new Date(),
      currency:          original.currency,
      status:            "pending",
      notes:             body.notes || "",
      resubmittedFrom:   original._id,
      resubmissionCount: (original.resubmissionCount || 0) + 1,
    };
    
    // Handle amount based on original currency
    if (original.currency === 'ZWG') {
      resubmittedData.amountZWG = original.amountZWG || original.amount;
      resubmittedData.amount = 0;
    } else {
      resubmittedData.amount = original.amount;
      resubmittedData.amountZWG = undefined;
    }

    const resubmitted = await Claim.create(resubmittedData);

    // Mark original as superseded
    await Claim.findByIdAndUpdate(id, { status: "superseded" });

    // Transform response
    const responseClaim = resubmitted.toObject();
    if (responseClaim.currency === 'ZWG' && responseClaim.amountZWG) {
      responseClaim.amount = responseClaim.amountZWG;
    }

    return NextResponse.json({ success: true, data: responseClaim }, { status: 201 });
  } catch (error) {
    console.error('Resubmission error:', error);
    return NextResponse.json(
      { success: false, error: "Resubmission failed" },
      { status: 500 }
    );
  }
}