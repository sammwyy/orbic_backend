import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionsService } from './sessions.service';
import { Session, SessionSchema } from './schemas/session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
    ]),
  ],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}