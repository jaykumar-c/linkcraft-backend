import { Module, Logger, OnModuleInit } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        url: configService.get<string>("DATABASE_URL"),
        ssl:
          configService.get<string>("DATABASE_SSL") === "true"
            ? { rejectUnauthorized: false }
            : false,
        entities: [__dirname + "/../**/*.entity{.ts,.js}"],
        autoLoadEntities: true,
        synchronize: configService.get<string>("NODE_ENV") !== "production", // Don't use true in production
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private dataSource: DataSource) {}

  onModuleInit() {
    if (this.dataSource.isInitialized) {
      this.logger.log("Database connection has been established successfully.");
    } else {
      this.logger.error("Database connection failed.");
    }
  }
}
