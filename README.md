## Node.js implementation of Ledger-like explorers using external providers

# ledger-api-eth-explorer

This PoC aims to backup our ETH explorers in case of a WWIII
scenario, it is exposing same endpoints and formatting
returned data as would do a:
`https://explorers.api.live.ledger.com/blockchain/v3/eth`.

Only difference should be/is the fact that we rely on third parties providing
needed data.
Most of providers miss some needed endpoints by our clients (e.g. Live),
so to provide a full-featured Ledger-like explorer, we fallback on ETH RPC
nodes that should be configured through two environment variables:

```
LEDGER_RPC_NODE_ENDPOINT
LEDGER_TOKEN
```

## Supported providers

Currently, following providers are supported:
- [Blockscout](https://github.com/poanetwork/blockscout) : still missing some
non critical informations that are not altering consumers (e.g. Libcore) of
this service, worst case some informations on UI would be missing (e.g. number
of confirmations in transaction history).

#### Adding providers

Adding an additional provider consists in adding a file, under `src/providers`,
which is  implementing methods exposed by the `Provider` interface
(cf `src/types.js`). Once done, you can add it to the list of available
providers in `src/index.js`.It is possibble to switch dynamically between
providers thanks to `PROVIDER` environment variable.

## Install and start

Please make sure you use a `node` version with support of `BigInt`
(advised `node >= 10`).
```
yarn && yarn start
```

## Example of queries
If you are running the server locally on default set port `8088`, you can try following queries:

- Getting an account's balance: 
```
localhost:8088/blockchain/v3/eth/addresses/<address>/balance
```
- Getting an account's transactions:
```
localhost:8088/blockchain/v3/eth/addresses/<address>/transactions
```
