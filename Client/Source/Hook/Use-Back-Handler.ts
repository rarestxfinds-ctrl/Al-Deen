import { useEffect } from "react";

type Handler = () => void;
const stack: { id: number; handler: Handler }[] = [];
let nextId = 1;

export function pushBackHandler(handler: Handler): number {
  const id = nextId++;
  stack.push({ id, handler });
  return id;
}

export function removeBackHandler(id: number) {
  const idx = stack.findIndex((h) => h.id === id);
  if (idx >= 0) stack.splice(idx, 1);
}

/** Returns true if a handler was invoked. */
export function tryHandleBack(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.handler();
  return true;
}

/** React hook: registers a back handler while `active` is true. */
export function useBackHandler(active: boolean, handler: Handler) {
  useEffect(() => {
    if (!active) return;
    const id = pushBackHandler(handler);
    return () => removeBackHandler(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
