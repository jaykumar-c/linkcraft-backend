import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  healthCheck() {
    return {
      message: 'API is running',
      errorCode: 'HEC001',
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
      },
      error: '',
    };
  }
}
