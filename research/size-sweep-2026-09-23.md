# Scope position-size sweep — 23 September 2026

## Verified result

The production size-sweep endpoint returned 505 historical launches and 17,231 observed trade prints. Three fixed entry policies × four exit times × four stakes produced 48 historical discovery scenarios. **None of the 48 had positive net SOL** at 5% adverse price on each side with a 0.5% per-side Local API fee and 0.00002 SOL fixed friction. None reached the minimum 24 attempts and 20 closed exits. There is no supported size increase or live-trading promotion.

The following four rows hold the entry policy and exit time fixed: launch cap ≤30 SOL, one-second flow check, ≥50% buy pressure, two-second hold. The figures are simulated net SOL, not actual orders.

| Stake | Signals | Entries | Closed / missing exits | 5% Local net | 5% Lightning net | 8% Local net |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0.002 SOL | 61 | 22 | 16 / 6 | −0.0157 SOL | −0.0160 SOL | −0.0174 SOL |
| 0.005 SOL | 61 | 20 | 15 / 5 | −0.0331 SOL | −0.0338 SOL | −0.0370 SOL |
| 0.010 SOL | 61 | 17 | 14 / 3 | −0.0447 SOL | −0.0459 SOL | −0.0520 SOL |
| 0.020 SOL | 61 | 11 | 9 / 2 | −0.0584 SOL | −0.0600 SOL | −0.0678 SOL |

The best historical row at each size was also negative: −0.0115, −0.0321, −0.0447 and −0.0584 SOL respectively under the 5% Local scenario. Selecting the best after looking at the same tape is exploratory and gives no independent evidence of an edge.

## Method and limits

- An entry signal uses prior launch trades only. Both entry and exit require a later buy print at least as large as the stake, after 350 ms modeled latency. The observed print is a liquidity *proxy*, not an executable quote.
- If a signaled entry has no qualifying print, no position is simulated. Once entered, a missing qualifying exit within the time window is charged as a full loss of stake plus fixed friction.
- Adverse price sensitivity was calculated at 5% and 8% per side; Local and Lightning fees were modeled separately at 0.5% and 1% per side. These fee rates are from PumpPortal's published fee schedule, checked on 23 September 2026. Network and bonding-curve costs may add more.
- As size rises, the qualifying entries change. This is an opportunity-coverage comparison across the same rules, not matched realized positions. No actual venue depth, signed transaction, or landed fill was measured.
- All 505 launches had already been inspected during research. The sample is discovery data. A subsequent zero- and three-percent adverse diagnostic was deployed, but its production response could not be reopened in this session, so this report makes no claim about those cases.

**Decision:** Keep the kill switch engaged and the 0.002 SOL canary maximum unchanged. Do not allocate further trading funds on this evidence. To test a different model family, register its rules before collecting new launches; capture executable quotes and failure states, and require positive net results with enough closed exits in a prospective period.
