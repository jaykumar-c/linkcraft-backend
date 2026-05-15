import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRole1736000000000 implements MigrationInterface {
  name = "AddUserRole1736000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the enum type if not exists
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE public.user_role_enum AS ENUM ('user', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add role column with default 'user'
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role public.user_role_enum NOT NULL DEFAULT 'user'
    `);

    // Add index on role for admin lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role
      ON users(role)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_role`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS role`);
  }
}
