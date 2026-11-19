// Utilidades compartidas de la planilla.

/** Genera el ID único: ESTADO-MUNICIPIO-ALEATORIO-MEP */
export function generarCodigo(estadoCodigo: string, municipioCodigo: string): string {
  const random = String(Math.floor(100000 + Math.random() * 900000));
  return `${estadoCodigo}-${municipioCodigo}-${random}-MEP`;
}

/** Extrae los campos de la planilla (sin email/password ni códigos auxiliares). */
export function planillaFields(data: Record<string, any>): Record<string, any> {
  return {
    nombres: data.nombres,
    apellidos: data.apellidos,
    cedula: data.cedula,
    sexo: data.sexo,
    lugar_nacimiento: data.lugar_nacimiento,
    fecha_nacimiento: data.fecha_nacimiento,
    estado_civil: data.estado_civil,
    profesion: data.profesion,
    oficio: data.oficio,
    telefono: data.telefono,
    direccion: data.direccion,
    parroquia: data.parroquia,
    sector: data.sector,
    punto_referencia: data.punto_referencia,
    facebook: data.facebook,
    instagram: data.instagram,
    trabajo: data.trabajo,
    nombre_empresa: data.nombre_empresa,
    nivel_instruccion: data.nivel_instruccion,
    area: data.area,
    especializacion: data.especializacion,
    sector_activa: data.sector_activa,
    centro_votacion: data.centro_votacion,
    codigo_centro: data.codigo_centro,
    mesa: data.mesa,
    aporte_voluntario: data.aporte_voluntario,
    estado: data.estado,
    municipio: data.municipio,
    acepto_declaracion: data.acepto_declaracion
  };
}
