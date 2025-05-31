var HACKSCRIPT = 'hacktemplate.script';


/** @param {NS} ns **/
export async function main(ns) {
	var args = ns.args;
	var money = ns.getServerMoneyAvailable('home');
	var ram = 2;
	var cost = 0;
	var power = 1;
	while (cost < money) {
		ram *= 2;
		cost = ns.getPurchasedServerCost(ram);
	}
	var nextcost = cost;
	ram /= 2;
	cost = ns.getPurchasedServerCost(ram);
	var costfmt = ns.nFormat(cost, "0.000a")
	var nextcostfmt = ns.nFormat(nextcost, "0.000a")

	var allow = false;
	if (args.length == 0) {
		var promptxt = ns.sprintf('purchase server with %d ram for $%s? next is %s', ram, costfmt, nextcostfmt);
		ns.tprint(promptxt)
	}
	else if (args.length == 1 && (args[0] == 'y' || args[0] == 'yes' || args[0] == '1')) {
		allow = true;
	} else {
	}
	
	if (!allow) return;

	// are we at server limit? if yes, try to delete a server with < ram.
	var limit = ns.getPurchasedServerLimit();
	var owned_servers = ns.getPurchasedServers();
	if (owned_servers.length >= limit) {
		for(const owned_name of owned_servers) {
			let oldram = ns.getServerMaxRam(owned_name);
			if (oldram < ram) {
				
				if (ns.scriptRunning(HACKSCRIPT, owned_name))
					ns.scriptKill(HACKSCRIPT, owned_name);

				ns.tprint('deleting ', owned_name, ' ', ns.deleteServer(owned_name));
				break;
			}
		}
	}

	// pick a name for the new server
	var idx = 0;
	var name = '';
	for (; idx < 1000000; ++idx) {
		name = 'mel-' + idx;
		if (!ns.serverExists(name)) break;
	}
	
	ns.tprint('buying ', ns.purchaseServer(name, ram), ' for ', costfmt);
}