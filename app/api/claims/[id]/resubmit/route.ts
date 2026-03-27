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

    // Create new claim linked to original
    const resubmitted = await Claim.create({
      claimNumber:       body.claimNumber,
      patientName:       original.patientName,
      patientId:         original.patientId,
      medicalAid:        original.medicalAid,
      memberNumber:      original.memberNumber,
      branch:            original.branch,
      serviceDate:       original.serviceDate,
      submissionDate:    body.submissionDate || new Date(),
      amount:            original.amount,
      status:            "pending",
      notes:             body.notes || "",
      resubmittedFrom:   original._id,
      resubmissionCount: (original.resubmissionCount || 0) + 1,
    });

    // Mark original as superseded so it doesn't pollute outstanding totals
    await Claim.findByIdAndUpdate(id, { status: "superseded" });

    return NextResponse.json({ success: true, data: resubmitted }, { status: 201 });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Resubmission failed" },
      { status: 500 }
    );
  }
}