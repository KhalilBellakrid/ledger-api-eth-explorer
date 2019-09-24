// @flow

import blockscout from "./blockscout";


import type { Provider } from "../types";

export const providers: { [_: string]: Provider } = {
  blockscout
};

export const getCurrentProvider = (): Provider => {
  const key = process.env.PROVIDER || "blockscout";
  const provider = providers[key];
  if (!provider) {
    throw new Error(`provider '${key}' not found`);
  }
  return provider;
};
