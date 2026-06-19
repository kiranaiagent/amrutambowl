import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartLine = { id: string; name: string; price_inr: number; image_url: string | null; qty: number };
type CartCtx = {
  lines: CartLine[];
  add: (l: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  total: number;
  count: number;
};
const Ctx = createContext<CartCtx | undefined>(undefined);
const KEY = "ruchi.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { const s = localStorage.getItem(KEY); if (s) setLines(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines]);

  const add: CartCtx["add"] = (l, qty = 1) =>
    setLines((cur) => {
      const ex = cur.find((x) => x.id === l.id);
      if (ex) return cur.map((x) => (x.id === l.id ? { ...x, qty: x.qty + qty } : x));
      return [...cur, { ...l, qty }];
    });
  const setQty = (id: string, qty: number) =>
    setLines((cur) => (qty <= 0 ? cur.filter((x) => x.id !== id) : cur.map((x) => (x.id === id ? { ...x, qty } : x))));
  const remove = (id: string) => setLines((cur) => cur.filter((x) => x.id !== id));
  const clear = () => setLines([]);
  const total = lines.reduce((s, x) => s + Number(x.price_inr) * x.qty, 0);
  const count = lines.reduce((s, x) => s + x.qty, 0);

  return <Ctx.Provider value={{ lines, add, setQty, remove, clear, total, count }}>{children}</Ctx.Provider>;
}
export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be inside CartProvider");
  return v;
}
