import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Claim from "@/lib/models/Claim";

export async function GET() {
  try {
    await connectDB();
    
    const result = await Claim.updateMany(
      { 
        currency: "ZWG", 
        amount: 0,
        amountZWG: { $exists: true, $gt: 0 }
      },
      [
        { $set: { amount: "$amountZWG" } }
      ]
    );
    
    return NextResponse.json({ 
      success: true, 
      message: "ZWG claims fixed",
      modified: result.modifiedCount,
      matched: result.matchedCount
    });
  } catch (error) {
    console.error("Fix error:", error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}