import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AdminController } from "./admin.controller";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminService } from "./admin.service";
import { AdminGuard } from "./guards/admin.guard";
import { User } from "../users/entities/user.entity";
import { Link } from "../links/entities/link.entity";
import { Analytics } from "../analytics/entities/analytics.entity";
import { AiGeneration } from "../ai/entities/ai-generation.entity";
import { Device } from "../auth/entities/device.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Link, Analytics, AiGeneration, Device]),
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AdminController, AdminAuthController],
  providers: [AdminService, AdminGuard],
  exports: [AdminService],
})
export class AdminModule {}

