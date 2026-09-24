import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

// Signing keys stay with a custody provider, never in D1.
export const tradingUsers = sqliteTable("trading_users", {
  id: text("id").primaryKey(),
  authSubject: text("auth_subject").notNull(),
  createdAt: integer("created_at").notNull(),
}, table => [uniqueIndex("uidx_trading_users_auth_subject").on(table.authSubject)]);

export const tradingAccounts = sqliteTable("trading_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => tradingUsers.id),
  providerWalletId: text("provider_wallet_id").notNull(),
  depositAddress: text("deposit_address").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: integer("created_at").notNull(),
}, table => [
  uniqueIndex("uidx_trading_accounts_user").on(table.userId),
  uniqueIndex("uidx_trading_accounts_wallet").on(table.providerWalletId),
  uniqueIndex("uidx_trading_accounts_address").on(table.depositAddress),
]);

export const accountDeposits = sqliteTable("account_deposits", {
  signature: text("signature").primaryKey(),
  accountId: text("account_id").notNull().references(() => tradingAccounts.id),
  lamports: text("lamports").notNull(),
  slot: integer("slot").notNull(),
  state: text("state").notNull(),
  observedAt: integer("observed_at").notNull(),
  confirmedAt: integer("confirmed_at"),
}, table => [index("idx_account_deposits_account").on(table.accountId)]);

export const accountWithdrawals = sqliteTable("account_withdrawals", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => tradingAccounts.id),
  idempotencyKey: text("idempotency_key").notNull(),
  destination: text("destination").notNull(),
  lamports: text("lamports").notNull(),
  state: text("state").notNull().default("requested"),
  userApprovalId: text("user_approval_id"),
  signature: text("signature"),
  createdAt: integer("created_at").notNull(),
  completedAt: integer("completed_at"),
}, table => [
  uniqueIndex("uidx_account_withdrawals_idempotency").on(table.accountId,table.idempotencyKey),
  uniqueIndex("uidx_account_withdrawals_signature").on(table.signature),
]);

export const accountOrders = sqliteTable("account_orders", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => tradingAccounts.id),
  signalId: text("signal_id").notNull(),
  mint: text("mint").notNull(),
  side: text("side").notNull(),
  maxLamports: text("max_lamports").notNull(),
  state: text("state").notNull().default("queued"),
  signature: text("signature"),
  createdAt: integer("created_at").notNull(),
}, table => [uniqueIndex("uidx_account_orders_signal").on(table.accountId,table.signalId,table.side)]);

// Provider observations are evidence, never authorization to spend.
export const calloutObservations = sqliteTable("callout_observations", {
  id: text("id").primaryKey(),
  calloutId: text("callout_id"),
  callerWallet: text("caller_wallet").notNull(),
  mint: text("mint").notNull(),
  publishedAt: integer("published_at").notNull(),
  observedAt: integer("observed_at").notNull(),
  source: text("source").notNull(),
  receivedAt: integer("received_at").notNull(),
}, table => [
  index("idx_callout_observations_received_at").on(table.receivedAt),
  index("idx_callout_observations_caller_published").on(table.callerWallet,table.publishedAt),
]);

export const calloutIngestState = sqliteTable("callout_ingest_state", {
  source: text("source").primaryKey(),
  lastSeenAt: integer("last_seen_at").notNull(),
  lastCalloutAt: integer("last_callout_at"),
});

// User drafts are inert. An order worker must separately verify wallet ownership,
// signer consent, budgets, signals and an explicit live execution gate.
export const automationDrafts = sqliteTable("automation_drafts", {
  authSubject: text("auth_subject").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  callersJson: text("callers_json").notNull(),
  rulesJson: text("rules_json").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
