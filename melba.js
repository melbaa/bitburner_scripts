/**
 * @param {NS} ns 
 * @returns {Set} all servers
 **/
export function find_all_servers(ns){

  const visited = new Set();

  const queue = [ns.getHostname()];
  while (queue.length) {
    const server = queue.pop()
    visited.add(server)
    const servers = ns.scan(server);
    for (let newserver of servers) {
      if (visited.has(newserver)) {
        continue;
      }
      queue.push(newserver)
    }
  }
  return visited
}

export function find_all_hacked_servers(ns) {
  let servers = find_all_servers(ns)
  var currenthacking = ns.getHackingLevel()
  let result = new Set()
  for (let server of servers) {
    if (!ns.hasRootAccess(server)) continue;
    var reqhacking = ns.getServerRequiredHackingLevel(server)
    if (currenthacking < reqhacking) continue;
    result.add(server);
  }
  return result
}

/** @param {NS} ns */
export function get_server_ram(ns, server) {
  return ns.getServerMaxRam(server) - ns.getServerUsedRam(server)
}


/** @param {NS} ns */
/** returns num threads to minimize security lvl */
export function weaken_analyze_threads(ns, goalseclvl, cpucores) {
  // TODO can save a thread for small values of goalseclvl
  // TODO cpu cores
  let total = 0
  let threads = 0
  while (total < goalseclvl) {
    threads += 1
    total = ns.weakenAnalyze(threads, cpucores)
  }
  return threads
}


export function weaken_analyze_threads2(ns, goalseclvl) {
  // saves a weaken thread, but we might be losing time if there are a lot of hack/grow threads
  let threads = 0
  while (goalseclvl >= ns.weakenAnalyze(1)) {
    threads += 1
    goalseclvl -= ns.weakenAnalyze(1)
  }
  return threads
}

export const opscripts = {
  w: 'weakenop.js',
  h: 'hackop.js',
  g: 'growop.js',
}


/** @param {NS} ns */
export function get_total_threads(ns) {
  let totals = {}

  const scriptramneeded = {
    w: ns.getScriptRam(opscripts['w']),
    h: ns.getScriptRam(opscripts['h']),
    g: ns.getScriptRam(opscripts['g']),
  }

  let servers = find_all_servers(ns)
  var currenthacking = ns.getHackingLevel()
  for (let server of servers) {
    if (!ns.hasRootAccess(server)) continue;
    var reqhacking = ns.getServerRequiredHackingLevel(server)
    if (currenthacking < reqhacking) continue;

    let server_info = {h:0, g:0, w:0}
    const ram = get_server_ram(ns, server)
    for (let op of 'hgw') {
      server_info[op] += Math.floor(ram / scriptramneeded[op])
    }

    totals[server] = server_info
  }

  return totals
}


/**
 * @param {NS} ns 
 * @param {Char} op one of h g w
 * scans all servers, computes how many `op` threads are on each
 **/
export function get_total_threads_for_op(ns, op) {
  const totals = {}
  const scriptramneeded = {}
  scriptramneeded[op] = ns.getScriptRam(opscripts[op])

  let servers = find_all_servers(ns)
  var currenthacking = ns.getHackingLevel()
  for (let server of servers) {
    if (!ns.hasRootAccess(server)) continue;
    var reqhacking = ns.getServerRequiredHackingLevel(server)
    if (currenthacking < reqhacking) continue;

    const adjust_home_ram = (server == 'home') * 10
    const ram = get_server_ram(ns, server) - adjust_home_ram
    const server_info = {
      [op]: Math.floor(ram / scriptramneeded[op]),
    }
    totals[server] = server_info
  }
  return totals
}

/** @param {NS} ns */
export function scan_and_nuke(ns) {
  let servers = find_all_servers(ns)
  for (const server of servers) {
    var neededports = ns.getServerNumPortsRequired(server);
    if (!ns.hasRootAccess(server)) {
      // ns.tprintf('%s %d', server, neededports)
    }

    if (neededports == 5 && ns.fileExists('sqlinject.exe') && ns.sqlinject(server)) {
      neededports --;
    }
    if (neededports == 4 && ns.fileExists('httpworm.exe') && ns.httpworm(server)) {
      neededports --;
    }
    if (neededports == 3 && ns.fileExists('relaysmtp.exe') && ns.relaysmtp(server)) {
      neededports --;
    }
    //ns.tprintf('%s %d', server, neededports)
    if (neededports == 2 && ns.fileExists('ftpcrack.exe') && ns.ftpcrack(server)) {
      neededports --;
    }
    //ns.tprintf('%s %d', server, neededports)
    if (neededports == 1 && ns.fileExists('brutessh.exe') && ns.brutessh(server)) {
      neededports --;
    }
    //ns.tprintf('%s %d', server, neededports)
    if (neededports == 0) {
      if (ns.nuke(server)) {

      } else {
        ns.tprint('no skill for ', server)
      }
    }
  }
}



/** @param {Set} visited */
export function print_connect(ns, goal) {
  let path = ['home']
  let idx = 0
  let visited = new Set()

  print_connect_inner(ns, path, idx, visited, goal)
}

/** @param {Set} visited */
function print_connect_inner(ns, path, idx, visited, goal) {

  var server = path[idx]

  if (server == goal) {
    var output = ''

    for (var i=0; i < path.length; i++) {
      if (i != 0) output += ';'
      output += 'connect ' + path[i]
    }

    ns.tprint('\n' + output + '\n')
    return;
  }
  if (idx == 50) {
    ns.tprint('max depth')
    return
  }
  visited.add(server)
  let servers = ns.scan(server)
  for (let nextserver of servers) {
    if (visited.has(nextserver)) continue;
    path.push(nextserver)
    print_connect_inner(ns, path, idx+1, visited, goal)
    path.pop()
  }
}
