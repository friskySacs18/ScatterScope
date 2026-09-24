// Persist the provider's verified wallet identity. 'pending' is deliberately
// inert: signer consent and live execution require independent checks.
export async function registerPendingAccount(db,{subject,address,walletId,now=Date.now()}){
  if(!db?.prepare||!/^did:privy:[a-zA-Z0-9_-]{8,120}$/.test(subject||'')||
    !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address||'')||
    !/^[a-z0-9]{24}$/.test(walletId||'')||!Number.isSafeInteger(now))throw new TypeError('Invalid verified account');
  // A failure may leave a pending user row, which is safe and recoverable.
  await db.prepare('INSERT OR IGNORE INTO trading_users (id,auth_subject,created_at) VALUES (?,?,?)')
    .bind(crypto.randomUUID(),subject,now).run();
  const user=await db.prepare('SELECT id FROM trading_users WHERE auth_subject = ?').bind(subject).first();
  if(!user?.id)throw Error('Account registry unavailable');
  await db.prepare("INSERT OR IGNORE INTO trading_accounts (id,user_id,provider_wallet_id,deposit_address,status,created_at) VALUES (?,?,?,?, 'pending', ?)")
    .bind(crypto.randomUUID(),user.id,walletId,address,now).run();
  const account=await db.prepare('SELECT id,provider_wallet_id AS walletId,deposit_address AS address,status FROM trading_accounts WHERE user_id = ?').bind(user.id).first();
  if(!account||account.walletId!==walletId||account.address!==address)throw Error('A different Scope wallet is already registered for this account');
  return {accountId:account.id,status:account.status};
}
