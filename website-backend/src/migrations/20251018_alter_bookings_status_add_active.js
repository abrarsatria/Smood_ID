'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Postgres: add enum value if not exists
    const sql = `DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_Bookings_status' AND e.enumlabel = 'active'
      ) THEN
        ALTER TYPE "enum_Bookings_status" ADD VALUE 'active';
      END IF;
    END$$;`;
    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface, Sequelize) {
    // Cannot remove enum value in Postgres easily; no-op
  },
};
