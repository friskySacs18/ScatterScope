import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const campaignLaunches = sqliteTable("campaign_launches", {
  mint: text("mint").primaryKey(),
  observedAt: integer("observed_at").notNull(),
  name: text("name").notNull().default(""),
  symbol: text("symbol").notNull().default(""),
  launchMarketCapSol: real("launch_market_cap_sol"),
  runId: text("run_id").notNull(),
}, table => [
  index("idx_campaign_launches_observed_at").on(table.observedAt),
]);

export const campaignTrades = sqliteTable("campaign_trades", {
  signature: text("signature").primaryKey(),
  mint: text("mint").notNull(),
  observedAt: integer("observed_at").notNull(),
  side: text("side").notNull(),
  priceSol: real("price_sol").notNull(),
  solAmount: real("sol_amount").notNull(),
  tokenAmount: real("token_amount").notNull(),
  marketCapSol: real("market_cap_sol"),
  trader: text("trader").notNull().default(""),
  runId: text("run_id").notNull(),
}, table => [
  index("idx_campaign_trades_mint_observed_at").on(table.mint, table.observedAt),
  index("idx_campaign_trades_observed_at").on(table.observedAt),
]);

export const campaignRuns = sqliteTable("campaign_runs", {
  id: text("id").primaryKey(),
  startedAt: integer("started_at").notNull(),
  finishedAt: integer("finished_at").notNull(),
  reason: text("reason").notNull(),
  tokenCount: integer("token_count").notNull().default(0),
  tradeCount: integer("trade_count").notNull().default(0),
  persistenceState: text("persistence_state").notNull().default("stored"),
}, table => [
  index("idx_campaign_runs_started_at").on(table.startedAt),
]);
