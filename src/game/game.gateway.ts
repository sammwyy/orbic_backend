import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger("GameGateway");
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketId[]

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  afterInit(server: Server) {
    this.logger.log("Game WebSocket Gateway initialized");
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get("JWT_SECRET"),
      });

      if (!payload || !payload.sub) {
        client.disconnect();
        return;
      }

      const userId = payload.sub;
      client.data.userId = userId;

      // Add socket to user's sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, []);
      }
      this.userSockets.get(userId).push(client.id);

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      // Remove socket from user's sockets
      const userSockets = this.userSockets.get(userId) || [];
      const updatedSockets = userSockets.filter((id) => id !== client.id);

      if (updatedSockets.length > 0) {
        this.userSockets.set(userId, updatedSockets);
      } else {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join-level")
  handleJoinLevel(client: Socket, levelId: string) {
    client.join(`level:${levelId}`);
    this.logger.log(`Client ${client.id} joined level room: ${levelId}`);
  }

  @SubscribeMessage("leave-level")
  handleLeaveLevel(client: Socket, levelId: string) {
    client.leave(`level:${levelId}`);
    this.logger.log(`Client ${client.id} left level room: ${levelId}`);
  }

  @SubscribeMessage("join-course")
  handleJoinCourse(client: Socket, courseId: string) {
    client.join(`course:${courseId}`);
    this.logger.log(`Client ${client.id} joined course room: ${courseId}`);
  }

  @SubscribeMessage("leave-course")
  handleLeaveCourse(client: Socket, courseId: string) {
    client.leave(`course:${courseId}`);
    this.logger.log(`Client ${client.id} left course room: ${courseId}`);
  }

  // Methods to emit events
  notifyLevelProgress(userId: string, levelId: string, progress: any) {
    // Emit to user's sockets
    const userSockets = this.userSockets.get(userId) || [];
    userSockets.forEach((socketId) => {
      this.server
        .to(socketId)
        .emit("level-progress-update", { levelId, progress });
    });

    // Also emit to level room
    this.server.to(`level:${levelId}`).emit("level-progress-update", {
      userId,
      levelId,
      progress,
    });
  }

  notifyCourseProgress(userId: string, courseId: string, progress: any) {
    // Emit to user's sockets
    const userSockets = this.userSockets.get(userId) || [];
    userSockets.forEach((socketId) => {
      this.server
        .to(socketId)
        .emit("course-progress-update", { courseId, progress });
    });

    // Also emit to course room
    this.server.to(`course:${courseId}`).emit("course-progress-update", {
      userId,
      courseId,
      progress,
    });
  }

  notifyUserStats(userId: string, stats: any) {
    // Emit to user's sockets
    const userSockets = this.userSockets.get(userId) || [];
    userSockets.forEach((socketId) => {
      this.server.to(socketId).emit("user-stats-update", stats);
    });
  }
}
