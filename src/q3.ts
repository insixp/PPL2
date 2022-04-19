import { Exp, CExp, Program, isProgram, isDefineExp, isNumExp, isBoolExp, isStrExp, isPrimOp, isVarRef, makeDefineExp, makeProgram, isCExp, makeAppExp, makeIfExp, makeProcExp, makeBinding, makeLetExp, Binding, LetExp, LetPlusExp, makeLetPlusExp, parseL31Exp } from "./L31-ast";
import { isExp, isVarDecl, isAppExp, isIfExp, isProcExp, isBinding, isLetExp, isLetPlusExp, isLitExp } from "./L31-ast";
import { Result, makeFailure, mapResult, makeOk, bind } from "../shared/result";
import { compose, map } from "ramda";
import { isEmpty, first, rest } from "../shared/list";
import { parse } from "../shared/parser";
import { unparseL31 } from "../src/L31-ast";


/*
Purpose: Transform L31 AST to L3 AST
Signature: l31ToL3(l31AST)
Type: [Exp | Program] => Result<Exp | Program>
*/


const rewriteLetPlusExp = (e : Exp) : Exp =>
    isDefineExp(e)      ? makeDefineExp(e.var, rewriteLetPlusCExp(e.val)) :
    isCExp(e)           ? rewriteLetPlusCExp(e):
    e;

const rewriteLetPlusCExp = (e : CExp) : CExp =>                     
    isNumExp(e)         ? e :
    isBoolExp(e)        ? e :
    isStrExp(e)         ? e :
    isPrimOp(e)         ? e :
    isVarRef(e)         ? e :
    isAppExp(e)         ? makeAppExp(rewriteLetPlusCExp(e.rator), map(rewriteLetPlusCExp, e.rands)) :
    isIfExp(e)          ? makeIfExp(rewriteLetPlusCExp(e.test), rewriteLetPlusCExp(e.then), rewriteLetPlusCExp(e.alt)) :
    isProcExp(e)        ? makeProcExp(e.args, map(rewriteLetPlusCExp, e.body)) :
    isLetExp(e)         ? makeLetExp(map(rewriteLetPlusBinding, e.bindings), map(rewriteLetPlusCExp, e.body)) :
    isLetPlusExp(e)     ? rewriteLetPlusRec(e) :
    isLitExp(e)         ? e :
    e;

const rewriteLetPlusBinding = (e : Binding) : Binding   => makeBinding(e.var.var, rewriteLetPlusCExp(e.val))
const rewriteLetPlusRec     = (e : LetPlusExp) : LetExp => isEmpty(rest(e.bindings)) ?
    makeLetExp([rewriteLetPlusBinding(first(e.bindings))], e.body) :
    makeLetExp([rewriteLetPlusBinding(first(e.bindings))], [rewriteLetPlusRec(makeLetPlusExp(rest(e.bindings), e.body))])

export const L31ToL3 = (exp: Exp | Program): Result<Exp | Program> =>
    isProgram(exp)  ? makeOk(makeProgram(map(rewriteLetPlusExp, exp.exps))) :
    isExp(exp)      ? makeOk(rewriteLetPlusExp(exp)) :
    makeOk(exp);


const f = (x : Program | Exp) : Result<string> => makeOk(unparseL31(x));
console.log(bind(bind(bind(parse("(let* ((x 5) (y 7)) (+ x y))"), parseL31Exp), L31ToL3), f))