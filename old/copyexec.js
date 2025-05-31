/** @param {NS} ns */

export async function main(ns) {

  var hostname = ns.getHostname()
  
  var hackscript = 'hack.js'
  var hackscriptram = ns.getScriptRam(hackscript)
  


  var servers = ['n00dles', 'foodnstuff'];
  var servers = ns.scan()
  for (let server of servers) {
    ns.scp(hackscript, server)
    ns.killall(server)

    var maxram = ns.getServerMaxRam(server)
    var threads = Math.floor(maxram / hackscriptram);
    ns.exec(hackscript, server, {threads: threads})
  }

}