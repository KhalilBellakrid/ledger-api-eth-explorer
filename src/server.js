// @flow
// Implement the HTTP server API

import "babel-polyfill";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import type {
  HistoAPIRequest,
  RequestPair,
  Pair,
  HistoAPIResponse,
  ExchangesAPIRequest,
  ExchangesAPIResponse
} from "./types";
import { logEndpointError, logError, logEndpointCall } from "./logger";
import { version } from "../package.json";
import { getCurrentProvider } from "./providers";
import { promisify } from "./utils"

const provider = getCurrentProvider();
provider.init();

function endpoint<In, Out>(validateInput: mixed => In, f: In => Promise<Out>) {
  return (req: *, res: *) => {
    logEndpointCall(req);
    Promise.resolve(req)
      .then(validateInput)
      .then(request =>
        f(request).then(
          response => res.json(response),
          error => {
            logEndpointError(req, error);
            res.status(500).send();
          }
        )
      )
      .catch(error => {
        logEndpointError(req, error);
        res.status(400).send({ message: String(error.message) });
      });
  };
}

var app = express();

app.use(cors());
app.use(bodyParser.json());

app.get("/blocks/current", (req: *, res: *) => {
  provider.getCurrentBlock()
  .then(block => {
    res.status(200).send({
      hash: block.blockHash,
      height: block.blockHeight
    });
  })
  .catch(error => {
    logEndpointError(req, error);
    res.status(503).send([
      {
        status: "KO",
        service: "provider"
      }
    ]);
  });
});

app.get("/fees", (req: *, res: *) => {
  provider.getGasPrice()
  .then(gasPrice => {
    res.status(200).send({
      gas_price: gasPrice,
    });
  })
  .catch(error => {
    logEndpointError(req, error);
    res.status(503).send([
      {
        status: "KO",
        service: "provider"
      }
    ]);
  });
});

app.get("/addresses/:address/nonce", (req: *, res: *) => {
  provider.getAccountNonce(req.params.address)
  .then(nonce => {
    res.status(200).send({ nonce });
  })
  .catch(error => {
    logEndpointError(req, error);
    res.status(503).send([
      {
        status: "KO",
        service: "provider"
      }
    ]);
  });
});

app.get("/addresses/:address/balance", (req: *, res: *) => {
  provider.getAccountBalance(req.params.address)
  .then(balance => {
    res.status(200).send({ balance });
  })
  .catch(error => {
    logEndpointError(req, error);
    res.status(503).send([
      {
        status: "KO",
        service: "provider"
      }
    ]);
  });
});

app.post("/erc20/balance", (req: *, res: *) => {
  provider.getAccountTokenBalance(req.body.address, req.body.contract)
  .then(balance => {
    res.status(200).send({ balance });
  })
  .catch(error => {
    logEndpointError(req, error);
    res.status(503).send([
      {
        status: "KO",
        service: "provider"
      }
    ]);
  });
});

app.post("/addresses/:address/estimate-gas-limit", (req: *, res: *) => {
  provider.getEstimatedGasLimit(req.params.address, req.body.to, req.body.input)
  .then(gasEstimation => {
    res.status(200).send({ estimated_gas_limit: gasEstimation });
  })
  .catch(error => {
    logEndpointError(req, error);
    res.status(503).send([
      {
        status: "KO",
        service: "provider"
      }
    ]);
  });
});

app.get("/addresses/:address/transactions", (req: *, res: *) => {
  provider.getAccountTransactions(req.params.address)
  .then(txs => {
    res.status(200).send({ txs });
  })
  .catch(error => {
    logEndpointError(req, error);
    res.status(503).send([
      {
        status: "KO",
        service: "provider"
      }
    ]);
  });
});

app.get("/transactions/:hash", (req: *, res: *) => {
  provider.getTransactionByHash(req.params.hash)
  .then(tx => {
    const transferEvents = tx.ERC20Transactions.map(erc20Tx => {
      return {
        contract: erc20Tx.contractAddress,
        from: erc20Tx.from,
        to: erc20Tx.to,
        count: erc20Tx.value
      }
    });

    const internalTxs = tx.internalTransactions.map(internalTx => {
      return {
        from: internalTx.from,
        to: internalTx.to,
        value: internalTx.value,
        gas: internalTx.gasPrice,
        gas_used: internalTx.gasUsed
      }
    });

    const {
      hash,
      from,
      to,
      input,
      value,
      confirmations
    } = tx;

    res.status(200).send({
      hash,
      from,
      to,
      input,
      value,
      confirmations,
      gas_price: tx.gasPrice,
      gas_used: tx.gasUsed,
      gas_limit: tx.gasLimit,
      transfer_events: {
        list: transferEvents
      },
      actions: internalTxs
    });
  })
  .catch(error => {
    logEndpointError(req, error);
    res.status(503).send([
      {
        status: "KO",
        service: "provider"
      }
    ]);
  });
});

if (process.env.HACK_SYNC_IN_SERVER) {
  require("./sync");
}

const port = process.env.PORT || 8088;
app.listen(port, () => {
  console.log(`Server running on ${port}`); // eslint-disable-line no-console
});
