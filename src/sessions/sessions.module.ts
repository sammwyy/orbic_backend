import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Session, SessionSchema } from "./schemas/session.schema";
import { SessionsResolver } from "./sessions.resolver";
import { SessionsService } from "./sessions.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
  ],
  providers: [SessionsService, SessionsResolver],
  exports: [SessionsService],
})
export class SessionsModule {}
