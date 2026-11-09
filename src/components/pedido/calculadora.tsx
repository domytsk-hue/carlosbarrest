"use client";

import clsx from "clsx";
import { Delete } from "lucide-react";
import { useState } from "react";
import { arred, brl } from "@/lib/dominio/calculos";

type Op = "+" | "−" | "×" | "÷";

function aplicar(a: number, b: number, op: Op) {
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? 0 : a / b;
  }
}

/** Calculadora simples da tela de recebimento. Não mexe na conta: só devolve o resultado se o operador quiser usar. */
export function Calculadora({ aoUsar }: { aoUsar?: (v: number) => void }) {
  const [visor, setVisor] = useState("0");
  const [acumulado, setAcumulado] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [novo, setNovo] = useState(true);

  const atual = () => Number(visor.replace(",", ".")) || 0;
  const mostrar = (v: number) => setVisor(String(arred(v)).replace(".", ","));

  function digito(d: string) {
    if (novo) {
      setVisor(d === "," ? "0," : d);
      setNovo(false);
      return;
    }
    if (d === "," && visor.includes(",")) return;
    setVisor((v) => (v === "0" && d !== "," ? d : v + d));
  }

  function operar(o: Op) {
    const v = atual();
    const r = acumulado !== null && op && !novo ? aplicar(acumulado, v, op) : acumulado ?? v;
    setAcumulado(acumulado === null ? v : r);
    if (acumulado !== null && op && !novo) mostrar(r);
    setOp(o);
    setNovo(true);
  }

  function igual() {
    if (acumulado === null || !op) return;
    const r = aplicar(acumulado, atual(), op);
    mostrar(r);
    setAcumulado(null);
    setOp(null);
    setNovo(true);
  }

  function limpar() {
    setVisor("0");
    setAcumulado(null);
    setOp(null);
    setNovo(true);
  }

  const tecla = "h-11 rounded-xl text-[16px] font-bold active:scale-[.97]";
  return (
    <div className="rounded-2xl border border-linha bg-card p-3">
      <div className="mb-2 rounded-xl bg-fundo px-3 py-2 text-right">
        <p className="h-4 text-[11px] text-mudo">{acumulado !== null && op ? `${String(arred(acumulado)).replace(".", ",")} ${op}` : ""}</p>
        <p className="num truncate text-[24px] font-extrabold">{visor}</p>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <button onClick={limpar} className={clsx(tecla, "bg-rosado text-acao")}>C</button>
        <button onClick={() => setVisor((v) => (novo || v.length <= 1 ? "0" : v.slice(0, -1)))} className={clsx(tecla, "flex items-center justify-center bg-secundario")} aria-label="Apagar">
          <Delete size={18} />
        </button>
        <button onClick={() => operar("÷")} className={clsx(tecla, "bg-secundario", op === "÷" && "ring-2 ring-acao")}>÷</button>
        <button onClick={() => operar("×")} className={clsx(tecla, "bg-secundario", op === "×" && "ring-2 ring-acao")}>×</button>
        {["7", "8", "9"].map((d) => (
          <button key={d} onClick={() => digito(d)} className={clsx(tecla, "bg-fundo")}>{d}</button>
        ))}
        <button onClick={() => operar("−")} className={clsx(tecla, "bg-secundario", op === "−" && "ring-2 ring-acao")}>−</button>
        {["4", "5", "6"].map((d) => (
          <button key={d} onClick={() => digito(d)} className={clsx(tecla, "bg-fundo")}>{d}</button>
        ))}
        <button onClick={() => operar("+")} className={clsx(tecla, "bg-secundario", op === "+" && "ring-2 ring-acao")}>+</button>
        {["1", "2", "3"].map((d) => (
          <button key={d} onClick={() => digito(d)} className={clsx(tecla, "bg-fundo")}>{d}</button>
        ))}
        <button onClick={igual} className={clsx(tecla, "row-span-2 bg-acao text-white")}>=</button>
        <button onClick={() => digito("0")} className={clsx(tecla, "col-span-2 bg-fundo")}>0</button>
        <button onClick={() => digito(",")} className={clsx(tecla, "bg-fundo")}>,</button>
      </div>
      {aoUsar && (
        <button onClick={() => aoUsar(arred(atual()))} className="mt-2 w-full rounded-xl bg-secundario py-2 text-[12.5px] font-bold">
          Usar <span className="num">{brl(arred(atual()))}</span> no valor recebido
        </button>
      )}
    </div>
  );
}
