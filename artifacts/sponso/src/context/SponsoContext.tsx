import { createContext, useContext, useState, type ReactNode } from "react";

export type ValueProp = {
  session_title: string;
  value_prop: string;
  sponsor_tags: string[];
};

type SponsoState = {
  eventName: string;
  agenda: string;
  valueProps: ValueProp[];
  setEventName: (name: string) => void;
  setAgenda: (agenda: string) => void;
  setValueProps: (props: ValueProp[]) => void;
};

const SponsoContext = createContext<SponsoState | null>(null);

export function SponsoProvider({ children }: { children: ReactNode }) {
  const [eventName, setEventName] = useState("");
  const [agenda, setAgenda] = useState("");
  const [valueProps, setValueProps] = useState<ValueProp[]>([]);

  return (
    <SponsoContext.Provider value={{ eventName, agenda, valueProps, setEventName, setAgenda, setValueProps }}>
      {children}
    </SponsoContext.Provider>
  );
}

export function useSponso() {
  const ctx = useContext(SponsoContext);
  if (!ctx) throw new Error("useSponso must be used within SponsoProvider");
  return ctx;
}
