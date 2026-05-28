// FILE: lib/services/notification.service.ts

import { connectDB } from "@/lib/mongodb";
import Notification from "@/lib/models/Notification";
import mongoose from "mongoose";

export interface CreateNotificationDto {
  userId: string;
  type: string;
  title: string;
  message: string;
  claimId?: string;
  claimNumber?: string;
  taskId?: string;
  priority?: "low" | "medium" | "high" | "critical";
  expiresAt?: Date;
}

export class NotificationService {
  static async create(dto: CreateNotificationDto): Promise<void> {
    await connectDB();
    await Notification.create({
      ...dto,
      userId: new mongoose.Types.ObjectId(dto.userId),
      claimId: dto.claimId ? new mongoose.Types.ObjectId(dto.claimId) : undefined,
      taskId: dto.taskId ? new mongoose.Types.ObjectId(dto.taskId) : undefined,
    });
  }

  static async createBulk(dtos: CreateNotificationDto[]): Promise<void> {
    await connectDB();
    if (dtos.length === 0) return;
    await Notification.insertMany(dtos.map((dto) => ({
      ...dto,
      userId: new mongoose.Types.ObjectId(dto.userId),
      claimId: dto.claimId ? new mongoose.Types.ObjectId(dto.claimId) : undefined,
    })));
  }

  static async getForUser(
    userId: string,
    options: { unreadOnly?: boolean; limit?: number } = {}
  ) {
    await connectDB();
    const { unreadOnly = false, limit = 50 } = options;
    const filter: any = {
      userId: new mongoose.Types.ObjectId(userId),
    };
    if (unreadOnly) filter.isRead = false;

    return Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  static async markRead(notificationId: string): Promise<void> {
    await connectDB();
    await Notification.findByIdAndUpdate(notificationId, {
      isRead: true,
      readAt: new Date(),
    });
  }

  static async markAllRead(userId: string): Promise<void> {
    await connectDB();
    await Notification.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  static async getUnreadCount(userId: string): Promise<number> {
    await connectDB();
    return Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      isRead: false,
    });
  }

  // Broadcast to multiple users (e.g. finance team)
  static async broadcast(
    userIds: string[],
    dto: Omit<CreateNotificationDto, "userId">
  ): Promise<void> {
    await connectDB();
    if (userIds.length === 0) return;
    await Notification.insertMany(
      userIds.map((userId) => ({
        ...dto,
        userId: new mongoose.Types.ObjectId(userId),
        claimId: dto.claimId ? new mongoose.Types.ObjectId(dto.claimId) : undefined,
      }))
    );
  }
}