import { find_all_hacked_servers } from "melba.js";


function comparator(a, b) {
  if (a.formulas == 1) {
    return a.steal_50pct - b.steal_50pct

  } else {
    let coefa = 0.4 * a.growth/100 + 0.5 * a.stealperhackperms/20
    let coefb = 0.4 * b.growth/100 + 0.5 * b.stealperhackperms/20
    return coefa - coefb
  }
  return a.moneydiff - b.moneydiff
  if (Math.abs(a.seclevel - b.seclevel) >= 2) return a.seclevel - b.seclevel;
}

/** @param {NS} ns */
export function add_formulas(ns, row, server) {
  if (!ns.fileExists('formulas.exe')) {
    return
  }


  let player = ns.getPlayer()
  let serverobj = ns.getServer(server)

  serverobj.hackDifficulty = serverobj.minDifficulty
  let maxmoney = serverobj.moneyMax
  let halfmoney = maxmoney / 2
  let weakentime = ns.formulas.hacking.weakenTime(serverobj, player)


  let growtime = ns.formulas.hacking.growTime(serverobj, player)
  let hacktime = ns.formulas.hacking.hackTime(serverobj, player)
  let hackpct_per_thread = ns.formulas.hacking.hackPercent(serverobj, player)
  let threadsneededhack = 0.5 / hackpct_per_thread


  serverobj.moneyAvailable = halfmoney
  let threadsneededgrow = ns.formulas.hacking.growThreads(serverobj, player, maxmoney)

  // what will be server security after this many hacks and grows?
  let seclvl = ns.hackAnalyzeSecurity(threadsneededhack, server)
  seclvl += ns.growthAnalyzeSecurity(threadsneededgrow, server)

  // TODO
  let threadsneededweaken = seclvl / 0.05

  let steal_50pct = (maxmoney * 0.5) / (
    (hacktime * threadsneededhack)
     + (growtime * threadsneededgrow)
     + (weakentime * threadsneededweaken)
  );
  row.steal_50pct = steal_50pct
  row.threadsneededhack = threadsneededhack
  row.threadsneededgrow = threadsneededgrow
  row.threadsneededweaken = threadsneededweaken
  row.seclvl = seclvl
  row.formulas = 1

}

/** @param {NS} ns */
export async function main(ns) {
  let servers = find_all_hacked_servers(ns)

  let aug = [];
  for (let server of servers) {
    if (server == 'home') continue;
    if (server.startsWith('melbaserv')) continue;

    var seclevel = ns.getServerSecurityLevel(server)
    var minseclevel = ns.getServerMinSecurityLevel(server)

    var maxmoney = ns.getServerMaxMoney(server);
    var money = ns.getServerMoneyAvailable(server);
    var moneydiff = Math.floor(maxmoney - money)

    var growth = ns.getServerGrowth(server);
    var hackanalyze = ns.hackAnalyze(server); // pct stolen per thread
    var growtime = ns.getGrowTime(server);
    var weakentime = ns.getWeakenTime(server);


    var hacktime = ns.getHackTime(server);
    var stealperhackperms = money * hackanalyze / hacktime;
    var stealperhackperms = maxmoney * hackanalyze / (hacktime + growtime + weakentime);

    let hackskill = ns.getHackingLevel()
    let hackskillreq = ns.getServerRequiredHackingLevel(server)

    let portsneeded = ns.getServerNumPortsRequired(server)


    const row = {
      server:server,
      
      minseclevel:minseclevel,
      seclevel:ns.formatNumber(seclevel),

      money:ns.formatNumber(money),
      maxmoney:ns.formatNumber(maxmoney),
      moneydiff:ns.formatNumber(moneydiff),

      growth:growth,
      //growtime:growtime,
      hackanalyze:ns.formatPercent(hackanalyze, 3),
      stealperhackperms:stealperhackperms,
      //hacktime:hacktime,
      portsneeded:portsneeded,
      hackskillreq: hackskillreq,

    }

    add_formulas(ns, row, server)

    aug.push(row)
  }
  aug.sort(comparator)

  //  if (Math.abs(seclevel - minseclevel) < 2) continue;

  for (let entry of aug)
    ns.tprintf('\n%j', entry)
  
}