import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Session, SessionDocument } from "./schemas/session.schema";

export interface CreateSessionData {
  refreshToken: string;
  userId: string;
  country?: string;
  browser?: string;
  os?: string;
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>
  ) {}

  async createSession(sessionData: CreateSessionData): Promise<Session> {
    const session = new this.sessionModel({
      ...sessionData,
      isActive: true,
    });
    return session.save();
  }

  async findActiveSession(refreshToken: string): Promise<Session | null> {
    return this.sessionModel.findOne({
      refreshToken,
      isActive: true,
    });
  }

  async findActiveSessionsByUserId(userId: string): Promise<Session[]> {
    return this.sessionModel
      .find({
        userId,
        isActive: true,
      })
      .sort({ createdAt: -1 });
  }

  async findAllSessionsByUserId(userId: string): Promise<Session[]> {
    return this.sessionModel
      .find({
        userId,
      })
      .sort({ createdAt: -1 });
  }

  async deactivateSession(refreshToken: string): Promise<void> {
    await this.sessionModel.findOneAndUpdate(
      { refreshToken },
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        },
      }
    );
  }

  async deactivateAllUserSessions(userId: string): Promise<void> {
    await this.sessionModel.updateMany(
      { userId, isActive: true },
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        },
      }
    );
  }

  async updateSessionActivity(refreshToken: string): Promise<void> {
    await this.sessionModel.findOneAndUpdate(
      { refreshToken, isActive: true },
      {
        $set: {
          updatedAt: new Date(),
        },
      }
    );
  }

  async cleanupExpiredSessions(): Promise<void> {
    // Deactivate sessions older than 7 days that are still active
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await this.sessionModel.updateMany(
      {
        updatedAt: { $lt: sevenDaysAgo },
        isActive: true,
      },
      {
        $set: {
          isActive: false,
        },
      }
    );
  }
}
