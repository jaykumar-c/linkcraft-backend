import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../../users/entities/user.entity';
import { Device } from '../entities/device.entity';
import { getCurrentTimestampSeconds } from '../../../common/helpers/date.helper';

export const generateTokens = async (
  user: User,
  jwtService: JwtService,
  configService: ConfigService,
  deviceRepository: Repository<Device>,
  deviceInfo?: string,
  ipAddress?: string,
) => {
  const payload = { sub: user.id, email: user.email, plan: user.plan, username: user.username };
  const accessToken = jwtService.sign(payload, {
    secret: configService.get<string>('JWT_SECRET') || 'defaultSecretKey',
    expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION') || '1d',
  });

  const refreshToken = crypto.randomBytes(64).toString('hex');

  // Refresh token expiry (default 7 days)
  const expiryString = configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
  const days = parseInt(expiryString.replace('d', '')) || 7;
  const expiresAt = getCurrentTimestampSeconds() + days * 24 * 60 * 60;

  const deviceRecord = deviceRepository.create({
    userId: user.id,
    accessToken,
    refreshToken,
    expiresAt,
    deviceInfo,
    lastUsedAt: getCurrentTimestampSeconds(),
  });

  await deviceRepository.save(deviceRecord);

  return {
    accessToken,
    refreshToken,
  };
};
