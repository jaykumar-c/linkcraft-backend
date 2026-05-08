import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAnalyticsUniqueTracking1735000000001 implements MigrationInterface {
  name = "AddAnalyticsUniqueTracking1735000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add unique click tracking columns
    await queryRunner.query(`
      ALTER TABLE analytics
      ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(64) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE analytics
      ADD COLUMN IF NOT EXISTS session_id VARCHAR(100) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE analytics
      ADD COLUMN IF NOT EXISTS unique_click_id VARCHAR(255) NULL
    `);

    // Add indexes for performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_ip_hash
      ON analytics(ip_hash)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_session_id
      ON analytics(session_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_unique_click_id
      ON analytics(unique_click_id)
    `);

    // Add composite index for unique click detection per link
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_link_ip
      ON analytics(link_id, ip_hash)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_link_ip`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_unique_click_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_session_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_ip_hash`);
    await queryRunner.query(`ALTER TABLE analytics DROP COLUMN IF EXISTS unique_click_id`);
    await queryRunner.query(`ALTER TABLE analytics DROP COLUMN IF EXISTS session_id`);
    await queryRunner.query(`ALTER TABLE analytics DROP COLUMN IF EXISTS ip_hash`);
  }
}
