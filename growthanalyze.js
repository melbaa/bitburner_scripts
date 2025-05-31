import {weaken_analyze_threads} from 'melba.js'

import {add_formulas} from 'findsimpletarget.js'


/** @param {NS} ns */
export async function main(ns) {
  const server = ns.args[0]
  const maxmoney = ns.getServerMaxMoney(server)
  const money = ns.getServerMoneyAvailable(server)
  const moneymissing = maxmoney - money
  const minseclvl = ns.getServerMinSecurityLevel(server)
  const seclvl = ns.getServerSecurityLevel(server)
  const goalseclvl = seclvl - minseclvl
  const threads = Math.floor(ns.hackAnalyzeThreads(server, maxmoney/2))
  const threadsremaining = Math.floor(ns.hackAnalyzeThreads(server, money))
  const moneystolenfraction = ns.hackAnalyze(server) * threads
  const moneystolenvalmax = maxmoney * moneystolenfraction
  const threadstodoublemoney = Math.ceil(ns.growthAnalyze(server, 2))
  const threadstomaxmoney = Math.ceil(ns.growthAnalyze(server, maxmoney/money))
  const threadsweaken = weaken_analyze_threads(ns, goalseclvl)
  ns.tprint('server ' + server)
  ns.tprint('threads ' + threads)
  ns.tprint('computed threads to steal half of maxmoney ' + threads)
  ns.tprint('moneystolen % ' + moneystolenfraction * 100)
  ns.tprint('money ' + money)
  ns.tprint('computed threads to steal remaining money ' + threadsremaining)
  ns.tprint('maxmoney ' + maxmoney)
  ns.tprint('money amount stolen from max ' + moneystolenvalmax)
  ns.tprint('threads needed to double money ' + threadstodoublemoney)
  ns.tprint('threads needed to max money ' + threadstomaxmoney)
  ns.tprint('threads needed to min security ' + threadsweaken)

  // does not work. not all servers have a billion
  // const billion = 1e9
  // const threadsforbillion = Math.floor(ns.hackAnalyzeThreads(server, billion))
  // ns.tprint('threads needed to steal billion ' + threadsforbillion)

  const million = 1e6
  const threadsformillion = Math.floor(ns.hackAnalyzeThreads(server, million))
  ns.tprint('threads needed to steal million ' + threadsformillion)


  if (!ns.fileExists('formulas.exe')) return;
  let player = ns.getPlayer()
  let serverobj = ns.getServer(server)
  let threadsfromcurrentmoney = ns.formulas.hacking.growThreads(serverobj, player, maxmoney)
  ns.tprint('-- formula --')
  ns.tprint('server security ', seclvl)
  ns.tprint('threads needed to max money from ', serverobj.moneyAvailable, ': ', threadsfromcurrentmoney)


  /** @type {Server} */
  let serverobj2 = ns.getServer(server)
  {

    let i = 1;
    while (i <= Math.pow(2,10)) {
      serverobj2.moneyAvailable = maxmoney/i
      let threads = ns.formulas.hacking.growThreads(serverobj2, player, maxmoney)
      ns.tprint('threads needed to max money from 1/' + i, ' ', ns.formatNumber(1/i * maxmoney), ' ', ': ', threads)
      i *= 2;
    }

    serverobj2.moneyAvailable = 0
    let threads = ns.formulas.hacking.growThreads(serverobj2, player, maxmoney)
    ns.tprint('threads needed to max money from 0 ' + threads)

  }

  {
    let threads = 1
    while (threads < 1025) {
      serverobj2.moneyAvailable = maxmoney/2
      let moneyresult = ns.formulas.hacking.growAmount(serverobj2, player, threads)
      let moneygain = moneyresult - serverobj2.moneyAvailable 
      ns.tprint(ns.formatNumber(moneygain), ' money gained from ', threads, ' thread starting from 1/2 money')
      threads *= 2
    }
  }

  {
    let row = {}
    add_formulas(ns, row, server)
    for (let prop of Object.keys(row)) {
      ns.tprint(prop, ' ', row[prop])
    }
  }
  


}
