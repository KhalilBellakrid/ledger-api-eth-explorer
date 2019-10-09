//@flow

import axios from "axios";
import { logAPI, logAPIError } from "../logger";
import type from "../types";
import { getMethodFromRPC } from "../rpc";

let currentBlock;
const recurrentGetCurrentBlock = async (ms: number) => {
  currentBlock = await getCurrentBlock();
  setTimeout(() => recurrentGetCurrentBlock(ms), ms);
};

function init() {
  //recurrentGetCurrentBlock(30 * 1000);
}

const get = async (url: string, opts?: *) => {
  const beforeTime = Date.now();
  try {
    const blockscoutUrl = `https://blockscout.com/eth/mainnet/api`;
    const baseUrl = url.length > 0 ? `${blockscoutUrl}/${url}` : blockscoutUrl;
    const res = await axios.get(baseUrl, {
      timeout: 60000,
      headers: {
        "content-type": "application/json"
      },
      ...opts
    });
    logAPI({
      api: "blockscout",
      url,
      opts,
      duration: Date.now() - beforeTime,
      status: res.status
    });
    return res.data;
  } catch (error) {
    logAPIError({
      api: "blockscout",
      error,
      url,
      opts,
      duration: Date.now() - beforeTime
    });
    throw error;
  }
};

const getCurrentBlock = async () => {
  const r = await get("", {
    params: {
      module: "block",
      action: "eth_block_number"
    }
  });
  return {
    blockHeight: BigInt(r.result).toString(),
    blockHash: "" // TODO: check that we don't use this, otherwise use RPC with eth_getBlockByNumber
  };
};

const getAccountBalance = async (accountAddress: string) => {
  const r = await get("", {
    params: {
      module: "account",
      action: "eth_get_balance",
      address: accountAddress
    }
  });
  return BigInt(r.result).toString();
};

const getAccountTokenBalance = async (
  accountAddress: string,
  tokenAddress: string
) => {
  const r = await get("", {
    params: {
      module: "account",
      action: "tokenbalance",
      contractaddress: tokenAddress,
      address: accountAddress
    }
  });
  return BigInt(r.result).toString();
};

const getAccountTransactions = async (accountAddress: string) => {
  // First we get the transaction list
  const txs = (await get("", {
    params: {
      module: "account",
      action: "txlist",
      address: accountAddress
    }
  }))
  .result.map(tx => {
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: parseInt(tx.value),
      gasPrice: parseInt(tx.gasPrice),
      gasLimit: parseInt(tx.gas),
      gasUsed: parseInt(tx.gasUsed),
      nonce: parseInt(tx.nonce).toString(16),
      block: {
        blockNumber: parseInt(tx.blockNumber),
        blockHash: tx.blockHash
      },
      confirmations: parseInt(tx.confirmations),
      input: tx.input,
      status: parseInt(tx.txreceipt_status),
      ERC20Transactions: [],
      internalTransactions: []
    }
  });

  // Then we get the transfer events
  const ERC20Txs = (await get("", {
    params: {
      module: "account",
      action: "tokentx",
      address: accountAddress
    }
  })).result;

  // Update transactions with transfer events
  ERC20Txs.map(async erc20Tx => {
    const parentTx = txs.find(tx => tx.hash === erc20Tx.hash);
    const indexOfParentTx = txs.indexOf(parentTx);

    const getERC20Tx = iTx => {
      return {
        from: iTx.from,
        to: iTx.to,
        contractAddress: iTx.contractAddress,
        value: parseInt(iTx.value)
      }
    };

    if (!!parentTx) {
      parentTx.ERC20Transactions.push(getERC20Tx(erc20Tx));
      txs[indexOfParentTx] = parentTx;
    } else {
      // Otherwise we need to fetch the parent tx
      const newTx = await getTransactionByHash(erc20Tx.hash);
      newTx.internalTransactions.push(getERC20Tx(erc20Tx));
      // Add new tx to list of txs
      txs.push(newTx);
    }
  });

  // Finally we get the internal transactions
  const internalTxs = (await get("", {
    params: {
      module: "account",
      action: "txlistinternal",
      address: accountAddress
    }
  })).result;

  // Update transactions with internal transactions
  internalTxs.map(async internalTx => {
    const parentTx = txs.find(tx => tx.hash === internalTx.transactionHash);
    const indexOfParentTx = txs.indexOf(parentTx);

    // If accountAddress appears (from or to) in tx
    const getInternalTx = iTx => {
      return {
        from: iTx.from,
        to: iTx.to,
        value: parseInt(iTx.value),
        gasPrice: parseInt(iTx.gas),
        gasUsed: parseInt(iTx.gasUsed),
        input: iTx.input,
      }
    };

    if (!!parentTx) {
      parentTx.internalTransactions.push(getInternalTx(internalTx));
      txs[indexOfParentTx] = parentTx;
    } else {
      // Otherwise we need to fetch the parent tx
      const newTx = await getTransactionByHash(internalTx.transactionHash);
      newTx.internalTransactions.push(getInternalTx(internalTx));
      // Add new tx to list of txs
      txs.push(newTx);
    }
  });
  return txs;
};

const getTransactionByHash = async (txHash: string) => {
  const rTx = (await get("", {
    params: {
      module: "transaction",
      action: "gettxinfo",
      txhash: txHash
    }
  }));

  const tx = rTx.result;
  // If a field is missing then call RPC
  if (!!Object.keys(tx).filter(k => tx[k] === undefined)) {
    const rpcTx = await getMethodFromRPC("eth_getTransactionByHash", [ txHash ]);
    tx.gasPrice = rpcTx.gasPrice;
    tx.nonce = rpcTx.nonce;
    tx.blockHash = rpcTx.blockHash;
  }

  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: parseInt(tx.value),
    gasPrice: parseInt(tx.gasPrice), // Does not exist
    gasLimit: parseInt(tx.gasLimit) || parseInt(tx.gas),
    gasUsed: tx.gasUsed,
    nonce: parseInt(tx.nonce).toString(16),
    block: {
      blockNumer: parseInt(tx.blockNumber),
      blockHash: tx.blockHash
    },
    confirmations: parseInt(tx.confirmations),
    input: tx.input,
    status: parseInt(rTx.status),
    timeStamp: (new Date(tx.timeStamp * 1000)).toISOString().replace('.000',''), //TODO: Is there a better way to get rid of ms ?
    ERC20Transactions: [],
    internalTransactions: []
  }
};

const getAccountNonce = async (accountAddress: string) => {
  //Not implemented by blockscout
  const hexNonce = await getMethodFromRPC("eth_getTransactionCount", [accountAddress, "latest"]);
  return BigInt(hexNonce).toString();
};

const getGasPrice = async () => {
  //Not implemented by blockscout
  const hexGasPrice = await getMethodFromRPC("eth_gasPrice", []);
  return BigInt(hexGasPrice).toString();
};

const getEstimatedGasLimit = async (
  from: string,
  to: string,
  input: string
) => {
  //Not implemented by blockscout
  const hexGasEstimation = await getMethodFromRPC("eth_estimateGas",[{from, to, data: input}]);
  return BigInt(hexGasEstimation).toString();
};

const pushRawTransaction = async (rawTx: string) => {
  //Not implemented by blockscout
  return getMethodFromRPC("eth_sendRawTransaction", [rawTx]);
};

const provider: Provider = {
  init,
  getAccountBalance,
  getAccountTokenBalance,
  getAccountNonce,
  getAccountTransactions,
  getGasPrice,
  getCurrentBlock,
  getEstimatedGasLimit,
  getTransactionByHash,
  pushRawTransaction
};

export default provider;
