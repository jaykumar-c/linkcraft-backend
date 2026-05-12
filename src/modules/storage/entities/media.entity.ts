import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../../common/base.entity";

@Entity("media")
export class Media extends BaseEntity {
  @Column({ type: "varchar", length: 255, name: "public_id" })
  publicId: string;

  @Column({ type: "uuid", name: "user_id" })
  userId: string;

  @Column({ type: "varchar", length: 255, name: "original_name" })
  originalName: string;

  @Column({ type: "varchar", length: 50, name: "mime_type" })
  mimeType: string;

  @Column({ type: "decimal", precision: 10, scale: 2, name: "size_mb" })
  sizeMb: number;

  @Column({ type: "varchar", length: 10, name: "extension" })
  extension: string;

  @Column({ type: "text", name: "secure_url" })
  secureUrl: string;
}
