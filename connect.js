import {print_connect} from 'melba.js'

/** @param {NS} ns */
export async function main(ns) {
  let goal = ns.args[0]

  print_connect(ns, goal)

}