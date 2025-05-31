/** @param {NS} ns */
export async function main(ns) {
  var servers = ns.scan()
  for(var server of servers) {
    var neededports = ns.getServerNumPortsRequired(server);
    if (neededports == 0) {
      ns.nuke(server)
    }
  }
}