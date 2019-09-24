// @flow

// Generic types

export type AccountInfo = {|
  balance: number,
  nonce: string
|};

export type NetworkInfo = {|
  currentBlockHeight: string,
  gasPrice: string
|};

export type TransactionInfo = {|
  estimatedGasLimit: string
|};

export type Block = {|
  blockHeight: string,
  blockHash: string
|};

export type Transaction = {|
  hash: string,
  from: string,
  to: string,
  value: string,
  gasPrice: string,
  gasLimit: string,
  gasUsed: string,
  nonce: string,
  block: Block,
  confirmations: string,
  input: string,
  status: number,
  ERC20Transactions: Array<ERC20Tx>,
  internalTransactions: Array<InternalTx>
|};

export type InternalTx = {|
  from: string,
  to: string,
  value: string,
  gasPrice: string,
  gasUsed: string,
  input: string
|};

export type ERC20Tx = {|
  from: string,
  to: string,
  contractAddress: string,
  value: string
|};

// Provider types

export type Provider = {
  init: () => void,
  getAccountBalance: (accountAddress: string) => Promise<string>,
  getAccountTokenBalance: (
    accountAddress: string,
    tokenAddress: string
  ) => Promise<string>,
  getAccountNonce: (accountAddress: string) => Promise<string>,
  getAccountTransactions: (accountAddress: string) => Promise<Transaction[]>,
  getGasPrice: () => Promise<string>,
  getCurrentBlock: () => Promise<Block>,
  getEstimatedGasLimit: (
    from: string,
    to: string,
    input: string
  ) => Promise<string>,
  getTransactionByHash: (txHash: string) => Promise<Transaction>,
  pushRawTransaction: (rawTx: string) => Promise<number>
};
