// analyze servers and hack them


var HACKSCRIPT = 'hacktemplate.script';
var HACKWEAKEN = 'growweaken.script';
var GROWSCRIPT = 'grow.script'


var HACKLEVEL;

var visited;

var hackables;

var PURCHASED;

var hackable_with_extras;

var next_process_id;

var backdoor_path;

function find_hackable(ns, hostname, port_max) {
    visited.push(hostname);
    var hostnames_scan = ns.scan(hostname);
    backdoor_path.push(hostname);
    for(var i=0; i < hostnames_scan.length; ++i) {
        var hostname_scan = hostnames_scan[i];
        if (visited.includes(hostname_scan)) continue;
        visited.push(hostname_scan);


        var serverhacklev = ns.getServerRequiredHackingLevel(hostname_scan);
        if (HACKLEVEL < serverhacklev) { 
            ns.tprint('cant hack ', hostname_scan, ' lvl ', serverhacklev);
            continue;
        }

        var ports = ns.getServerNumPortsRequired(hostname_scan);
        if (ports > port_max) {
            ns.tprint('cant hack ', hostname_scan, ' ports ', ports);
            continue;
        }

        var server_obj = ns.getServer(hostname_scan);
        if (server_obj.purchasedByPlayer) continue;

        var server = {'hostname': hostname_scan, 'server_obj': server_obj};
        hackables.push(server);
        hack_server(ns, port_max, server);

        find_hackable(ns, hostname_scan, port_max);
    }
    backdoor_path.pop();
}

function annotate_hackables(ns) {
    for(var i=0; i < hackables.length; ++i) {
        var server = hackables[i];
        var hostname = server.hostname;

        server.money = ns.getServerMaxMoney(hostname) / 1000000;

        // var sec = getServerMinSecurityLevel(hostname);
        // var secactive = getServerSecurityLevel(hostname);
        // tprint(hostname, ' money(M) ', money, ' mps effective ', money/secactive, ' mps theory ', money/sec);

        server.growtime = ns.getGrowTime(hostname) / 1000 ;
        server.hacktime_real = ns.getHackTime(hostname) / 1000 ;
        server.weaktime = ns.getWeakenTime(hostname) / 1000 ;
        server.hacktime = Math.max(server.growtime, server.hacktime_real, server.weaktime);


        // how many threads to hack for a target percent
        server.hackanalyze = ns.hackAnalyze(hostname);
        ns.print('hackanalize ', server.hackanalyze);
        var hack_threads_needed = Math.floor((0.5 / server.hackanalyze)) || 1;

        // n threads needed to grow in hacktime
        server.growth = ns.getServerGrowth(hostname);
        server.growthanalyze = ns.growthAnalyze(hostname, 2);
        ns.print('growthanalyze ', server.growthanalyze);
        var grow_threads_needed = Math.floor(server.growthanalyze) || 1;
        server.threads_needed = Math.max(hack_threads_needed, grow_threads_needed);

        ns.print(hostname, ' threads needed ', server.threads_needed, ' growth ', grow_threads_needed, ' hack_t ', hack_threads_needed);
        //tprint(hostname, ' threads needed ', server.threads_needed, ' growth ', grow_threads_needed, ' hack_t ', hack_threads_needed);



        // only fast hacks
        // on servers that have money
        // on servers that can grow money
        // if (server.hacktime < 3*60 && server.money != 0 && server.growth >= 20) {
        if (server.money != 0 && server.growth > 0) {
            hackable_with_extras.push(server);
        }

        /*

        server.mph = ((server.money * (server.growth/100))/server.hacktime);

        */
    }
}

function get_next_process_id() {
    next_process_id++;
    return next_process_id;
}



function get_all_targets() {
    return hackable_with_extras.sort(function(a, b){
        // -1 to sort a before b
        if (a.threads_needed != b.threads_needed) return a.threads_needed - b.threads_needed;
        if (a.growth != b.growth) return b.growth - a.growth;
        if (a.money != b.money) return b.money - a.money;
        return 0;
    });
}


function get_hosts(ns, allhostnames, script, drain) {
    // when draining, dont kill scripts, use remaining ram
    var result = new Array();
    for (var i=0; i<allhostnames.length; ++i) {
        var hostname = allhostnames[i];
        var maxram = ns.getServerMaxRam(hostname);
        var usedram = ns.getServerUsedRam(hostname);
        var ram;
        if (drain) {
            ram = maxram - usedram;
        } else {
            ram = maxram;
        }
        // var usedram = getServerUsedRam(hostname);
        // var freeram = maxram - usedram;
        var scriptram = ns.getScriptRam(script);

        var obj = {
            'maxram': maxram,
            'ram': ram,
            //'usedram': usedram,
            //'freeram': freeram,
            'thread_found': Math.floor(ram / scriptram),
            'hostname': hostname,
        };
        ns.print(hostname, ' thread_found ', obj.thread_found);
        //tprint(hostname, ' thread_found ', obj.thread_found);

        result.push(obj);
    }

    result.sort(function(a, b) {
        return a.thread_found - b.thread_found;
    });
    return result;
}

function find_host_with_threads(ns, hosts) {
    // assumes sorted least to most threads
    
    while (hosts.length) {
        var host = hosts[hosts.length - 1];
        if (host.thread_found > 0) {
            return host;
        }
        hosts.pop();
    }
    return null;
}

function kill_scripts_once(ns, host) {

    var hostname = host.hostname;
    for(let script of [HACKSCRIPT, GROWSCRIPT]) {
        if (ns.scriptRunning(script, hostname))
            ns.scriptKill(script, hostname);
    }
}

function target_host(ns, target, allhosts, scriptname, drain) {
    // when draining, use all available host threads
    while (target.threads_needed > 0 || drain) {
        var host = find_host_with_threads(ns, allhosts);
        if (host === null) break;
        var threads;
        if (drain) {
            threads = host.thread_found;
        } else {
            threads = Math.min(target.threads_needed, host.thread_found);
        }

        target.threads_needed -= threads;
        host.thread_found -= threads;

        //ns.tprint('hacking ', target.hostname, ' via ', host.hostname, ' with threads ', threads);
        ns.exec(scriptname, host.hostname, threads, target.hostname, threads, get_next_process_id());
    }
}

function exec_code(ns) {

    var allhostnames = new Array();
    for(var i=0; i < hackables.length; ++i) {
        var hostname = hackables[i].hostname;
        allhostnames.push(hostname);
    }

    for(var i=0; i < PURCHASED.length; ++i) {
        var hostname = PURCHASED[i];
        allhostnames.push(hostname);
    }



    let allhosts = get_hosts(ns, allhostnames, HACKSCRIPT, false);


    for(let host of allhosts) {
        kill_scripts_once(ns, host);
    }

    var alltargets = get_all_targets();
    for (var i=0; i < alltargets.length; ++i) {
        var target = alltargets[i];
        ns.print('looking at target ', target.hostname, ' ', i, ' / ', alltargets.length);
        target_host(ns, target, allhosts, HACKSCRIPT, false);
    }


    // drain remaining unused hosts, if any
    // point to hardest server and just grow and weaken
    let allhostsgrow = get_hosts(ns, allhostnames, GROWSCRIPT, true);
    let ignore = ['foodnstuff', 'sigma-cosmetics'];
    for(let i=alltargets.length - 1; i >= 0; --i) {
        var target = alltargets[i];
        ns.tprint('drain??? ', target.hostname, ' hacktime ', target.hacktime)
        if (target.hacktime <= 60 && !ignore.includes(target.hostname)) {
            ns.tprint('drain target ', target.hostname);
            target_host(ns, target, allhostsgrow, GROWSCRIPT, true);
            break;
        }
    }
}


function hack_server(ns, port_max, server) {
    /*
   * * BruteSSH.exe: 50
   * * FTPCrack.exe: 100
   * * relaySMTP.exe: 250
   * * HTTPWorm.exe: 500
   * * SQLInject.exe: 750
   * * DeepscanV1.exe: 75
   * * DeepscanV2.exe: 400
   * * ServerProfiler.exe: 75
   * * AutoLink.exe: 25
   */
    var hostname = server.hostname;

    /*
    tprint(hostname);
    tprint(server.server_obj.sshPortOpen);
    tprint(server.server_obj.ftpPortOpen);
    tprint(server.server_obj.smtpPortOpen);
    tprint(server.server_obj.httpPortOpen);
    tprint(server.server_obj.sqlPortOpen);
    */

    if (port_max > 0 && !server.server_obj.sshPortOpen) ns.brutessh(hostname);
    if (port_max > 1 && !server.server_obj.ftpPortOpen) ns.ftpcrack(hostname);
    if (port_max > 2 && !server.server_obj.smtpPortOpen) ns.relaysmtp(hostname);
    if (port_max > 3 && !server.server_obj.httpPortOpen) ns.httpworm(hostname);
    if (port_max > 4 && !server.server_obj.sqlPortOpen) ns.sqlinject(hostname);
    if (!server.server_obj.hasAdminRights) {
        ns.tprint('nuking ', hostname);
        ns.nuke(hostname);
        server.server_obj.hasAdminRights = true;
    }

    check_backdoor(ns, server);
}

async function copy_code(ns) {
    var files = [HACKSCRIPT, HACKWEAKEN, GROWSCRIPT];
    for(var i=0; i < hackables.length; ++i) {
        var hostname = hackables[i].hostname;
        await ns.scp(files, 'home', hostname);
    }

    for(var i=0; i < PURCHASED.length; ++i) {
        var hostname = PURCHASED[i];
        await ns.scp(files, 'home', hostname);
    }
}


function get_port_max(ns) {
    var result = 0;

    var exes = ['brutessh.exe', 'ftpcrack.exe', 'relaysmtp.exe', 'httpworm.exe', 'sqlinject.exe'];
    for (var i=0; i < exes.length; ++i) {
        if (ns.fileExists(exes[i])) result++;
    }

    ns.tprint('port max is ', result);

    return result;
}

function check_backdoor(ns, server) {
    //ns.tprint('checking for backdoors in ', server.hostname)
    var server_obj = server.server_obj;
    if (!server_obj.purchasedByPlayer && server_obj.hasAdminRights && !server_obj.backdoorInstalled) {
        var connectstr = ns.sprintf('server %s has NO backdoor installed! ', server.hostname);
        connectstr += '; home; ';
        // idea: we can connect directly from the last backdoor to the next server
        let start = Math.max(1, backdoor_path.length-1);
        for(var i=start; i<backdoor_path.length; ++i) {
            connectstr += 'connect ' + backdoor_path[i] + '; '
        }
        connectstr += 'connect ' + server.hostname + '; backdoor; '
        ns.tprint(connectstr);
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    next_process_id = 0;
    visited = new Array();
    hackables = new Array();
    hackable_with_extras = new Array();
    backdoor_path = new Array();

    HACKLEVEL = ns.getHackingLevel();

    let port_max = get_port_max(ns);
    PURCHASED = ns.getPurchasedServers();

    find_hackable(ns, 'home', port_max);
    annotate_hackables(ns);
    await copy_code(ns);
    exec_code(ns);
    //await ns.sleep(2000);
    ns.tprint('done');
}