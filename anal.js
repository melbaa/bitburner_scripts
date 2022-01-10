// analyze servers and hack them


var HACKSCRIPT = 'hacktemplate.script';
var HACKWEAKEN = 'hackweaken.script';
var GROWSCRIPT = 'grow.script'

var SCRIPTRAM;

var HACKLEVEL;


var visited = new Array();

var hackables = new Array();

var PURCHASED;

var hackable_with_extras = new Array();

var next_process_id = 0;

var next_target = -1;

var backdoor_path = new Array();

function find_hackable(ns, hostname, port_max) {
    visited.push(hostname);
    var hostnames_scan = ns.scan(hostname);
    backdoor_path.push(hostname);
    for(var i=0; i < hostnames_scan.length; ++i) {
        var hostname_scan = hostnames_scan[i];
        if (visited.includes(hostname_scan)) continue;
        visited.push(hostname_scan);


        var serverhacklev = ns.getServerRequiredHackingLevel(hostname_scan);
        if (HACKLEVEL < serverhacklev) continue;

        var ports = ns.getServerNumPortsRequired(hostname_scan);
        if (ports > port_max) continue;

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
        var hack_threads_needed = Math.floor((0.5 / server.hackanalyze) * (server.hacktime_real / 20) ) || 1;

        // n threads needed to grow in hacktime
        // our goal is to grow in 60 sec
        server.growth = ns.getServerGrowth(hostname);
        server.growthanalyze = ns.growthAnalyze(hostname, 2);
        ns.print('growthanalyze ', server.growthanalyze);
        var grow_threads_needed = Math.floor(server.growthanalyze * (server.hacktime / 30)) || 1;
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

function get_next_target() {
    next_target++;
    next_target = next_target % hackable_with_extras.length;
    return hackable_with_extras[next_target];
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


function get_hosts(ns, allhostnames) {
    var result = new Array();
    for (var i=0; i<allhostnames.length; ++i) {
        var hostname = allhostnames[i];
        var maxram = ns.getServerMaxRam(hostname);
        // var usedram = getServerUsedRam(hostname);
        // var freeram = maxram - usedram;

        var obj = {
            'maxram': maxram,
            //'usedram': usedram,
            //'freeram': freeram,
            //'thread_found': Math.floor(freeram / SCRIPTRAM),
            'thread_found': Math.floor(maxram / SCRIPTRAM),
            'hostname': hostname,
            'scripts_killed': 0,
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
            kill_scripts_once(ns, host);
            return host;
        }
        hosts.pop();
    }
    return null;
}

function kill_scripts_once(ns, host) {
    if (host.scripts_killed) return;

    var hostname = host.hostname;
    if (ns.scriptRunning(HACKSCRIPT, hostname))
        ns.scriptKill(HACKSCRIPT, hostname);
    host.scripts_killed = 1;
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


    let allhosts = get_hosts(ns, allhostnames);

    var alltargets = get_all_targets();
    for (var i=0; i < alltargets.length; ++i) {
        var target = alltargets[i];
        ns.print('looking at target ', target.hostname, ' ', i, ' / ', alltargets.length);

        while (target.threads_needed > 0) {
            var host = find_host_with_threads(ns, allhosts);
            if (host === null) break;
            var threads = Math.min(target.threads_needed, host.thread_found);

            target.threads_needed -= threads;
            host.thread_found -= threads;

            // tprint('hacking ', target.hostname, ' via ', host.hostname, ' with threads ', threads);
            ns.exec(HACKSCRIPT, host.hostname, threads, target.hostname, threads, get_next_process_id());
        }
    }


    // drain remaining unused hosts, if any
    var host = find_host_with_threads(ns, allhosts);
    while (host !== null) {
        host.thread_found = 0;
        host = find_host_with_threads(ns, allhosts);
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
    
    ns.nuke(hostname);

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
    var server_obj = server.server_obj;
    if (!server_obj.purchasedByPlayer && server_obj.hasAdminRights && !server_obj.backdoorInstalled) {
        ns.tprint('server ', server.hostname, ' has NO backdoor installed!');
        var connectstr = ' ; home; ';
        for(var i=1; i<backdoor_path.length; ++i) {
            connectstr += 'connect ' + backdoor_path[i] + '; '
        }
        connectstr += 'connect ' + server.hostname + '; backdoor; '
        ns.tprint(connectstr);
    }
}

/** @param {NS} ns **/
export async function main(ns) {

    SCRIPTRAM = ns.getScriptRam(HACKSCRIPT);
    HACKLEVEL = ns.getHackingLevel();

    let port_max = get_port_max(ns);
    PURCHASED = ns.getPurchasedServers();

    find_hackable(ns, 'home', port_max);
    annotate_hackables(ns);
    await copy_code(ns);
    exec_code(ns);
    ns.tprint('done');
}