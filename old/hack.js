/** @param {NS} ns */
function should_grow(ns, hostname, money, maxmoney, lastgrowamount) {
  if (hostname == 'n00dles') {
    //ns.printf('%s %f %f', hostname, money, maxmoney)
    if (maxmoney - money > 40 * 7000) {
      return true
    } else {
      return false;
    }
  }
  if (hostname == 'foodnstuff') {
    return false;
  }
  return money * (1 + lastgrowamount) < maxmoney
}



/** @param {NS} ns */
export async function main(ns) {

  const threads = ns.args[0];
  var hostname = ns.args[1]

  var maxmoney = ns.args[2]
  var minseclevel = ns.args[3]
  const secdiff = 0.05 * threads;
  const playerhacklvl = ns.args[4]


  let retarget = 'n00dles'
  if (playerhacklvl >= 10 && ns.hasRootAccess('joesguns'))
    retarget = 'joesguns'
  if (playerhacklvl >= 40 && ns.hasRootAccess('harakiri-sushi'))
    retarget = 'harakiri-sushi'
  if (playerhacklvl >= 100 && ns.hasRootAccess('phantasy'))
    retarget = 'phantasy'
  retarget = 'harakiri-sushi'

  // let scripted servers do their own thing
  let scripted = new Set(['n00dles', 'foodnstuff', 'joesguns', 'phantasy', 'harakiri-sushi'])
  if (!scripted.has(hostname)) {
    hostname = retarget
  }



  let lastgrowamount = 0
  let lastmoney = 1
  let lasthackamount = 1
  let moneygained = 1


  while (1) {
    //ns.tprint('loop with ' + hostname)
    //ns.printf("moneygained %f lastmoney %f lastgrow %f lasthack %f", moneygained, lastmoney, lastgrowamount, lasthackamount)

    var seclevel = ns.getServerSecurityLevel(hostname)
    if (seclevel > minseclevel + secdiff) {
      await ns.weaken(hostname)
      continue;
    }


    var money = ns.getServerMoneyAvailable(hostname)
    lastmoney = money;
    if (should_grow(ns, hostname, money, maxmoney, lastgrowamount)) {
      lastgrowamount = await ns.grow(hostname)
      lastgrowamount /= 100;
      moneygained = money * lastgrowamount;
      continue;
    }
    lasthackamount = await ns.hack(hostname);

    // drained server picks next target
    if (lasthackamount < 2000 && hostname == 'foodnstuff') hostname = retarget
  }
}