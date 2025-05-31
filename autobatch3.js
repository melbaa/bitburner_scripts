import {get_total_threads_for_op} from 'melba.js'
import {find_all_hacked_servers} from 'melba.js'
import {weaken_analyze_threads2 as weaken_analyze_threads}  from 'melba.js'
import {opscripts} from 'melba.js'
import {scan_and_nuke} from 'melba.js'


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

/** @param {NS} ns */
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
function remaining_targets(ns, targets) {
  let servers = find_all_hacked_servers(ns)
  let withmoney = new Set()
  for (let server of servers) {
    if (ns.getServerMaxMoney(server) < 1000) continue;
    withmoney.add(server)
  }
  let result = withmoney.difference(targets)
  return result
}



/** @param {Set} hacked_servers
* @param {Array} targets_whitelist
*/
function find_targets(hacked_servers, targets_whitelist) {
  let result = new Set()
  for (let target of targets_whitelist) {
    if (hacked_servers.has(target)) result.add(target)
  }
  return result
}


/** @param {NS} ns */
function merge_state(ns, pids_for_target, targets, state) {
  for (let server of targets) {
    if (state[server]) {
      pids_for_target[server] = state[server]
    }
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

  let targets_whitelist = [
    'the-hub',
    'omega-net',
    'phantasy',
    'silver-helix',
    'johnson-ortho',
    'computek',
    'harakiri-sushi',
    'catalyst',

    'syscore',
    'zer0',
    'joesguns', 
    'max-hardware',
    'sigma-cosmetics',
    'aevum-police',
    'netlink',
    'summit-uni',
    'rho-construction',
    'nectar-net',
    'rothman-uni',
    'neo-net',
    'millenium-fitness',
    'crush-fitness',
    'iron-gym',
    'alpha-ent',
    'omnia',
    'icarus',
    'applied-energetics',
    'aerocorp',
    'titan-labs',
    'defcomm',
    'nova-med',
    'solaris',
    'zeus-med',
    'b-and-a',
    'infocomm',
    'omnitek',
    'kuai-gong',
    'powerhouse-fitness',
    '4sigma',
    'nwo',
    'blade',
    'deltaone',
    'stormtech',
    'microdyne',
    'taiyang-digital',
    'helios',
    'vitalife',
    'zb-def',
    'univ-energy',
    'unitalife',
    'galactic-cyber',
    'zb-institute',
    'lexo-corp',
    'global-pharm',
    'snap-fitness',
    'megacorp',
    'clarkinc',
    'fulcrumtech',
    'ecorp',
    'fulcrumassets',
    

    'n00dles',
    'foodnstuff',
    'hong-fang-tea',
  ]
    
  const pids_for_target = {}

  // init state
  if (!ns.fileExists(statefile)) {
    ns.write(statefile, '{}', file_overwrite)
  }
  let state = JSON.parse(ns.read(statefile))

  let hacked_servers = find_all_hacked_servers(ns)
  let targets = find_targets(hacked_servers, targets_whitelist)
  for (let server of targets) {
    if (!Object.hasOwn(pids_for_target, server))
      pids_for_target[server] = []
  }

  merge_state(ns, pids_for_target, targets, state)

  ns.print('targets found ' + targets)

  let hacklvl = ns.getHackingLevel()
  scan_and_nuke(ns)

  while (1) {

    let newhacklvl = ns.getHackingLevel()
    if (newhacklvl > hacklvl) {
      hacklvl = newhacklvl
      scan_and_nuke(ns)
    }


    let hacked_servers = find_all_hacked_servers(ns)
    let targets = find_targets(hacked_servers, targets_whitelist)
    for (let server of targets) {
      if (!Object.hasOwn(pids_for_target, server))
        pids_for_target[server] = []
    }

    buyserver(ns)
    
    for (let server of targets) {
      /*
      filter out finished pids
      if all are finished, the server can be worked on
      */
      let serverobj = ns.getServer(server)
      let playerobj = ns.getPlayer()
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
        let threadsneeded = weaken_analyze_threads(ns, goalseclvl, serverobj.cpuCores)
  
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
        const money = ns.getServerMoneyAvailable(server) + 1
        const maxmoney = ns.getServerMaxMoney(server)
        const growthanalyzeratio = Math.max(maxmoney/money, 1)
        ns.printf('growthanalyze ratio ' + growthanalyzeratio)

        // estimate, formulas override it below
        let threadsneeded = Math.ceil(ns.growthAnalyze(server, growthanalyzeratio, serverobj.cpuCores))

        if (ns.fileExists('formulas.exe')) {
          // TODO cores is not accurate, rework execop_batched to have access to execserver
          threadsneeded = ns.formulas.hacking.growThreads(serverobj, playerobj, maxmoney)
        }
  
        const pids = execop_batched(ns, server, op, threadsneeded)
        pids_for_target[server].push(...pids)
      }
  
  
      /*
      hack op
      don't want to steal too much, as it penalizes growth
      how much should be stolen?
      start with 50% and gradually go lower
      */
      {
        const op = op_hack
        const money = ns.getServerMoneyAvailable(server)
        const maxmoney = ns.getServerMaxMoney(server)
        const minmoney = maxmoney / 5;
        const threadsneeded = Math.floor(ns.hackAnalyzeThreads(server, money - minmoney))
        const moneystolenfraction = ns.hackAnalyze(server) * threadsneeded
        const moneystolenvalmax = maxmoney * moneystolenfraction

        if (ns.fileExists('formulas.exe')) {
          // 1 thread
          let hackpct = ns.formulas.hacking.hackPercent(serverobj, playerobj)

          // how many threads needed?
          //threadsneeded = ns.formulas.hacking.ha
        }
  
        const pids = execop_batched(ns, server, op, threadsneeded)
        pids_for_target[server].push(...pids)
      }
    }
    ns.printf('pids %j', pids_for_target)

    let idlethreads = get_idle_threads(ns, op_weaken)
    ns.printf('idle threads %d', idlethreads)

    ns.print('remaining targets ', remaining_targets(ns, targets))

    ns.write(statefile, JSON.stringify(pids_for_target), file_overwrite)

    if (!ns.hasTorRouter()) ns.print("WARNING buy tor router")
    if (!ns.fileExists('formulas.exe')) ns.print("WARNING buy formulas.exe")


    await ns.sleep(5e3)
  }
}


