import {
  PrimaryGeneratedColumn,
  Column,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { getCurrentTimestampSeconds } from "./helpers/date.helper";

export abstract class BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive: boolean;

  @Column({
    type: "bigint",
    name: "created_at",
    default: () => `${getCurrentTimestampSeconds()}`,
  })
  createdAt: number;

  @Column({ type: "uuid", nullable: true, name: "created_by" })
  createdBy: string | null;

  @Column({
    type: "bigint",
    nullable: true,
    name: "updated_at",
    default: () => `${getCurrentTimestampSeconds()}`,
  })
  updatedAt: number | null;

  @Column({ type: "uuid", nullable: true, name: "updated_by" })
  updatedBy: string | null;

  @Column({ type: "bigint", nullable: true, name: "deleted_at" })
  deletedAt: number | null;

  @Column({ type: "uuid", nullable: true, name: "deleted_by" })
  deletedBy: string | null;

  @Column({ type: "boolean", default: false, name: "is_deleted" })
  isDeleted: boolean;

  @BeforeInsert()
  setCreatedAt() {
    const now = getCurrentTimestampSeconds();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  setUpdatedAt() {
    this.updatedAt = getCurrentTimestampSeconds();
  }
}
