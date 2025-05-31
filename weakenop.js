/** @param {NS} ns */
export async function main(ns) {
  let server = ns.args[0]
  let delayms = ns.args[1] || 0
  await ns.sleep(delayms)
  await ns.weaken(server)
}