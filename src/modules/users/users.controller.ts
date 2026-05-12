import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { User } from "./entities/user.entity";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("profile")
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: User) {
    const result = await this.usersService.getProfile(user.id);
    return {
      message: "Profile fetched successfully",
      errorCode: "UCP001",
      data: result,
      error: "",
    };
  }

  @Patch("profile")
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    await this.usersService.updateProfile(user.id, updateProfileDto);
    return {
      message: "Profile updated successfully",
      errorCode: "UCP002",
      data: {},
      error: "",
    };
  }
}
