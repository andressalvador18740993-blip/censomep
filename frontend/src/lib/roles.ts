import type { Role } from "./types";

export const ROLES: Role[] = ["admin", "nacional", "regional", "municipal", "militante"];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  nacional: "Nacional",
  regional: "Regional",
  municipal: "Municipal",
  militante: "Militante"
};

/** Roles del staff (excluye militante). */
export const STAFF_ROLES: Role[] = ["admin", "nacional", "regional", "municipal"];

/** Colores institucionales para gráficos/canvas. */
export const COLORS = {
  purple: "#63008F",
  purpleDark: "#4A006B",
  purpleLight: "#8A2FB8",
  yellow: "#FFF200",
  yellowDark: "#E6D800"
};
