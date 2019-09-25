// @flow

import axios from "axios";
import { logAPI, logAPIError } from "./logger";

const LEDGER_RPC_NODE_ENDPOINT = process.env.LEDGER_RPC_NODE_ENDPOINT;
if (!LEDGER_RPC_NODE_ENDPOINT) {
  throw new Error("LEDGER_RPC_NODE_ENDPOINT env is required.");
}
const LEDGER_TOKEN = process.env.LEDGER_TOKEN;
if (!LEDGER_TOKEN) {
  throw new Error(`LEDGER_TOKEN env is required to use: ${LEDGER_RPC_NODE_ENDPOINT}`);
}

const RPC_VERSION = process.env.RPC_VERSION || "2.0";


const get = async (url: string, opts?: *) => {
  const beforeTime = Date.now();
  try {
    const res = await axios.post(`${LEDGER_RPC_NODE_ENDPOINT}/${url}`,
      opts.data,
      {
      timeout: 60000,
      headers: {
        "authorization": `Basic ${LEDGER_TOKEN}`,
        "content-type": "application/json"
      }
    });

    logAPI({
      api: "RPC",
      url,
      opts,
      duration: Date.now() - beforeTime,
      status: res.status
    });
    return res.data;
  } catch (error) {
    logAPIError({
      api: "RPC",
      error,
      url,
      opts,
      duration: Date.now() - beforeTime
    });
    throw error;
  }
};

export async function getMethodFromRPC(method: string, params: string[]): Promise<string> {
  const r = await get("", {
    data: {
      jsonrpc: RPC_VERSION,
      method,
      params,
      id: "0"
    }
  });
  if (!r.result && !!r.error) {
    throw new Error(`${r.error.message}, used params for RPC call : ${params}`);
  }
  return r.result;
};
