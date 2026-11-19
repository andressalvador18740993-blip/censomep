export type Role = "admin" | "nacional" | "regional" | "municipal" | "militante";

export type EstadoRegistro =
  | "borrador"
  | "pendiente"
  | "aprobado"
  | "rechazado"
  | "bloqueado";

export interface Estado {
  id: string;
  codigo: string;
  nombre: string;
}

export interface Municipio {
  id: string;
  codigo: string;
  nombre: string;
  estado: string; // id de la colección estados
}

export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  role: Role;
  estado?: string;
  municipio?: string;
  activo: boolean;
  verified: boolean;
}

export interface Militante {
  id: string;
  email: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  fecha_nacimiento: string;
  sexo: string;
  telefono: string;
  direccion: string;
  parroquia: string;
  estado: string;
  municipio: string;
  foto: string;
  codigo: string;
  estado_registro: EstadoRegistro;
  aprobado_por?: string;
  fecha_aprobacion?: string;
  motivo_rechazo?: string;
  carnet_pdf?: string;
  carnet_generado: boolean;
  carnet_enviado: boolean;
  carnet_impreso: boolean;
  fecha_envio?: string;
  version_censo: number;
  ultimo_recenso?: string;
  recenso_pendiente: boolean;
  created: string;
  updated: string;
}

export interface Conexion {
  id: string;
  tipo_usuario: "staff" | "militante";
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  municipio: string;
  ip: string;
  pais: string;
  user_agent: string;
  dispositivo: string;
  evento: "login" | "logout" | "sesion_activa";
  created: string;
}
