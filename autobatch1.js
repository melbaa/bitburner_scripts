import {get_total_threads_for_op} from 'melba.js'
import {weaken_analyze_threads2 as weaken_analyze_threads}  from 'melba.js'
import {opscripts} from 'melba.js'


/** @param {NS} ns */
function execop(ns, execserver, targetserver, op, threads) {
  ns.scp(opscripts[op], execserver)
  return ns.exec(opscripts[op], execserver, {threads:threads}, targetserver)
}

/** @param {NS} ns */
function execop_per_thread(ns, targetserver, threads_needed, op) {

  let total_threads_for_op = get_total_threads_for_op(ns, op)
  const pids = []

  while (threads_needed) {
    const execserver = get_exec_server(total_threads_for_op, op)
    if (execserver == null) break;
    const pid = execop(ns, execserver, targetserver, op, 1)
    threads_needed -= 1
    pids.push(pid)
  }
  return pids
}

function get_exec_server(total_threads_for_op, op) {
  for (let server of Object.keys(total_threads_for_op)) {
    if (total_threads_for_op[server][op]) {
      total_threads_for_op[server][op] -= 1
      return server
    }
  }
  return null
}

/** @param {NS} ns */
export async function main(ns) {

  let op_weaken = 'w'
  let op_growth = 'g'
  let op_hack = 'h'

  let targets_raw = ['n00dles', 'phantasy', 'joesguns', 'harakiri-sushi', 'zer0']
  let total_threads_for_weaken = get_total_threads_for_op(ns, op_weaken)
  let targets = []

  // find hacked targets
  for (let server of targets_raw) {
    //ns.tprint(total_threads_available[server])
    //ns.tprint(server)
    if (total_threads_for_weaken[server]) {
      targets.push(server)
    }
  }

  ns.tprint('targets found ' + targets)


  const weaken_pids_for_target = {}
  const growth_pids_for_target = {}

  for (let server of targets) {

    /*
    for each server find if it needs weaken threads
    for each weakenthread
    find a server with a thread available
    exec weaken on it
    */


    const minseclvl = ns.getServerMinSecurityLevel(server)
    const seclvl = ns.getServerSecurityLevel(server)
    const goalseclvl = seclvl - minseclvl
    let weakenthreads = weaken_analyze_threads(ns, goalseclvl)
    ns.tprintf('server %s needs %d weaken threads', server, weakenthreads)

    weaken_pids_for_target[server] = []

    while (weakenthreads) {
      const execserver = get_exec_server(total_threads_for_weaken, op_weaken)
      if (execserver == null) break;
      const pid = execop(ns, execserver, server, op_weaken, 1)
      weakenthreads -= 1
      weaken_pids_for_target[server].push(pid)
    }
    
    /*
    growth op
    for each server find if it needs op threads
    for each thread needed
    find a server with a thread available
    exec op on it
    */

    const money = ns.getServerMoneyAvailable(server)
    const maxmoney = ns.getServerMaxMoney(server)
    const growthanalyzeratio = maxmoney/money
    ns.tprintf('growthanalyze ratio ' + growthanalyzeratio)
    const growththreads = Math.ceil(ns.growthAnalyze(server, growthanalyzeratio))
    ns.tprintf('server %s needs %d %s threads', server, growththreads, op_growth)

    const pids = execop_per_thread(ns, server, growththreads, op_growth)
    growth_pids_for_target[server] = pids
  }
}
