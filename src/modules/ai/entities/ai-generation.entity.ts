import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";

import { User } from "../../users/entities/user.entity";
import { BaseEntity } from "src/common/base.entity";
import { AiTone, AiLength, AiGenerationStatus } from "src/common/enums";

@Entity("ai_generations")
@Index(["userId"])
@Index(["userId", "createdAt"]) // rate-limit window queries
@Index(["status"])
@Index(["model"])
export class AiGeneration extends BaseEntity {
  @Column({ type: "uuid", name: "user_id" })
  userId: string;

  /**
   * Full system + user prompt sent to the model. Stored for auditing and
   * prompt iteration.
   */
  @Column({ type: "text", name: "prompt" })
  prompt: string;

  /**
   * The generated bio text. Null if generation failed or was moderated.
   */
  @Column({ type: "text", nullable: true, name: "response" })
  response: string | null;

  @Column({ type: "varchar", length: 100, default: "gpt-4o", name: "model" })
  model: string;

  @Column({ type: "integer", nullable: true, name: "tokens_input" })
  tokensInput: number | null;

  @Column({ type: "integer", nullable: true, name: "tokens_output" })
  tokensOutput: number | null;

  @Column({ type: "integer", nullable: true, name: "tokens_total" })
  tokensTotal: number | null;

  /**
   * Approximate USD cost stored as numeric(10,6) for accounting.
   */
  @Column({
    type: "decimal",
    precision: 10,
    scale: 6,
    nullable: true,
    name: "cost_usd",
  })
  costUsd: number | null;

  @Column({ type: "enum", enum: AiTone, nullable: true, name: "tone" })
  tone: AiTone | null;

  @Column({ type: "enum", enum: AiLength, nullable: true, name: "length" })
  length: AiLength | null;

  @Column({
    type: "enum",
    enum: AiGenerationStatus,
    default: AiGenerationStatus.COMPLETED,
    name: "status",
  })
  status: AiGenerationStatus;

  /**
   * True when user clicked "Apply" and saved this generation to their profile bio.
   */
  @Column({ type: "boolean", default: false, name: "was_applied" })
  wasApplied: boolean;

  // ─── Relations ─────────────────────────────────────────────────────────────

  @ManyToOne(() => User, (user) => user.aiGenerations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}
