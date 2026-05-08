import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { BaseEntity } from "src/common/base.entity";
import { Analytics } from "src/modules/analytics/entities/analytics.entity";
import { LinkType } from "src/common/enums";

@Entity("links")
@Index(["userId"])
@Index(["userId", "orderIndex"]) // drag-and-drop reorder queries
@Index(["userId", "isActive", "isDeleted"]) // public profile fetch
@Index(["linkType"])
@Index(["userId", "linkType"]) // filter by platform
@Index(["userId", "category"]) // category filter
export class Link extends BaseEntity {
  @Column({ type: "uuid", name: "user_id" })
  userId: string;

  @Column({ type: "text", name: "url" })
  url: string;

  @Column({ type: "varchar", length: 150, name: "title" })
  title: string;

  @Column({ type: "text", nullable: true, name: "description" })
  description: string | null;

  /**
   * Auto-detected platform icon or custom uploaded URL.
   */
  @Column({ type: "text", nullable: true, name: "icon_url" })
  iconUrl: string | null;

  /**
   * OG image scraped from URL or manually uploaded thumbnail.
   */
  @Column({ type: "text", nullable: true, name: "thumbnail_url" })
  thumbnailUrl: string | null;

  @Column({
    type: "enum",
    enum: LinkType,
    default: LinkType.CUSTOM,
    name: "link_type",
  })
  linkType: LinkType;

  /**
   * Auto-detected platform name (github, youtube, linkedin, etc.)
   */
  @Column({ type: "varchar", length: 50, nullable: true, name: "platform_detected" })
  platformDetected: string | null;

  @Column({ type: "varchar", length: 50, nullable: true, name: "category" })
  category: string | null;

  /**
   * Lower value = higher position on page. Used for drag-and-drop.
   */
  @Column({ type: "integer", default: 0, name: "order_index" })
  orderIndex: number;

  /**
   * Alias for orderIndex for frontend clarity.
   */
  get displayOrder(): number {
    return this.orderIndex;
  }

  @Column({ type: "integer", default: 0, name: "click_count" })
  clickCount: number;

  // ─── Scheduling ────────────────────────────────────────────────────────────

  @Column({ type: "bigint", nullable: true, name: "schedule_start_at" })
  scheduleStartAt: number | null;

  @Column({ type: "bigint", nullable: true, name: "schedule_end_at" })
  scheduleEndAt: number | null;

  // ─── Extras ────────────────────────────────────────────────────────────────

  @Column({ type: "boolean", default: false, name: "is_featured" })
  isFeatured: boolean;
  
  // ─── Relations ─────────────────────────────────────────────────────────────

  @ManyToOne(() => User, (user) => user.links, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @OneToMany(() => Analytics, (analytics) => analytics.link)
  analytics: Analytics[];
}
