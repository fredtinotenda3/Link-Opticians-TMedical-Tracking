// FILE: lib/services/claim.service.ts

import { ClaimRepository, ClaimFilters } from "@/lib/repositories/claim.repository";
import AuditLog from "@/lib/models/AuditLog";
import Task from "@/lib/models/Task";
import { IClaim } from "@/lib/models/Claim";
import {
  BusinessRuleError,
  InvalidStatusTransitionError,
  ValidationError,
  NotFoundError,
} from "@/lib/errors";
import { generateClaimReference } from "@/lib/utils/claimNumber";
import { validateClaimTransition, ALLOWED_TRANSITIONS } from "@/lib/domain/claim.workflow";
import { ClaimRiskEngine } from "@/lib/automation/risk.engine";

export interface CreateClaimDto {
  claimNumber: string;
  patientName: string;
  patientId: string;
  patientRef?: string;
  medicalAid: string;
  medicalAidRef?: string;
  memberNumber: string;
  dependentCode?: string;
  authorizationNumber?: string;
  branch: string;
  branchRef?: string;
  serviceDate: string | Date;
  submissionDate: string | Date;
  amount: number;
  currency: "USD" | "ZWG";
  notes?: string;
  serviceType?: string;
  invoiceNumber?: string;
  createdBy?: string;
  createdByName?: string;
}

export interface UpdateClaimDto extends Partial<CreateClaimDto> {
  status?: string;
  paidDate?: string | Date;
  rejectionReason?: string;
  rejectionCode?: string;
  followUpDate?: string | Date;
  partialAmountPaid?: number;
  partialPaymentDate?: string | Date;
  priority?: string;
  lastModifiedBy?: string;
  lastModifiedByName?: string;
}

export interface ResubmitClaimDto {
  claimNumber: string;
  submissionDate?: string | Date;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
}

export interface AuditContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class ClaimService {
  // Create a new claim
  static async create(dto: CreateClaimDto, auditCtx?: AuditContext): Promise<IClaim> {
    // Validate required fields
    const errors: Record<string, string> = {};
    if (!dto.claimNumber?.trim()) errors.claimNumber = "Claim number is required";
    if (!dto.patientName?.trim()) errors.patientName = "Patient name is required";
    if (!dto.patientId?.trim()) errors.patientId = "Patient ID is required";
    if (!dto.medicalAid?.trim()) errors.medicalAid = "Medical aid is required";
    if (!dto.memberNumber?.trim()) errors.memberNumber = "Member number is required";
    if (!dto.branch?.trim()) errors.branch = "Branch is required";
    if (!dto.serviceDate) errors.serviceDate = "Service date is required";
    if (!dto.submissionDate) errors.submissionDate = "Submission date is required";
    if (!dto.amount || dto.amount <= 0) errors.amount = "Amount must be greater than 0";

    if (Object.keys(errors).length > 0) {
      throw new ValidationError("Claim validation failed", errors);
    }

    // Build claim data
    const claimData: Partial<IClaim> = {
      ...dto,
      amount: dto.currency === "ZWG" ? 0 : dto.amount,
      amountZWG: dto.currency === "ZWG" ? dto.amount : undefined,
      status: "pending",
      resubmissionCount: 0,
      history: [{
        changedAt: new Date(),
        changedByName: dto.createdByName,
        newStatus: "pending",
        action: "CREATE",
        note: "Claim created",
      }],
    } as any;

    // Generate claim reference
    try {
      claimData.claimReference = await generateClaimReference(dto.branch, dto.currency);
    } catch {
      // Non-critical — continue without reference
    }

    // Run risk assessment
    try {
      const risk = await ClaimRiskEngine.assess(claimData);
      claimData.riskScore = risk.score;
      claimData.riskFlags = risk.flags;
    } catch {
      // Non-critical
    }

    const claim = await ClaimRepository.create(claimData);

    // Audit log
    if (auditCtx) {
      await AuditLog.create({
        action: "CREATE",
        entityType: "Claim",
        entityId: claim._id,
        entityLabel: claim.claimNumber,
        newValues: { claimNumber: claim.claimNumber, amount: dto.amount, currency: dto.currency, status: "pending" },
        ...auditCtx,
      });
    }

    return claim;
  }

  // Update claim fields
  static async update(id: string, dto: UpdateClaimDto, auditCtx?: AuditContext): Promise<IClaim> {
    const existing = await ClaimRepository.findById(id);

    // Handle amount by currency
    const updateData: any = { ...dto };
    if (dto.currency === "ZWG" && dto.amount !== undefined) {
      updateData.amountZWG = dto.amount;
      updateData.amount = 0;
    } else if (dto.currency === "USD" && dto.amount !== undefined) {
      updateData.amount = dto.amount;
      updateData.amountZWG = undefined;
    }

    // Track changed fields
    const changedFields: string[] = [];
    const previousValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    for (const key of Object.keys(dto)) {
      const prev = (existing as any)[key];
      const next = (dto as any)[key];
      if (prev !== next && next !== undefined) {
        changedFields.push(key);
        previousValues[key] = prev;
        newValues[key] = next;
      }
    }

    // Add history entry
    updateData.$push = {
      history: {
        changedAt: new Date(),
        changedByName: dto.lastModifiedByName,
        action: "UPDATE",
        note: `Fields updated: ${changedFields.join(", ")}`,
      },
    };

    const updated = await ClaimRepository.update(id, updateData);

    if (auditCtx && changedFields.length > 0) {
      await AuditLog.create({
        action: "UPDATE",
        entityType: "Claim",
        entityId: id,
        entityLabel: existing.claimNumber,
        previousValues,
        newValues,
        changedFields,
        ...auditCtx,
      });
    }

    return updated;
  }

  // Transition claim status
  static async transition(
    id: string,
    newStatus: string,
    options: {
      paidDate?: Date;
      rejectionReason?: string;
      rejectionCode?: string;
      escalationReason?: string;
      notes?: string;
      modifiedBy?: string;
      modifiedByName?: string;
    } = {},
    auditCtx?: AuditContext
  ): Promise<IClaim> {
    const claim = await ClaimRepository.findById(id);
    const currentStatus = claim.status;

    // Validate transition
    if (!validateClaimTransition(currentStatus, newStatus)) {
      throw new InvalidStatusTransitionError(currentStatus, newStatus);
    }

    const updateData: any = {
      status: newStatus,
      lastModifiedBy: options.modifiedBy,
      lastModifiedByName: options.modifiedByName,
    };

    if (newStatus === "paid") {
      updateData.paidDate = options.paidDate || new Date();
    }
    if (newStatus === "rejected") {
      if (!options.rejectionReason) {
        throw new ValidationError("Rejection reason is required when rejecting a claim");
      }
      updateData.rejectionReason = options.rejectionReason;
      updateData.rejectionCode = options.rejectionCode;
    }
    if (newStatus === "escalated") {
      updateData.escalatedAt = new Date();
      updateData.escalationReason = options.escalationReason;
      updateData.priority = "critical";
    }

    // Append history
    await ClaimRepository.addHistoryEntry(id, {
      changedAt: new Date(),
      changedByName: options.modifiedByName,
      previousStatus: currentStatus,
      newStatus,
      action: "STATUS_CHANGE",
      note: options.rejectionReason || options.escalationReason || options.notes,
    });

    const updated = await ClaimRepository.update(id, updateData);

    if (auditCtx) {
      await AuditLog.create({
        action: "STATUS_CHANGE",
        entityType: "Claim",
        entityId: id,
        entityLabel: claim.claimNumber,
        previousValues: { status: currentStatus },
        newValues: { status: newStatus, ...options },
        ...auditCtx,
      });
    }

    return updated;
  }

  // Record partial payment
  static async recordPartialPayment(
    id: string,
    amountPaid: number,
    paymentDate: Date = new Date(),
    auditCtx?: AuditContext
  ): Promise<IClaim> {
    const claim = await ClaimRepository.findById(id);

    if (!["pending", "approved"].includes(claim.status)) {
      throw new BusinessRuleError(
        `Cannot record partial payment for a claim with status "${claim.status}"`
      );
    }

    const totalAmount = claim.currency === "ZWG"
      ? (claim.amountZWG || claim.amount)
      : claim.amount;

    if (amountPaid <= 0) {
      throw new ValidationError("Payment amount must be greater than 0");
    }
    if (amountPaid > totalAmount) {
      throw new ValidationError(
        `Payment amount (${amountPaid}) cannot exceed claim total (${totalAmount})`
      );
    }

    const updateData: any = {
      status: "partial",
      partialPaymentDate: paymentDate,
    };

    if (claim.currency === "ZWG") {
      updateData.partialAmountPaidZWG = amountPaid;
      updateData.partialAmountPaid = amountPaid;
    } else {
      updateData.partialAmountPaid = amountPaid;
    }

    await ClaimRepository.addHistoryEntry(id, {
      changedAt: new Date(),
      previousStatus: claim.status,
      newStatus: "partial",
      action: "PARTIAL_PAYMENT",
      note: `Partial payment of ${amountPaid} ${claim.currency} recorded`,
    });

    const updated = await ClaimRepository.update(id, updateData);

    if (auditCtx) {
      await AuditLog.create({
        action: "PARTIAL_PAYMENT",
        entityType: "Claim",
        entityId: id,
        entityLabel: claim.claimNumber,
        newValues: { amountPaid, paymentDate, currency: claim.currency },
        ...auditCtx,
      });
    }

    return updated;
  }

  // Resubmit a rejected claim
  static async resubmit(
    originalId: string,
    dto: ResubmitClaimDto,
    auditCtx?: AuditContext
  ): Promise<IClaim> {
    const original = await ClaimRepository.findById(originalId);

    if (original.status !== "rejected") {
      throw new BusinessRuleError("Only rejected claims can be resubmitted");
    }

    if (!dto.claimNumber?.trim()) {
      throw new ValidationError("New claim number is required for resubmission");
    }

    const newClaimData: Partial<IClaim> = {
      claimNumber: dto.claimNumber,
      patientName: original.patientName,
      patientId: original.patientId,
      patientRef: original.patientRef,
      medicalAid: original.medicalAid,
      medicalAidRef: original.medicalAidRef,
      memberNumber: original.memberNumber,
      dependentCode: original.dependentCode,
      branch: original.branch,
      branchRef: original.branchRef,
      serviceDate: original.serviceDate,
      submissionDate: dto.submissionDate ? new Date(dto.submissionDate) : new Date(),
      currency: original.currency,
      amount: original.amount,
      amountZWG: original.amountZWG,
      status: "pending",
      resubmittedFrom: original._id as any,
      originalClaimId: (original.originalClaimId || original._id) as any,
      resubmissionCount: (original.resubmissionCount || 0) + 1,
      notes: dto.notes || original.notes,
      serviceType: original.serviceType,
      invoiceNumber: original.invoiceNumber,
      createdBy: dto.createdBy as any,
      createdByName: dto.createdByName,
      history: [{
        changedAt: new Date(),
        changedByName: dto.createdByName,
        newStatus: "pending",
        action: "RESUBMISSION",
        note: `Resubmitted from ${original.claimNumber}`,
      }],
    } as any;

    // Generate new reference
    try {
      newClaimData.claimReference = await generateClaimReference(original.branch, original.currency);
    } catch {}

    const resubmitted = await ClaimRepository.create(newClaimData);

    // Mark original as superseded
    await ClaimRepository.update(originalId, { status: "superseded" } as any);
    await ClaimRepository.addHistoryEntry(originalId, {
      changedAt: new Date(),
      previousStatus: "rejected",
      newStatus: "superseded",
      action: "RESUBMISSION",
      note: `Superseded by new claim ${dto.claimNumber}`,
    });

    if (auditCtx) {
      await AuditLog.create({
        action: "RESUBMISSION",
        entityType: "Claim",
        entityId: resubmitted._id,
        entityLabel: dto.claimNumber,
        metadata: { originalId, originalClaimNumber: original.claimNumber },
        ...auditCtx,
      });
    }

    return resubmitted;
  }

  // Soft delete
  static async delete(id: string, deletedBy?: string, auditCtx?: AuditContext): Promise<void> {
    const claim = await ClaimRepository.findById(id);
    await ClaimRepository.softDelete(id, deletedBy);

    if (auditCtx) {
      await AuditLog.create({
        action: "DELETE",
        entityType: "Claim",
        entityId: id,
        entityLabel: claim.claimNumber,
        ...auditCtx,
      });
    }
  }

  // Set follow-up date
  static async setFollowUpDate(
    id: string,
    followUpDate: Date,
    auditCtx?: AuditContext
  ): Promise<IClaim> {
    const claim = await ClaimRepository.findById(id);
    const updated = await ClaimRepository.update(id, { followUpDate } as any);

    await ClaimRepository.addHistoryEntry(id, {
      changedAt: new Date(),
      action: "FOLLOW_UP_SET",
      note: `Follow-up date set to ${followUpDate.toLocaleDateString()}`,
    });

    if (auditCtx) {
      await AuditLog.create({
        action: "FOLLOW_UP_SET",
        entityType: "Claim",
        entityId: id,
        entityLabel: claim.claimNumber,
        newValues: { followUpDate },
        ...auditCtx,
      });
    }

    return updated;
  }

  // Get claim with full enrichment
  static async getById(id: string): Promise<IClaim> {
    return ClaimRepository.findById(id);
  }

  // Get claims with filters
  static async getClaims(filters: ClaimFilters): Promise<IClaim[]> {
    const result = await ClaimRepository.findAll(filters);
    return Array.isArray(result) ? result : result.data;
  }

  // Transform claim amounts for consistent display
  static normalizeAmounts(claim: any): any {
    const c = typeof claim.toObject === "function" ? claim.toObject() : { ...claim };
    if (c.currency === "ZWG") {
      c.amount = c.amountZWG || c.amount || 0;
      if (c.partialAmountPaidZWG) c.partialAmountPaid = c.partialAmountPaidZWG;
    }
    return c;
  }
}