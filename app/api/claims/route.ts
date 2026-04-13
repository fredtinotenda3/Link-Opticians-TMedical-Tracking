// FILE: app/api/claims/route.ts

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
    
    // Transform claims to include the correct amount for display
    const transformedClaims = claims.map(claim => {
      const claimObj = claim.toObject();
      // For ZWG claims, use amountZWG as the main amount for display
      if (claimObj.currency === 'ZWG' && claimObj.amountZWG) {
        claimObj.amount = claimObj.amountZWG;
      }
      return claimObj;
    });
    
    return NextResponse.json({ success: true, data: transformedClaims });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch claims" }, { status: 500 });
  }
}

// POST new claim
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    
    // Ensure proper amount handling based on currency
    const claimData = { ...body };
    if (claimData.currency === 'ZWG') {
      // For ZWG claims, store amount in amountZWG and set amount to 0 or keep it for reference
      claimData.amountZWG = claimData.amount;
      claimData.amount = 0; // Don't use the amount field for ZWG
    } else {
      // For USD claims, ensure amountZWG is undefined
      claimData.amountZWG = undefined;
    }
    
    const claim = await Claim.create(claimData);
    
    // Transform response for consistency
    const responseClaim = claim.toObject();
    if (responseClaim.currency === 'ZWG' && responseClaim.amountZWG) {
      responseClaim.amount = responseClaim.amountZWG;
    }
    
    return NextResponse.json({ success: true, data: responseClaim }, { status: 201 });
  } catch (error) {
    console.error('Error creating claim:', error);
    return NextResponse.json({ success: false, error: "Failed to create claim" }, { status: 500 });
  }
}