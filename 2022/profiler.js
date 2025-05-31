/** @param {NS} ns **/
export async function main(ns) {
	var target = ns.args[0];
	var money = ns.getServerMaxMoney(target);
	var moneyfmt = ns.nFormat(money, "0.000a")
	ns.tprint('max money ', moneyfmt);
	ns.tprint('min security ', ns.getServerMinSecurityLevel(target));
	var hacktime = Math.max(ns.getGrowTime(target), ns.getWeakenTime(target));
	var hacktimefmt = ns.tFormat(hacktime);
	ns.tprint('hacktime ', hacktimefmt);
	var moneysec = money / hacktime;
	ns.tprint('money/sec ', moneysec);
	var growthanal = ns.growthAnalyze(target, 2);
	ns.tprint('growth analyze ', growthanal);
	ns.tprint('money/sec*threads ',   ns.nFormat(moneysec*growthanal, "0.000a") );
}