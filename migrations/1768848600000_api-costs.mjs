/**
 * Migration: API Costs
 */

export const up = (pgm) => {
  pgm.createTable("api_costs", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    provider: {
      type: "varchar(50)",
      notNull: true,
    },
    model: {
      type: "varchar(100)",
    },
    tokens_input: {
      type: "integer",
    },
    tokens_output: {
      type: "integer",
    },
    units: {
      type: "integer",
    },
    cost_usd: {
      type: "numeric(10, 6)",
      notNull: true,
    },
    metadata: {
      type: "jsonb",
      default: "{}",
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.createIndex("api_costs", "provider");
  pgm.createIndex("api_costs", "created_at");
};

export const down = (pgm) => {
  pgm.dropTable("api_costs");
};
