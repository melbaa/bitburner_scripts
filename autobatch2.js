import {get_total_threads_for_op} from 'melba.js'
import {weaken_analyze_threads2 as weaken_analyze_threads}  from 'melba.js'
import {opscripts} from 'melba.js'


/** @param {NS} ns */
function execop(ns, execserver, targetserver, op, threads) {
  ns.scp(opscripts[op], execserver)
  return ns.exec(opscripts[op], execserver, {threads:threads}, targetserver)
}


function get_exec_server(total_threads_for_op, op, threadsneeded) {
  for (let server of Object.keys(total_threads_for_op)) {
    if (total_threads_for_op[server][op]) {
      // min among avail and needed
      let threads = Math.min(total_threads_for_op[server][op], threadsneeded)
      total_threads_for_op[server][op] -= threads;
      return [server, threads];
    }
  }
  return [null, null]
}

function execop_batched(ns, server, op, threadsneeded) {
  ns.printf('server %s needs %d %s threads', server, threadsneeded, op)
  const pids = []
  if (threadsneeded <= 0) return pids;
  let total_threads_for_op = get_total_threads_for_op(ns, op)
  while (threadsneeded) {
    const [execserver, threads] = get_exec_server(total_threads_for_op, op, threadsneeded)
    if (execserver == null) break;
    //ns.tprintf('allocating %d threads from %s', threads, execserver)
    let pid = execop(ns, execserver, server, op, threads)
    pids.push({pid:pid, execserver:execserver})
    threadsneeded -= threads
  }
  return pids
}

/** @param {NS} ns */
function get_idle_threads(ns, op) {
  let idlecount = 0
  let total_threads_for_op = get_total_threads_for_op(ns, op)
  for (let server of Object.keys(total_threads_for_op)) {
    let threads = total_threads_for_op[server][op]
    if (!threads) continue;
    idlecount += threads
  }
  return idlecount
}


/** @param {NS} ns */
function buyserver(ns) {
  while (buyserver_inner(ns)) {}

  // upgrade owned servers
  let ownedservers = ns.getPurchasedServers()
  let maxram = ns.getPurchasedServerMaxRam()
  for (let server of ownedservers) {
    let mymoney = ns.getServerMoneyAvailable('home')
    let moneyallowed = mymoney * 0.01
    let ram = ns.getServerMaxRam(server)
    let upgraderam = ram*2
    let cost = ns.getPurchasedServerCost(upgraderam)

    if (ownedservers.length && server == ownedservers[ownedservers.length-1]) {
      ns.printf('ram %s maxram %s cost %s moneyallowed %s', 
        ns.formatNumber(ram), 
        ns.formatNumber(maxram),
        ns.formatNumber(cost),
        ns.formatNumber(moneyallowed),
      )
    }
    if (ram >= maxram) continue;
    if (cost >= moneyallowed) continue;
    ns.upgradePurchasedServer(server, upgraderam)
  }
}

function buyserver_inner(ns) {
  let maxservers = ns.getPurchasedServerLimit()
  let ownedservers = ns.getPurchasedServers()
  let mymoney = ns.getServerMoneyAvailable('home')
  let moneyallowed = mymoney * 0.01
  let initialram = 2
  let initialcost = ns.getPurchasedServerCost(initialram)
  if (ownedservers.length < maxservers && moneyallowed > initialcost) {
    let name = 'melbaserv' + ownedservers.length
    ns.purchaseServer(name, initialram)
    return true;
  }

}


/** @param {NS} ns */
export async function main(ns) {

  ns.disableLog('ALL')

  let op_weaken = 'w'
  let op_grow = 'g'
  let op_hack = 'h'

  let file_overwrite = 'w'
  let statefile = 'state/autobatch.json'

  let targets_raw = [
    'n00dles', 'phantasy', 'harakiri-sushi',
    'silver-helix',
    'zer0',
    'joesguns', 
    'max-hardware',
    'sigma-cosmetics',
    'the-hub',
    'netlink',
    'summit-uni',
    'computek',
    ]
    
  let total_threads_for_weaken = get_total_threads_for_op(ns, op_weaken)
  let targets = []
  const pids_for_target = {}

  if (!ns.fileExists(statefile)) {
    ns.write(statefile, '{}', file_overwrite)
  }
  let state = JSON.parse(ns.read(statefile))

  // find hacked targets
  for (let server of targets_raw) {
    //ns.tprint(total_threads_available[server])
    //ns.tprint(server)
    if (total_threads_for_weaken[server]) {
      targets.push(server)
      pids_for_target[server] = []

      if (state[server]) {
        pids_for_target[server] = state[server]
      }
    }
  }

  ns.print('targets found ' + targets)

  while (1) {
    buyserver(ns)
    
    for (let server of targets) {
      /*
      filter out finished pids
      if all are finished, the server can be worked on
      */
      const pids = []
      for(let {pid, execserver} of pids_for_target[server]) {
        if (ns.isRunning(pid, execserver)) {
          pids.push({pid:pid, execserver:execserver})
        }
      }
      pids_for_target[server] = pids
      if (pids.length) {
        ns.printf('%s still busy. skipping', server)
        continue
      }
  
      
  
      /*
      weaken op
      */
  
      {
        const op = op_weaken
        const minseclvl = ns.getServerMinSecurityLevel(server)
        const seclvl = ns.getServerSecurityLevel(server)
        const goalseclvl = seclvl - minseclvl
        let threadsneeded = weaken_analyze_threads(ns, goalseclvl)
  
        const pids = execop_batched(ns, server, op, threadsneeded)
        pids_for_target[server].push(...pids)
      }
  
      /*
      growth op
      for each server find if it needs op threads
      find a server with free threads
      run op on the server with as many threads as possible on each script invocation
      threads = min(neededthreads, serverthreads)
      */
  
      {
        const op = op_grow
        const money = ns.getServerMoneyAvailable(server)
        const maxmoney = ns.getServerMaxMoney(server)
        const growthanalyzeratio = maxmoney/money
        ns.printf('growthanalyze ratio ' + growthanalyzeratio)
        // TODO this is not accurate when many scripts are started, need formulas API
        let threadsneeded = Math.ceil(ns.growthAnalyze(server, growthanalyzeratio))
  
        const pids = execop_batched(ns, server, op, threadsneeded)
        pids_for_target[server].push(...pids)
      }
  
  
      /*
      hack op
      don't want to steal too much, as it penalizes growth
      how much should be stolen?
      */
      {
        const op = op_hack
        const money = ns.getServerMoneyAvailable(server)
        const maxmoney = ns.getServerMaxMoney(server)
        const minmoney = maxmoney / 5;
        const threadsneeded = Math.floor(ns.hackAnalyzeThreads(server, money - minmoney))
        const moneystolenfraction = ns.hackAnalyze(server) * threadsneeded
        const moneystolenvalmax = maxmoney * moneystolenfraction
  
        const pids = execop_batched(ns, server, op, threadsneeded)
        pids_for_target[server].push(...pids)
      }
    }
    ns.printf('pids %j', pids_for_target)

    let idlethreads = get_idle_threads(ns, op_weaken)
    ns.printf('idle threads %d', idlethreads)

    ns.write(statefile, JSON.stringify(pids_for_target), file_overwrite)

    await ns.sleep(5e3)
  }
}
