/** @param {NS} ns */
export async function main(ns) {
  const threads = 450
  const val = ns.weakenAnalyze(threads)
  ns.tprint(val)

}