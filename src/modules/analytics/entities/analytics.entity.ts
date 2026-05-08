import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";

import { User } from "../../users/entities/user.entity";
import { Link } from "../../links/entities/link.entity";
import { BaseEntity } from "src/common/base.entity";
import { AnalyticsEventType } from "src/common/enums";

@Entity("analytics")
@Index(["linkId"])
@Index(["userId"])
@Index(["userId", "createdAt"]) // time-series dashboard queries
@Index(["eventType"])
@Index(["countryCode"])
@Index(["uniqueClickId"]) // unique click tracking
@Index(["ipHash", "linkId"]) // detect unique clicks per link
export class Analytics extends BaseEntity {
  @Column({ type: "uuid", name: "link_id", nullable: true })
  linkId: string | null; // null when event_type = profile_view

  @Column({ type: "uuid", name: "user_id" })
  userId: string;

  @Column({ type: "text", nullable: true, name: "user_agent" })
  userAgent: string | null;

  @Column({ type: "text", nullable: true, name: "referrer" })
  referrer: string | null;

  /**
   * ISO 3166-1 alpha-2 country code resolved from IP (e.g. 'NL', 'US').
   */
  @Column({ type: "varchar", length: 2, nullable: true, name: "country_code" })
  countryCode: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, name: "country_name" })
  countryName: string | null;

  @Column({ type: "varchar", length: 20, nullable: true, name: "device_type" })
  deviceType: string | null; // 'mobile' | 'tablet' | 'desktop'

  @Column({ type: "varchar", length: 50, nullable: true, name: "browser" })
  browser: string | null;

  @Column({ type: "varchar", length: 50, nullable: true, name: "os" })
  os: string | null;

  @Column({
    type: "enum",
    enum: AnalyticsEventType,
    default: AnalyticsEventType.LINK_CLICK,
    name: "event_type",
  })
  eventType: AnalyticsEventType;

  // ─── Unique Click Tracking ────────────────────────────────────────────────

  /**
   * Hashed IP + User Agent fingerprint for unique click detection.
   */
  @Column({ type: "varchar", length: 64, nullable: true, name: "ip_hash" })
  ipHash: string | null;

  /**
   * Session or visitor ID for tracking unique clicks.
   */
  @Column({ type: "varchar", length: 100, nullable: true, name: "session_id" })
  sessionId: string | null;

  /**
   * Unique identifier for deduplication (UUID or hash).
   */
  @Column({ type: "varchar", length: 255, nullable: true, name: "unique_click_id" })
  uniqueClickId: string | null;

  // ─── Relations ─────────────────────────────────────────────────────────────

  @ManyToOne(() => Link, (link) => link.analytics, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({ name: "link_id" })
  link: Link | null;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}
