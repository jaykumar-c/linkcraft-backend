import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { LinksService } from "./links.service";
import { LinksController } from "./links.controller";
import { Link } from "./entities/link.entity";
import { User } from "../users/entities/user.entity";
import { Analytics } from "../analytics/entities/analytics.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Link, User, Analytics]),
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [LinksController],
  providers: [LinksService],
  exports: [LinksService],
})
export class LinksModule {}
