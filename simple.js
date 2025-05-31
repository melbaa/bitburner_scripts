/** @param {NS} ns */
export async function act(ns, server, cmd) {
  if (cmd == 'weaken') {
    await ns.weaken(server)
  } else if (cmd =='grow') {
    await ns.grow(server)
  } else if (cmd =='hack') {
    await ns.hack(server)
  } else if (cmd == 'gw') {
    await ns.grow(server)
    await ns.weaken(server)
  } else if (cmd == 'ggw') {
    await ns.grow(server)
    await ns.grow(server)
    await ns.weaken(server)
  } else if (cmd.startsWith('S')) {
    // a Script, eg Sggw will grow, grow, weaken
    for (let i = 1; i < cmd.length; ++i) {
      if (cmd[i]=='g') await ns.grow(server)
      else if (cmd[i] == 'w') await ns.weaken(server)
      else if (cmd[i] == 'h') await ns.hack(server)
    }
  } else {
    throw 'idk'
  }
}



/** @param {NS} ns */
export async function main(ns) {
  const server = ns.args[0];
  const cmd = ns.args[1]
  await act(ns, server, cmd)
}