import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext, status?: any) {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException({
          errorCode: 'ERR401',
          message: 'Access token is invalid or expired.',
        })
      );
    }
    
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const jwt = require('jsonwebtoken');
      try {
        const secret = process.env.JWT_SECRET || 'defaultSecretKey';
        const decoded = jwt.decode(authHeader.slice(7));
        if (decoded?.deviceId) {
          user.deviceId = decoded.deviceId;
        }
      } catch {}
    }
    
    return user;
  }
}