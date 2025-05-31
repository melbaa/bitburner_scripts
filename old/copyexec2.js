import {find_all_servers} from './melba.js';

/** @param {NS} ns */
export async function main(ns) {
  const killall = ns.args[0];

  var hostname = ns.getHostname()
  
  var hackscript = 'hack.js'
  var hackscriptram = ns.getScriptRam(hackscript)
  

  let servers = find_all_servers(ns)


  for (let server of servers) {
    if (server.startsWith('buyserv')) {
      // TODO 
      continue;
    }
    if (!ns.hasRootAccess(server)) {
      //ns.tprintf('no root on %s', server)
      continue;
    }
    if (server == 'home') {
      // TODO
      continue;
    }

    if (server != 'home') {
      ns.scp(hackscript, server)
    }
    if (killall == 'killall') {
      ns.killall(server)
    }

    let maxram = ns.getServerMaxRam(server)
    let usedram = ns.getServerUsedRam(server)
    let availram = maxram - usedram
    var threads = Math.floor(availram / hackscriptram);
    if (threads <= 0) {
      ns.tprintf('low ram server %s', server)
      continue;
    }
    var currenthacking = ns.getHackingLevel()
    var reqhacking = ns.getServerRequiredHackingLevel(server)
    if (reqhacking > currenthacking) {
      ns.tprintf('low hacking level for %s. required %s', server, reqhacking)
      continue;
    }

    const maxmoney = ns.getServerMaxMoney(server)
    const minseclevel = ns.getServerMinSecurityLevel(server)
    const playerhacklvl = ns.getHackingLevel()
    //const hackanalyzesec = ns.hackAnalyzeSecurity(threads, server)
    ns.exec(hackscript, server, {threads: threads}, threads, server, maxmoney, minseclevel, playerhacklvl)
  }
}