import { Program, Exp, CExp, AtomicExp, DefineExp, NumExp, BoolExp, StrExp, PrimOp, VarRef, VarDecl, AppExp, IfExp, ProcExp, Binding, LetExp, LitExp, parseL3 } from "../imp/L3-ast";
import { isProgram,isExp, isCExp, isDefineExp, isNumExp, isBoolExp, isStrExp, isPrimOp, isVarRef, isVarDecl, isAppExp, isIfExp, isProcExp, isBinding, isLetExp, isLitExp } from "../imp/L3-ast";
import { makeProgram, makeDefineExp, makeNumExp, makeBoolExp, makeStrExp, makePrimOp, makeVarRef, makeVarDecl, makeAppExp, makeIfExp, makeProcExp, makeBinding, makeLetExp, makeLitExp } from "../imp/L3-ast";
import { Closure, SExpValue, isClosure, isSymbolSExp} from '../imp/L3-value'
import { first, rest} from '../shared/list'
import { Result, makeFailure, makeOk,bind } from '../shared/result';
import { isString } from "../shared/type-predicates";
import { map, reduce, isEmpty } from 'ramda';

/*
Purpose: Transform L3 AST to JavaScript program string
Signature: l30ToJS(l2AST)
Type: [EXP | Program] => Result<string>
*/

const parseExpToJS = (e : Exp) : string =>
    isDefineExp(e)      ?  `const ${e.var.var} = ${parseCExpToJS(e.val)}` :
    isCExp(e)           ? parseCExpToJS(e):
    e;

const parseCExpToJS = (e : CExp) : string =>                     
    isNumExp(e)         ? toString(e) :
    isBoolExp(e)        ? toString(e) :
    isStrExp(e)         ? toString(e) :
    isPrimOp(e)         ? toString(e) :
    isVarRef(e)         ? toString(e) :
    isAppExp(e)         ? parseAppExp(e) :
    isIfExp(e)          ? `(${parseCExpToJS(e.test)} ? ${parseCExpToJS(e.then)} : ${parseCExpToJS(e.alt)})` :
    isProcExp(e)        ? `((${mergeStrings(map((v:VarDecl):string=>v.var, e.args), ",")}) => ${parseLambdaBody(e.body)})` :
    isLetExp(e)         ? parseCExpToJS(rewriteLetExp(e)) :
    isLitExp(e)         ? parseLitExp(e.val) :
    e;

const toString = (val : AtomicExp) : string => 
    isNumExp(val)       ? val.val.toString() :
    isBoolExp(val)      ? String(val.val) :
    isStrExp(val)       ? `"${val.val}"` :
    isPrimOp(val)       ? `${parsePrimOp(val)}` :
    isVarRef(val)       ? val.var :
    "";

const parseAppExp = (e : AppExp) : string =>
    isPrimOp(e.rator) ? parseAppPrimOp(e.rator, e.rands) : 
    `${parseCExpToJS(e.rator)}(${mergeStrings(map(parseCExpToJS, e.rands), ",")})`

const parsePrimOp = (e : PrimOp) : string =>
    e.op === "="            ? "===" :
    e.op === "and"          ? "&&" :
    e.op === "or"           ? "||" :
    e.op === "not"          ? '!' :
    e.op === "string=?"     ? "===" :
    e.op === "number?"      ? "((x) => (typeof (x) === number))" :
    e.op === "boolean?"     ? "((x) => (typeof (x) === boolean))" :
    e.op === "symbol?"      ? "((x) => (typeof (x) === symbol))" :
    e.op === "string?"      ? "((x) => (typeof (x) === string))" :
    e.op;

const isRegRator    = (x: string): boolean => ["+", "-", "*", "/", ">", "<", "=", "and", "or", "eq?", "string=?"].includes(x);

const parseAppPrimOp = (rator : PrimOp, rands : CExp[]) : string =>
    isRegRator(rator.op)        ? `(${mergeStrings(map(parseCExpToJS, rands), " " + parsePrimOp(rator) + " ")})` :
    rator.op === "not"          ? `(${map((x : CExp) : string => '!' + parseCExpToJS(x), rands)})` :
    rator.op === "number?"      ? `${parsePrimOp(rator)}(${first(rands)})` :
    rator.op === "boolean?"     ? `${parsePrimOp(rator)}(${first(rands)})` :
    rator.op === "symbol?"      ? `${parsePrimOp(rator)}(${first(rands)})` :
    rator.op === "string?"      ? `${parsePrimOp(rator)}(${first(rands)})` :
    "";

const mergeStrings = (arr : string[], val : string, addLast : boolean=false) : string =>  reduce((acc : string, elem : string) : string => acc + `${val}` + elem, first(arr), rest(arr)) + (addLast ? val : "")
const rewriteLetExp = (e : LetExp) : CExp => makeAppExp(makeProcExp(map((b:Binding):VarDecl=>b.var, e.bindings), e.body), map((b:Binding):CExp=> b.val, e.bindings));
const parseLambdaBody = (e : CExp[]) : string => isEmpty(rest(e)) ? parseCExpToJS(first(e)) : `{${parseLambdaRecursivly(e)}}`;
const parseLambdaRecursivly = (e : CExp[]) : string => isEmpty(rest(e)) ? `return ${parseCExpToJS(first(e))};` : `${parseCExpToJS(first(e))}; ${parseLambdaRecursivly(rest(e))}`;
const parseLitExp = (e : SExpValue) : string =>
    isSymbolSExp(e) ? `Symbol.for("${e.val}")` :
    isString(e)     ? `"${e}"` :
    "";

export const l30ToJS = (exp: Exp | Program): Result<string>  => 
    isProgram(exp)  ? makeOk(mergeStrings(map(parseExpToJS, exp.exps), ";\n")) :
    isExp(exp)      ? makeOk(parseExpToJS(exp)) :
    makeFailure("Not Expression");

    console.log((bind(parseL3("(L3 (symbol? 2))"), l30ToJS)));