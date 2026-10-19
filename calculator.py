"""Bounded arithmetic without eval or executable model output."""
import ast
import math
import operator
OPS={ast.Add:operator.add,ast.Sub:operator.sub,ast.Mult:operator.mul,ast.Div:operator.truediv,ast.Pow:operator.pow,ast.Mod:operator.mod}
FUNCS={k:getattr(math,k) for k in ('sqrt','sin','cos','tan','log','log10','exp','floor','ceil')}
FUNCS.update(abs=abs)
def calculate(expression):
    if len(expression)>400: raise ValueError('Udtrykket er for langt.')
    tree=ast.parse(expression.replace('^','**'),mode='eval')
    if len(list(ast.walk(tree)))>100: raise ValueError('For mange operationer.')
    def visit(node):
        if isinstance(node,ast.Expression): return visit(node.body)
        if isinstance(node,ast.Constant) and type(node.value) in (int,float): result=node.value
        elif isinstance(node,ast.Name) and node.id in ('pi','e'): result=getattr(math,node.id)
        elif isinstance(node,ast.UnaryOp) and isinstance(node.op,(ast.UAdd,ast.USub)):
            result=visit(node.operand)*(-1 if isinstance(node.op,ast.USub) else 1)
        elif isinstance(node,ast.BinOp) and type(node.op) in OPS:
            left,right=visit(node.left),visit(node.right)
            if isinstance(node.op,ast.Pow) and abs(right)>100: raise ValueError('Eksponenten er for stor.')
            result=OPS[type(node.op)](left,right)
        elif isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id in FUNCS and len(node.args)==1 and not node.keywords:
            result=FUNCS[node.func.id](visit(node.args[0]))
        else: raise ValueError('Brug kun tal, +, -, *, /, ^ og de viste funktioner.')
        if isinstance(result,complex) or not math.isfinite(result) or abs(result)>1e100: raise ValueError('Resultatet er uden for området.')
        return result
    return visit(tree)

def conv_size(n,k,s,p): return (n+2*p-k)//s+1

def softmax(values):
    m=max(values)
    ex=[math.exp(v-m) for v in values]
    total=sum(ex)
    return [v/total for v in ex]
