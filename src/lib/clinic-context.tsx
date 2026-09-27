import { createContext, useContext } from "react";

export interface ActiveClinic {
  clinicId: string;
  clinicName: string;
  role: "doctor" | "desk";
}

export const ClinicContext = createContext<ActiveClinic | null>(null);

export function useClinic(): ActiveClinic {
  const c = useContext(ClinicContext);
  if (!c) throw new Error("useClinic must be used inside the clinic layout");
  return c;
}
