/** @param {NS} ns */
export async function main(ns) {
  var scriptname = ns.getScriptName()
  var servers = ns.scan()
  for(var server of servers) {
    var neededports = ns.getServerNumPortsRequired(server);
    if (neededports == 0) {
      ns.nuke(server)
      ns.scp(scriptname, server)
      ns.printf('running {} on {}', scriptname, server)
      ns.exec(scriptname, server)
    }
  }
}