import { Entity, Column, Index, OneToMany } from "typeorm";
import { Link } from "../../links/entities/link.entity";
import { BaseEntity } from "src/common/base.entity";
import { AiGeneration } from "src/modules/ai/entities/ai-generation.entity";
import { Device } from "src/modules/auth/entities/device.entity";
import { UserPlan } from "src/common/enums";
import { ThemeSettings } from "src/common/interfaces";

@Entity("users")
@Index(["email"], { unique: true })
@Index(["username"], { unique: true })
@Index(["isDeleted"])
@Index(["plan"])
export class User extends BaseEntity {
  @Column({ type: "varchar", length: 255, unique: true, name: "email" })
  email: string;

  /**
   * Null for OAuth-only accounts (Google / GitHub login)
   */
  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
    name: "password_hash",
    select: false,
  })
  passwordHash: string | null;

  @Column({ type: "varchar", length: 50, unique: true, name: "username" })
  username: string;

  @Column({
    type: "varchar",
    length: 100,
    nullable: true,
    name: "display_name",
  })
  displayName: string | null;

  @Column({ type: "text", nullable: true, name: "avatar_url" })
  avatarUrl: string | null;

  @Column({ type: "text", nullable: true, name: "bio_text" })
  bioText: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, name: "profession" })
  profession: string | null;

  /**
   * Stores theme, color, font and layout preferences as JSONB.
   */
  @Column({
    type: "jsonb",
    nullable: true,
    default: "{}",
    name: "theme_settings",
  })
  themeSettings: ThemeSettings;

  @Column({
    type: "enum",
    enum: UserPlan,
    default: UserPlan.FREE,
    name: "plan",
  })
  plan: UserPlan;

  // ─── Password Reset ────────────────────────────────────────────────────────

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
    name: "password_reset_token",
    select: false,
  })
  passwordResetToken: string | null;

  @Column({
    type: "bigint",
    nullable: true,
    name: "password_reset_expires_at",
    select: false,
  })
  passwordResetExpiresAt: number | null;

  // ─── OAuth ─────────────────────────────────────────────────────────────────

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
    unique: true,
    name: "google_id",
  })
  googleId: string | null;

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
    unique: true,
    name: "github_id",
  })
  githubId: string | null;

  // ─── Analytics ─────────────────────────────────────────────────────────────

  @Column({ type: "integer", default: 0, name: "total_profile_views" })
  totalProfileViews: number;

  @Column({ type: "bigint", nullable: true, name: "last_login_at" })
  lastLoginAt: number | null;

  @Column({ type: "integer", default: 0, name: "total_ai_tokens_used" })
  totalAiTokensUsed: number;

  // ─── Relations ─────────────────────────────────────────────────────────────

  @OneToMany(() => Link, (link) => link.user)
  links: Link[];

  @OneToMany(() => AiGeneration, (gen) => gen.user)
  aiGenerations: AiGeneration[];

  @OneToMany(() => Device, (device) => device.user)
  devices: Device[];
}
