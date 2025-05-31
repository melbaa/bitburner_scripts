import {find_all_servers} from 'melba.js';
import {scan_and_nuke} from 'melba.js'



/** @param {NS} ns */
export async function main(ns) {
  scan_and_nuke(ns)

}

