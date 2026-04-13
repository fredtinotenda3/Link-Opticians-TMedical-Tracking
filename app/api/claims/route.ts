import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Claim from "@/lib/models/Claim";

// GET all claims
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const filter: any = {};
    if (searchParams.get("status"))     filter.status     = searchParams.get("status");
    if (searchParams.get("medicalAid")) filter.medicalAid = searchParams.get("medicalAid");
    if (searchParams.get("branch"))     filter.branch     = searchParams.get("branch");
    if (searchParams.get("currency"))   filter.currency   = searchParams.get("currency");

    const claims = await Claim.find(filter).sort({ submissionDate: -1 });
    return NextResponse.json({ success: true, data: claims });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch claims" }, { status: 500 });
  }
}

// POST new claim
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const claim = await Claim.create(body);
    return NextResponse.json({ success: true, data: claim }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create claim" }, { status: 500 });
  }
}