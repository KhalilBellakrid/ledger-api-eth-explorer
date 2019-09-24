// @flow

import axios from "axios";
import { logAPI, logAPIError } from "./logger";

const LEDGER_TOKEN = process.env.LEDGER_TOKEN;
const RPC_VERSION = process.env.RPC_VERSION || "2.0";
if (!LEDGER_TOKEN) {
  throw new Error("LEDGER_TOKEN env is required. http://ci-daemons.explorers.dev.aws.ledger.fr:9999/proxy/eth");
}

const get = async (url: string, opts?: *) => {
  const beforeTime = Date.now();
  try {
    const res = await axios.post(`http://ci-daemons.explorers.dev.aws.ledger.fr:9999/proxy/eth/${url}`,
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
  return r.result;
};
