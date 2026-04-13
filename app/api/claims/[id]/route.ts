// FILE: app/api/claims/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Claim from "@/lib/models/Claim";

// PATCH — update status, paidDate, rejectionReason
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    
    // Handle amount updates based on currency
    if (body.currency === 'ZWG' && body.amount) {
      body.amountZWG = body.amount;
      body.amount = 0;
    } else if (body.currency === 'USD' && body.amount) {
      body.amountZWG = undefined;
    }
    
    const claim = await Claim.findByIdAndUpdate(id, body, { new: true });
    if (!claim) {
      return NextResponse.json({ success: false, error: "Claim not found" }, { status: 404 });
    }
    
    // Transform response
    const responseClaim = claim.toObject();
    if (responseClaim.currency === 'ZWG' && responseClaim.amountZWG) {
      responseClaim.amount = responseClaim.amountZWG;
    }
    
    return NextResponse.json({ success: true, data: responseClaim });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update claim" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    await Claim.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete claim" }, { status: 500 });
  }
}

// GET
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const claim = await Claim.findById(id);
    if (!claim) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    
    // Transform response
    const responseClaim = claim.toObject();
    if (responseClaim.currency === 'ZWG' && responseClaim.amountZWG) {
      responseClaim.amount = responseClaim.amountZWG;
    }
    
    return NextResponse.json({ success: true, data: responseClaim });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch claim" }, { status: 500 });
  }
}