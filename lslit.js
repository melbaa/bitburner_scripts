import {find_all_hacked_servers} from 'melba.js'
import {print_connect} from 'melba.js'


/** @param {NS} ns */
export async function main(ns) {
  let substring = ns.args[0]

  let servers = find_all_hacked_servers(ns)
  let blacklist = new Set(
    [
      'democracy-is-dead.lit',
      'simulated-reality.lit',
      'sector-12-crime.lit',
      'man-and-machine.lit',
      'tensions-in-tech-race.lit',
      'beyond-man.lit',
      'the-new-god.lit',
      'new-triads.lit',
      'alpha-omega.lit',
      'synthetic-muscles.lit',
    ]
  )
  for (let server of servers) {
    let result = ns.ls(server, substring)
    let result2 = result.filter((val) => !val.endsWith('.js') && !blacklist.has(val))
    if (!result2.length) continue
    ns.tprint(server, ' ', result2)
    print_connect(ns, server)
  }
}