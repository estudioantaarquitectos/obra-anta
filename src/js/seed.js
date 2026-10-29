/* ==========================================================================
   ANTA OBRA - Initial Seed Data
   ========================================================================== */

export const INITIAL_GROUPS = [
  {
    id: 'admin',
    name: 'Administradores',
    description: 'Acceso total y configuración del sistema, usuarios y permisos',
    permissions: [
      'actas:view', 'actas:create', 'actas:edit', 'actas:delete', 'actas:export',
      'informes:view', 'informes:create', 'informes:edit', 'informes:delete', 'informes:export',
      'notas:view', 'notas:create', 'notas:edit', 'notas:delete',
      'agentes:view', 'agentes:manage',
      'users:manage', 'groups:manage', 'backup:manage', 'settings:manage'
    ]
  },
  {
    id: 'direccion_obra',
    name: 'Dirección Facultativa (DO)',
    description: 'Arquitectos directores de obra. Creación, edición y firma de actas e informes',
    permissions: [
      'actas:view', 'actas:create', 'actas:edit', 'actas:delete', 'actas:export',
      'informes:view', 'informes:create', 'informes:edit', 'informes:delete', 'informes:export',
      'notas:view', 'notas:create', 'notas:edit', 'notas:delete',
      'agentes:view', 'agentes:manage',
      'settings:manage'
    ]
  },
  {
    id: 'direccion_ejecucion',
    name: 'Dirección de Execución Material (DEM)',
    description: 'Aparejadores / Arquitectos técnicos. Control de calidad, mediciones y actas',
    permissions: [
      'actas:view', 'actas:create', 'actas:edit', 'actas:export',
      'informes:view', 'informes:create', 'informes:edit', 'informes:export',
      'notas:view', 'notas:create', 'notas:edit'
    ]
  },
  {
    id: 'seguridad_salud',
    name: 'Coordinación Seguridade e Saúde (CSS)',
    description: 'Control y supervisión de seguridad, salud laboral y medidas preventivas',
    permissions: [
      'actas:view', 'actas:edit', 'actas:export',
      'informes:view', 'informes:edit', 'informes:export',
      'notas:view', 'notas:create'
    ]
  },
  {
    id: 'constructora',
    name: 'Empresa Constructora (JO)',
    description: 'Jefatura de obra y contrata. Consulta y aportación de partes',
    permissions: [
      'actas:view', 'actas:export',
      'informes:view', 'informes:export',
      'notas:view', 'notas:create'
    ]
  },
  {
    id: 'solo_lectura',
    name: 'Propiedad / Consulta (Só Lectura)',
    description: 'Promotores, inspección municipal y visualizadores sin permiso de modificación',
    permissions: [
      'actas:view', 'actas:export',
      'informes:view', 'informes:export',
      'notas:view'
    ]
  }
];

export const INITIAL_USERS = [
  {
    id: 'usr-admin',
    username: 'Admin',
    password: '0000', // Usuario principal Admin con contraseña 0000
    name: 'Administrador General',
    cargo: 'Administrador de Plataforma',
    empresa: 'Dirección de Obra',
    email: 'admin@antaobra.gal',
    role: 'admin',
    active: true
  }
];

export const INITIAL_AGENTES = [
  {
    id: 'ag-rosa-vilas',
    nombre: 'Rosa Vilas Romalde',
    cargoHabitual: 'Arquitecta Directora de Obra (DO)',
    entidad: 'UTE ANTA-BOG_Berton13',
    colegiado: 'COAG 2.415',
    telefono: '606 61 34 46',
    email: 'anta@coag.es',
    colorFondo: '#1e3a8a',
    iniciales: 'RV',
    notas: 'Arquitecta redactora y directora de obra colegiada'
  },
  {
    id: 'ag-sergio-beceiro',
    nombre: 'Sergio Beceiro Lodeiro',
    cargoHabitual: 'Arquitecto Director de Obra (DO)',
    entidad: 'UTE ANTA-BOG_Berton13',
    colegiado: 'COAG 2.890',
    telefono: '606 61 34 46',
    email: 'anta@coag.es',
    colorFondo: '#1e3a8a',
    iniciales: 'SB',
    notas: 'Arquitecto redactor y director de obra colegiado'
  },
  {
    id: 'ag-jose-roberto-botana',
    nombre: 'Jose Roberto Botana Corral',
    cargoHabitual: 'Responsable Técnico da Propiedade',
    entidad: 'VIPUGAL',
    colegiado: 'Sociedade de Vivenda Pública de Galicia',
    telefono: '881 95 85 69',
    email: 'jose.roberto.botana.corral@vivendapublica.gal',
    colorFondo: '#0ea5e9',
    iniciales: 'JB',
    notas: 'Responsable técnico da propiedade - Sociedade de Vivenda Pública de Galicia (VIPUGAL)'
  },
  {
    id: 'ag-fernando-lopez',
    nombre: 'Fernando López Bellón',
    cargoHabitual: 'Coordinador Técnico da Propiedade',
    entidad: 'VIPUGAL',
    colegiado: 'Sociedade de Vivenda Pública de Galicia',
    telefono: '981 54 19 53 - 609 12 30 14',
    email: 'fernando.lopez.bellon@vivendapublica.gal',
    colorFondo: '#0284c7',
    iniciales: 'FL',
    notas: 'Coordinador técnico da propiedade - Sociedade de Vivenda Pública de Galicia (VIPUGAL)'
  },
  {
    id: 'ag-baltasar-otero',
    nombre: 'Baltasar Otero Gómez',
    cargoHabitual: 'Arquitecto Director de Obra (DO)',
    entidad: 'UTE ANTA-BOG_Berton13',
    colegiado: 'COAG',
    telefono: '619 31 77 16',
    email: 'baltaotero@gmail.com',
    colorFondo: '#1e3a8a',
    iniciales: 'BO',
    notas: 'Arquitecto Director de Obra - UTE ANTA-BOG_Berton13'
  },
  {
    id: 'ag-rafael-vazquez',
    nombre: 'Rafael Vázquez Barros',
    cargoHabitual: 'Director de Execución Material (DEM)',
    entidad: 'Rafael Vázquez Barros',
    colegiado: 'COATAC',
    telefono: '661 31 10 77',
    email: 'rafaelvazquez@coatac.es',
    colorFondo: '#38bdf8',
    iniciales: 'RB',
    notas: 'Arquitecto Técnico / Aparellador - Director de Execución Material (DEM)'
  },
  {
    id: 'ag-raul-perez',
    nombre: 'Raúl Pérez Garrote',
    cargoHabitual: 'Coordinador de Seguridade e Saúde (CSS)',
    entidad: 'INCOPE CONSULTORES S.L.',
    colegiado: 'Técnico Sup. PRL',
    telefono: '683 50 10 75',
    email: 'raulpg@incope.org',
    colorFondo: '#e0f2fe',
    iniciales: 'RP',
    notas: 'Coordinador de Seguridade e Saúde durante a execución da obra - INCOPE CONSULTORES S.L.'
  },
  {
    id: 'ag-gabriel-llorente',
    nombre: 'Gabriel Llorente Coello',
    cargoHabitual: 'Jefe de Grupo de Obra',
    entidad: 'ACCIONA CONSTRUCCION S.L.',
    colegiado: '',
    telefono: '672 06 75 78',
    email: 'gabriel.llorente.coello@acciona.com',
    colorFondo: '#ffffff',
    iniciales: 'GL',
    notas: 'Jefe de grupo (coordina varias obras) - ACCIONA CONSTRUCCION S.L.'
  },
  {
    id: 'ag-david-hermida',
    nombre: 'David Hermida Carballido',
    cargoHabitual: 'Jefe de Obra (JO)',
    entidad: 'ACCIONA CONSTRUCCION S.L.',
    colegiado: '',
    telefono: '667 58 23 36',
    email: 'dahermida@acciona.com',
    colorFondo: '#ffffff',
    iniciales: 'DH',
    notas: 'Jefe de Obra principal - ACCIONA CONSTRUCCION S.L.'
  },
  {
    id: 'ag-mar-rodriguez',
    nombre: 'Mar Rodríguez Fontán',
    cargoHabitual: 'Responsable de Control de Calidade e Ensaios',
    entidad: 'CYE CONTROL Y ESTUDIOS S.L.',
    colegiado: 'Laboratorio de Ensaios Homologado',
    telefono: '661 46 14 74',
    email: 'mar.rodriguez@controlyestudios.com',
    colorFondo: '#ffffff',
    iniciales: 'MR',
    notas: 'Control de Calidade e Ensaios de Materiais - CYE CONTROL Y ESTUDIOS S.L.'
  }
];

export const INITIAL_OBRAS = [
  {
    id: 'obra-castillo-san-felipe',
    expediente: 'XTR-2024-LOTE 2',
    titulo: 'EDIFICIO DE 49 VIVENDAS DE PROMOCIÓN PÚBLICAS (VPP), GARAXE E LOCAIS NA PARCELA 13 DO PP- DO BERTÓN',
    situacion: 'Parcela 13 - Bertón - Ferrol',
    promotor: 'Sociedade de Vivenda Pública de Galicia (VIPUGAL)',
    contratista: 'ACCIONA CONSTRUCCION S.L.',
    jefeObra: 'David Hermida Carballido',
    direccionObra: 'Rosa Vilas Romalde e Sergio Beceiro Lodeiro e Baltasar Otero Gómez (DO)',
    direccionEjecucion: 'Rafael Vázquez Barros (DEM)',
    coordinadorCSS: 'Raúl Pérez Garrote (CSS)',
    presupuestoAdjudicacion: '894.520,00 €',
    presupuesto: 894520,
    financiacion: 'Sociedade de Vivenda Pública de Galicia (VIPUGAL) - Xunta de Galicia',
    fechaInicio: '2026-09-09',
    plazoMeses: 18,
    estado: 'en_ejecucion',
    descripcion: 'Edificación de vivendas de promoción pública con garaxes e rochos na Parcela 13 do polígono residencial do Bertón en Ferrol.',
    agentes: [
      {
        agenteId: 'ag-rosa-vilas',
        rol: 'DO',
        nombre: 'Rosa Vilas Romalde',
        cargo: 'Arquitecta Directora de Obra (DO)',
        entidad: 'UTE ANTA-BOG_Berton13',
        email: 'anta@coag.es',
        telefono: '606 61 34 46',
        iniciales: 'RV',
        colorFondo: '#1e3a8a'
      },
      {
        agenteId: 'ag-sergio-beceiro',
        rol: 'DO',
        nombre: 'Sergio Beceiro Lodeiro',
        cargo: 'Arquitecto Director de Obra (DO)',
        entidad: 'UTE ANTA-BOG_Berton13',
        email: 'anta@coag.es',
        telefono: '606 61 34 46',
        iniciales: 'SB',
        colorFondo: '#1e3a8a'
      },
      {
        agenteId: 'ag-baltasar-otero',
        rol: 'DO',
        nombre: 'Baltasar Otero Gómez',
        cargo: 'Arquitecto Director de Obra (DO)',
        entidad: 'UTE ANTA-BOG_Berton13',
        email: 'baltaotero@gmail.com',
        telefono: '619 31 77 16',
        iniciales: 'BO',
        colorFondo: '#1e3a8a'
      },
      {
        agenteId: 'ag-rafael-vazquez',
        rol: 'DEM',
        nombre: 'Rafael Vázquez Barros',
        cargo: 'Director de Execución Material (DEM)',
        entidad: 'Rafael Vázquez Barros',
        email: 'rafaelvazquez@coatac.es',
        telefono: '661 31 10 77',
        iniciales: 'RB',
        colorFondo: '#38bdf8'
      },
      {
        agenteId: 'ag-raul-perez',
        rol: 'CSS',
        nombre: 'Raúl Pérez Garrote',
        cargo: 'Coordinador de Seguridade e Saúde (CSS)',
        entidad: 'INCOPE CONSULTORES S.L.',
        email: 'raulpg@incope.org',
        telefono: '683 50 10 75',
        iniciales: 'RP',
        colorFondo: '#e0f2fe'
      },
      {
        agenteId: 'ag-gabriel-llorente',
        rol: 'JO',
        nombre: 'Gabriel Llorente Coello',
        cargo: 'Jefe de Grupo de Obra',
        entidad: 'ACCIONA CONSTRUCCION S.L.',
        email: 'gabriel.llorente.coello@acciona.com',
        telefono: '672 06 75 78',
        iniciales: 'GL',
        colorFondo: '#ffffff'
      },
      {
        agenteId: 'ag-david-hermida',
        rol: 'JO',
        nombre: 'David Hermida Carballido',
        cargo: 'Jefe de Obra (JO)',
        entidad: 'ACCIONA CONSTRUCCION S.L.',
        email: 'dahermida@acciona.com',
        telefono: '667 58 23 36',
        iniciales: 'DH',
        colorFondo: '#ffffff'
      },
      {
        agenteId: 'ag-jose-roberto-botana',
        rol: 'Propiedade',
        nombre: 'Jose Roberto Botana Corral',
        cargo: 'Responsable Técnico da Propiedade',
        entidad: 'VIPUGAL',
        email: 'jose.roberto.botana.corral@vivendapublica.gal',
        telefono: '881 95 85 69',
        iniciales: 'JB',
        colorFondo: '#0ea5e9'
      },
      {
        agenteId: 'ag-fernando-lopez',
        rol: 'Propiedade',
        nombre: 'Fernando López Bellón',
        cargo: 'Coordinador Técnico da Propiedade',
        entidad: 'VIPUGAL',
        email: 'fernando.lopez.bellon@vivendapublica.gal',
        telefono: '981 54 19 53 - 609 12 30 14',
        iniciales: 'FL',
        colorFondo: '#0284c7'
      },
      {
        agenteId: 'ag-mar-rodriguez',
        rol: 'ControlCalidade',
        nombre: 'Mar Rodríguez Fontán',
        cargo: 'Responsable de Control de Calidade e Ensaios',
        entidad: 'CYE CONTROL Y ESTUDIOS S.L.',
        email: 'mar.rodriguez@controlyestudios.com',
        telefono: '661 46 14 74',
        iniciales: 'MR',
        colorFondo: '#ffffff'
      }
    ]
  }
];

export const INITIAL_SETTINGS = {
  activeObraId: 'obra-castillo-san-felipe',
  obraPrincipal: 'EDIFICIO DE 49 VIVENDAS DE PROMOCIÓN PÚBLICAS (VPP), GARAXE E LOCAIS NA PARCELA 13 DO PP- DO BERTÓN',
  situacion: 'Parcela 13 - Bertón - Ferrol',
  expediente: 'XTR-2024-LOTE 2',
  contratista: 'ACCIONA CONSTRUCCION S.L.',
  equipoTecnico: 'Rosa Vilas Romalde e Sergio Beceiro Lodeiro e Baltasar Otero Gómez (DO) / Rafael Vázquez Barros (DEM)',
  coordinadorCSS: 'Raúl Pérez Garrote (CSS)',
  entidadPromotora: 'Sociedade de Vivenda Pública de Galicia (VIPUGAL)',
  logosHeader: 'default'
};

export const INITIAL_ACTAS = [];
export const INITIAL_INFORMES = [];
export const INITIAL_NOTAS = [];
export const INITIAL_REUNIONES = [];
