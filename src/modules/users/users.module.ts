import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Module that encapsulates all user-related functionality including
 * profile management with raw SQL query support.
 */
@Module({
  imports: [TypeOrmModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
