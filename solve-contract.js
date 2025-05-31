/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ['server'],
    ['filename'],
  ])

  args.filename += '.cct'
  let contract = ns.codingcontract.getContract(args.filename, args.server)
  ns.tprint(contract)
  if (contract.type == ns.enums.CodingContractName.AlgorithmicStockTraderI) {
    let data = contract.data
    data.sort(function(a, b){return a - b})
    let answer = Math.abs(data[0] - data[data.length-1])
    let attempt_result = ns.codingcontract.attempt(answer, args.filename, args.server)
    ns.tprint(attempt_result)
  } else {
    ns.tprint('unknown contract type')
  }
}