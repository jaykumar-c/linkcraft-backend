import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLinkPlatformScheduling1735000000000 implements MigrationInterface {
  name = "AddLinkPlatformScheduling1735000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add platform_detected column
    await queryRunner.query(`
      ALTER TABLE links
      ADD COLUMN IF NOT EXISTS platform_detected VARCHAR(50) NULL
    `);

    // Rename published_at to schedule_start_at (or add new column)
    await queryRunner.query(`
      ALTER TABLE links
      ADD COLUMN IF NOT EXISTS schedule_start_at BIGINT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE links
      ADD COLUMN IF NOT EXISTS schedule_end_at BIGINT NULL
    `);

    // Migrate existing data from published_at/unpublished_at
    await queryRunner.query(`
      UPDATE links
      SET schedule_start_at = published_at
      WHERE published_at IS NOT NULL AND schedule_start_at IS NULL
    `);

    await queryRunner.query(`
      UPDATE links
      SET schedule_end_at = unpublished_at
      WHERE unpublished_at IS NOT NULL AND schedule_end_at IS NULL
    `);

    // Add index for platform_detected
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_links_platform_detected
      ON links(platform_detected)
    `);

    // Add index for scheduling queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_links_schedule
      ON links(user_id, schedule_start_at, schedule_end_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_links_platform_detected`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_links_schedule`);
    await queryRunner.query(`ALTER TABLE links DROP COLUMN IF EXISTS platform_detected`);
    await queryRunner.query(`ALTER TABLE links DROP COLUMN IF EXISTS schedule_start_at`);
    await queryRunner.query(`ALTER TABLE links DROP COLUMN IF EXISTS schedule_end_at`);
  }
}
