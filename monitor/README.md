# Scope callout observer

The container calls the signed Scope monitor endpoint every eight seconds. It records observed Pump Callouts only; it cannot submit trades or access a wallet signing key.

Run it on a persistent host after the website is publicly reachable, with the same 32+ character `SCOPE_MONITOR_SECRET` configured as a secret in the Site and on the monitor host. From this directory use `docker compose up -d --build`. Never commit the secret or put it in a URL. A private Site cannot use a permanent background visitor session; temporary owner access tokens are unsuitable for a long-running deployment.

The worker reports its last successful check through `/api/automation/readiness`. Callout history remains incomplete until a separate historical verification path has been proved. A successful monitor heartbeat must never be interpreted as permission to enable automatic orders.
