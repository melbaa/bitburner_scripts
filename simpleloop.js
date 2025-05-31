import {act} from './simple.js';


/** @param {NS} ns */
export async function main(ns) {
  const server = ns.args[0];
  const cmd = ns.args[1];
  while(1) {
    await act(ns, server, cmd) 
  }
}