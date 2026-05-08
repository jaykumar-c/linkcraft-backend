import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { BaseEntity } from "src/common/base.entity";

@Entity("devices")
@Index(["userId"])
@Index(["expiresAt"]) // used by cleanup cron to purge expired tokens
export class Device extends BaseEntity {
  @Column({ type: "uuid", name: "user_id" })
  userId: string;

  /**
   * Actual access token stored for reference
   */
  @Column({
    type: "text",
    name: "access_token",
  })
  accessToken: string;

  /**
   * Actual refresh token stored for reference
   */
  @Column({
    type: "text",
    name: "refresh_token",
  })
  refreshToken: string;

  @Column({ type: "bigint", name: "expires_at" })
  expiresAt: number;

  /**
   * Parsed User-Agent string for "active sessions" UI.
   */
  @Column({ type: "text", nullable: true, name: "device_info" })
  deviceInfo: string | null;

  @Column({ type: "bigint", nullable: true, name: "last_used_at" })
  lastUsedAt: number | null;

  // ─── Relations ─────────────────────────────────────────────────────────────

  @ManyToOne(() => User, (user) => user.devices, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}
