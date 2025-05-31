/** @param {NS} ns */
export async function main(ns) {
  const cmd = ns.args[0]
  if (cmd == 'buy') {
    const ram = ns.args[1]
    const cost = ns.getPurchasedServerCost(ram)
    ns.tprintf('cost is %d', cost)
  } else if (cmd == 'upgrade') {
    const ram = ns.args[1]
    const server = ns.args[2]
    const cost = ns.getPurchasedServerUpgradeCost(server, ram)
    ns.tprintf('cost is %d', cost)
  }
}