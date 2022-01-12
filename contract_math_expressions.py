# math expressions of a string contract
s = "11512614";
goal = 61

opers = '+-*'  # and concat
def f(expr, digits):
    if not digits:
        return [expr]
    res = []
    if expr:
        for op in opers:
            newexpr = expr + op + digits[0]
            newdigits = digits[1:]
            res.extend(f(newexpr, newdigits))
    newexpr = expr + digits[0]
    newdigits = digits[1:]
    res.extend(f(newexpr, newdigits))
    return res


results = f('', s)
output = '['
for i, res in enumerate(results):
    if eval(res) == goal:
        if len(output) > 1: output += ', '
        output += res

output += ']'
print(output)

