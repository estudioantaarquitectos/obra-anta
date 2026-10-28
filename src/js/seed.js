/* ==========================================================================
   ANTA OBRA - Initial Seed Data
   Extracted verbatim from:
   - 17 ACTA reunion_ CastilloSanFelipe_09092025.pdf
   - DT05_INFORMES DE OBRA.pdf
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
    entidad: 'Dirección Facultativa',
    colegiado: 'COAG 2.415',
    telefono: '981 12 34 56',
    email: 'rosa.vilas@coag.es',
    colorFondo: '#1e3a8a',
    iniciales: 'RV',
    notas: 'Arquitecta redactora y directora de obra colegiada'
  },
  {
    id: 'ag-sergio-beceiro',
    nombre: 'Sergio Beceiro Lodeiro',
    cargoHabitual: 'Arquitecto Director de Obra (DO)',
    entidad: 'Dirección Facultativa',
    colegiado: 'COAG 2.890',
    telefono: '981 23 45 67',
    email: 'sergio.beceiro@coag.es',
    colorFondo: '#1e3a8a',
    iniciales: 'SB',
    notas: 'Arquitecto redactor y director de obra colegiado'
  },
  {
    id: 'ag-ana-gallego',
    nombre: 'Ana Gallego Núñez',
    cargoHabitual: 'Directora de Ejecución Material (DEM)',
    entidad: 'Aparelladores Galicia',
    colegiado: 'COAAT 1.108',
    telefono: '981 34 56 78',
    email: 'ana.gallego@aparelladores.gal',
    colorFondo: '#38bdf8',
    iniciales: 'AG',
    notas: 'Aparejadora / Arquitecta técnica de control de calidad y mediciones'
  },
  {
    id: 'ag-juan-carlos-bello',
    nombre: 'Juan Carlos Bello Criado',
    cargoHabitual: 'Coordinador de Seguridad y Salud (CSS)',
    entidad: 'Seguridade & Prevención',
    colegiado: 'Técnico Sup. PRL',
    telefono: '610 45 67 89',
    email: 'jcbello@prevencion.gal',
    colorFondo: '#e0f2fe',
    iniciales: 'JB',
    notas: 'Coordinador en fase de ejecución y prevención de riesgos laborales'
  },
  {
    id: 'ag-miguel-lopez',
    nombre: 'Miguel López Rodríguez',
    cargoHabitual: 'Jefe de Obra (JO)',
    entidad: 'Cabero Edificaciones, S.A.',
    colegiado: '',
    telefono: '620 56 78 90',
    email: 'mlopez@cabero.es',
    colorFondo: '#ffffff',
    iniciales: 'ML',
    notas: 'Jefe de obra de la empresa constructora principal'
  },
  {
    id: 'ag-maria-jose-gonzalez',
    nombre: 'María José González Novo',
    cargoHabitual: 'Arquitecta Municipal / Supervisión Concello',
    entidad: 'Concello de Ferrol',
    colegiado: 'Servizo de Urbanismo',
    telefono: '981 94 40 00',
    email: 'urbanismo@ferrol.gal',
    colorFondo: '#ffffff',
    iniciales: 'MG',
    notas: 'Supervisión técnica municipal e servizo de urbanismo e patrimonio'
  },
  {
    id: 'ag-joaquin-ferrer',
    nombre: 'Joaquín Ferrer Cruz',
    cargoHabitual: 'Arqueólogo / Control de Patrimonio Cultural',
    entidad: 'Patrimonio Cultural',
    colegiado: 'Arqueólogo Colegiado',
    telefono: '630 67 89 01',
    email: 'jferrer@patrimonio.gal',
    colorFondo: '#ffffff',
    iniciales: 'JF',
    notas: 'Seguimiento y control de afecciones arqueológicas y patrimoniales'
  }
];

export const INITIAL_OBRAS = [
  {
    id: 'obra-castillo-san-felipe',
    expediente: 'AVS 03007 25/05',
    titulo: 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU',
    situacion: 'Castillo de San Felipe, 15591. Concello de Ferrol',
    promotor: 'Concello de Ferrol / MITECO - Instituto para la Transición Justa',
    contratista: 'Cabero Edificaciones, S.A.',
    jefeObra: 'Miguel López Rodríguez',
    direccionObra: 'Rosa Vilas Romalde y Sergio Beceiro Lodeiro (DO)',
    direccionEjecucion: 'Ana Gallego Núñez (DEM)',
    coordinadorCSS: 'Juan Carlos Bello Criado (CSS)',
    arquitectaMunicipal: 'María José González Novo',
    arqueologo: 'Joaquín Ferrer Cruz',
    agentes: [
      {
        agenteId: 'ag-rosa-vilas',
        rol: 'DO',
        nombre: 'Rosa Vilas Romalde',
        cargo: 'Arquitecta Directora de Obra (DO)',
        entidad: 'Dirección Facultativa',
        email: 'rosa.vilas@coag.es',
        telefono: '981 12 34 56'
      },
      {
        agenteId: 'ag-sergio-beceiro',
        rol: 'DO',
        nombre: 'Sergio Beceiro Lodeiro',
        cargo: 'Arquitecto Director de Obra (DO)',
        entidad: 'Dirección Facultativa',
        email: 'sergio.beceiro@coag.es',
        telefono: '981 23 45 67'
      },
      {
        agenteId: 'ag-ana-gallego',
        rol: 'DEM',
        nombre: 'Ana Gallego Núñez',
        cargo: 'Directora de Ejecución Material (DEM)',
        entidad: 'Aparelladores Galicia',
        email: 'ana.gallego@aparelladores.gal',
        telefono: '981 34 56 78'
      },
      {
        agenteId: 'ag-juan-carlos-bello',
        rol: 'CSS',
        nombre: 'Juan Carlos Bello Criado',
        cargo: 'Coordinador de Seguridad y Salud (CSS)',
        entidad: 'Seguridade & Prevención',
        email: 'jcbello@prevencion.gal',
        telefono: '610 45 67 89'
      },
      {
        agenteId: 'ag-miguel-lopez',
        rol: 'JO',
        nombre: 'Miguel López Rodríguez',
        cargo: 'Jefe de Obra (JO)',
        entidad: 'Cabero Edificaciones, S.A.',
        email: 'mlopez@cabero.es',
        telefono: '620 56 78 90'
      },
      {
        agenteId: 'ag-maria-jose-gonzalez',
        rol: 'Municipal',
        nombre: 'María José González Novo',
        cargo: 'Supervisión Municipal / Concello',
        entidad: 'Concello de Ferrol',
        email: 'urbanismo@ferrol.gal',
        telefono: '981 94 40 00'
      },
      {
        agenteId: 'ag-joaquin-ferrer',
        rol: 'Arqueoloxía',
        nombre: 'Joaquín Ferrer Cruz',
        cargo: 'Arqueólogo / Patrimonio Cultural',
        entidad: 'Patrimonio Cultural',
        email: 'jferrer@patrimonio.gal',
        telefono: '630 67 89 01'
      }
    ],
    presupuestoAdjudicacion: '894.520,00 €',
    financiacion: 'Plan de Recuperación, Transformación y Resiliencia – Financiado por la Unión Europea – Next Generation EU',
    fechaInicio: '2025-01-15',
    plazoMeses: 12,
    estado: 'en_ejecucion',
    descripcion: 'Actuaciones de rehabilitación, consolidación de fábricas de cantería, reposición de carpinterías exteriores de iroko y puesta en valor del Castillo de San Felipe.'
  }
];

export const INITIAL_SETTINGS = {
  activeObraId: 'obra-castillo-san-felipe',
  obraPrincipal: 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU',
  situacion: 'Castillo de San Felipe, 15591. Concello de Ferrol',
  expediente: 'AVS 03007 25/05',
  contratista: 'Cabero Edificaciones, S.A.',
  equipoTecnico: 'Rosa Vilas Romalde y Sergio Beceiro Lodeiro (DO) / Ana Gallego Núñez (DEM)',
  coordinadorCSS: 'Juan Carlos Bello Criado',
  entidadPromotora: 'Concello de Ferrol / MITECO - Instituto para la Transición Justa',
  logosHeader: 'default'
};

export const INITIAL_ACTAS = [
  {
    id: 'acta-17',
    obraId: 'obra-castillo-san-felipe',
    numero: 17,
    fecha: '2025-09-09',
    obra: 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU',
    situacion: 'Castillo de San Felipe, 15591. Concello de Ferrol',
    expediente: 'AVS 03007 25/05',
    asistentes: [
      { id: '1', nombre: 'María José González Novo', cargo: 'Arquitecta Municipal', entidad: 'Concello de Ferrol', asistio: true },
      { id: '2', nombre: 'Rosa Vilas Romalde', cargo: 'Arquitecta Directora de Obra', entidad: 'Dirección Facultativa', asistio: true },
      { id: '3', nombre: 'Sergio Beceiro Lodeiro', cargo: 'Arquitecto Director de Obra', entidad: 'Dirección Facultativa', asistio: true },
      { id: '4', nombre: 'Juan Carlos Bello Criado', cargo: 'Coordinador de Seguridad y Salud', entidad: 'CSS', asistio: true },
      { id: '5', nombre: 'Miguel López Rodríguez', cargo: 'Jefe de Obra', entidad: 'Cabero Edificaciones, S.A.', asistio: true },
      { id: '6', nombre: 'Ana Gallego Núñez', cargo: 'Directora de ejecución', entidad: 'DEM', asistio: true },
      { id: '7', nombre: 'Joaquín Ferrer Cruz', cargo: 'Arqueólogo', entidad: 'Patrimonio', asistio: true }
    ],
    cuestionesTratadas: [
      {
        id: 'q1',
        subtitulo: 'Carpinterías',
        puntos: [
          'Se recibe en obra, muestra de hoja de carpintería exterior en iroko y con marco normalizado. Se solicita y se enviará por parte de la empresa de carpintería, los detalles de los marcos, documentación de calidad, ensayos y características técnicas de todos los componentes (marco, vidrio, herrajes, tratamientos, etc).',
          'Se toman medidas de las mochetas para ajustar los marcos de carpintería.',
          'La carpintería exterior será color marrón igual al existente en la torre del s. XIX.'
        ]
      },
      {
        id: 'q2',
        subtitulo: 'Sala pequeña de cafetería bloque C derecho',
        puntos: [
          'Después del picado del enfoscado de mortero de cemento de la parte alta aparece el trabatel original, se solicita a la empresa constructora el levantamiento de una platilla del mismo y se solicita que se continue retirando los morteros de cemento para su recuperación.',
          'Se sacarán las líneas de replanteo de la cubierta.',
          'Se recibe valoración en cuanto a medición del desmontado de la parte superior del muro de fachada que se encuentra muy desplomado. Se aprueba y se medirá en las partidas 3.2.8 de desmontaje y la partida 4.1.3 de realización de muro.'
        ]
      },
      {
        id: 'q3',
        subtitulo: 'En el bloque central',
        puntos: [
          'Para el caviti, se recibe ficha técnica de caviti “Granchio”. Se comprueba que las resistencias son adecuadas.'
        ]
      },
      {
        id: 'q4',
        subtitulo: 'En el bloque derecho de cafetería',
        puntos: [
          'En zona de lareira, se encintará la piedra de cantería y se enfoscará el resto. La DF marcará exactamente que piedras a encintar.'
        ]
      },
      {
        id: 'q5',
        subtitulo: 'En zona exterior',
        puntos: [
          'Se solicita plano de fabricación y despiece de barandilla. Los tramos de la barandilla (modulados a 2,31 m) se traerán dependiendo del tamaño de la cuba de galvanizado y del transporte. No obstante, se solicita de nuevo un plano en cad de la empresa metálica asignada para ser aprobado por la DF antes de su fabricación.',
          'Se nos indica que esta semana se replantearán las vigas de cubierta, por parte de los carpinteros contratados, para empezar con su fabricación y comenzar con su colocación en octubre.',
          'La DF solicita cuanto antes la contratación de los trabajos de cantería. Igualmente, solicita de nuevo se agilicen los trabajos de subcontratación de los distintos oficios a la mayor brevedad posible.',
          'En esta reunión, estuvo presente el carpintero subcontratado para las obras, al que se le enviará el plano con los ajustes de la cubierta en obra y a él se le ha pedido las siguientes muestras de:\n  - Perfil de la carpintería exterior.\n  - Pavimento de tarima.\n  - Las divisiones de los aseos.'
        ]
      },
      {
        id: 'q6',
        subtitulo: 'Respecto a los restos arqueológicos',
        puntos: [
          'Pendiente de consulta al Servizo do Patrimonio Cultural el pavimento de la zona derecha. La DF ya tiene una solución a proponer.',
          'En el volumen derecho, donde está el muro original del castillo. Se consolidará el existente.',
          'Pendiente de consulta al Servizo do Patrimonio Cultural del pequeño acabado del suelo del pozo aparecido en las caballerizas. La DF ya tiene una solución a proponer, pendiente de enviar la fotogrametría el arqueólogo.',
          'Decisión sobre la excavación con medidas de seguridad de la fosa séptica. Consultado por el arqueólogo de la obra al Servizo do Patrimonio Cultural puede realizarse la excavación de forma no manual, dada su peligrosidad, pero deberá estar presente cuando se realice la misma.',
          'Ante los restos aparecidos la solución principal será no injerir en los mismos, no actuando sobre ellos, separándose y protegerlos según indicaciones del Servizo do Patrimonio Cultural. Indicar que, con esta solución, no se retrasan los trabajos en obra.'
        ]
      }
    ],
    indicacionesSeguridad: [
      'Se recuerda por parte del Coordinador de Seguridad y salud, a los trabajadores que deben de utilizar los EPIS establecidos durante los trabajos que se está llevando a cabo (gafas, guantes, mascarillas, …).',
      'Se recuerda que todos los agentes que intervienen en la obra deben de evitar circular pegados a los muros de carga, por precaución ante cualquier desprendimiento de estos, mientras no estén consolidados. En el caso de tener que trabajar al pié de uno de estos muros no consolidado, se montará una marquesina para proteger al/a los trabajador/es.',
      'Se ordena que los trabajadores que están trabajando en la coronación de los muros, lleven arnés y estén sujetos a una línea de vida.',
      'Se recuerda que deben de ser revisados antes de iniciar los trabajos diariamente, el estado de los andamios y de las líneas de vida.',
      'Se recuerda que no se puede trabajar debajo de la chimenea de fibrocemento y la fábrica de ladrillo que la recubre, hasta que se retire la chimenea.'
    ],
    actuacionesPrevistas: [
      'En cuanto a los trabajos de cantería y nuevas piezas, se indica al jefe de obra la urgencia de comenzar estos trabajos para poder continuar con la cubierta.',
      'Se solicita agilizar los trabajos y contratación del pavimento interior de cafetería, debido a la carencia de personal y subcontratas especializadas en este tipo de pavimentos.',
      'Se continúa con limpieza, demoliciones y encintados en muros de cantería.',
      'Se comienza la preparación de coronación de muro de cafetería para recibir el apoyo de la estructura.',
      'Se continúa con el retacado de muros de cachotería por la cara interior.'
    ],
    agentesInformados: [
      { id: '1', nombre: 'María José González Novo', cargo: 'Arquitecta Municipal' },
      { id: '2', nombre: 'Rosa Vilas Romalde', cargo: 'Arquitecta Directora de Obra' },
      { id: '3', nombre: 'Sergio Beceiro Lodeiro', cargo: 'Arquitecto Director de Obra' },
      { id: '4', nombre: 'Juan Carlos Bello Criado', cargo: 'Coordinador de Seguridad y Salud' },
      { id: '5', nombre: 'Joaquín Ferrer Cruz', cargo: 'Arqueólogo' },
      { id: '6', nombre: 'Miguel López Rodríguez', cargo: 'Jefe de Obra. Cabero Edificaciones, S.A.' },
      { id: '7', nombre: 'Ana Gallego Núñez', cargo: 'Directora de ejecución' }
    ],
    firmas: [
      { cargo: 'DO', texto: 'Fdo. Rosa Vilas Romalde y Sergio Beceiro Lodeiro (DO)' },
      { cargo: 'CSS', texto: 'Fdo. Juan Carlos Bello Criado (CSS)' },
      { cargo: 'DEM', texto: 'Fdo. Ana Gallego Núñez (DEM)' },
      { cargo: 'JO', texto: 'Fdo. Miguel López Rodríguez (JO Cabero)' }
    ],
    fotos: [
      {
        id: 'f1',
        url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"%3E%3Crect fill="%23e2e8f0" width="100%25" height="100%25"/%3E%3Crect x="20" y="20" width="360" height="220" fill="%23cbd5e1" rx="4"/%3E%3Ccircle cx="90" cy="80" r="30" fill="%2394a3b8"/%3E%3Cpolygon points="50,210 180,100 280,190 350,140 370,210" fill="%2364748b"/%3E%3Ctext x="200" y="235" font-family="Arial" font-size="12" fill="%23334155" text-anchor="middle"%3EMuestra carpintería Iroko y fábrica s. XIX%3C/text%3E%3C/svg%3E',
        fecha: '2025-09-09',
        descripcion: 'Detalle de la muestra de carpintería exterior en madera de iroko y comprobación de mocheta en muro exterior.',
        categoria: 'Carpintería'
      },
      {
        id: 'f2',
        url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"%3E%3Crect fill="%23e2e8f0" width="100%25" height="100%25"/%3E%3Crect x="20" y="20" width="360" height="220" fill="%23e0e7ff" rx="4"/%3E%3Cpolygon points="40,210 150,110 240,180 320,130 380,210" fill="%23818cf8"/%3E%3Ctext x="200" y="235" font-family="Arial" font-size="12" fill="%23312e81" text-anchor="middle"%3ETrabatel original aparecido tras picado%3C/text%3E%3C/svg%3E',
        fecha: '2025-09-09',
        descripcion: 'Sala pequeña de cafetería bloque C derecho: aparición del trabatel original tras el picado del mortero de cemento.',
        categoria: 'Estructura / Patrimonio'
      }
    ],
    estado: 'firmada',
    creadoPor: 'Rosa Vilas Romalde',
    fechaCreacion: '2025-09-09T14:30:00Z',
    modificadoPor: 'Sergio Beceiro Lodeiro',
    fechaModificacion: '2025-09-09T18:00:00Z'
  },
  {
    id: 'acta-16',
    obraId: 'obra-castillo-san-felipe',
    numero: 16,
    fecha: '2025-09-02',
    obra: 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU',
    situacion: 'Castillo de San Felipe, 15591. Concello de Ferrol',
    expediente: 'AVS 03007 25/05',
    asistentes: [
      { id: '1', nombre: 'Rosa Vilas Romalde', cargo: 'Arquitecta Directora de Obra', entidad: 'Dirección Facultativa', asistio: true },
      { id: '2', nombre: 'Sergio Beceiro Lodeiro', cargo: 'Arquitecto Director de Obra', entidad: 'Dirección Facultativa', asistio: true },
      { id: '3', nombre: 'Juan Carlos Bello Criado', cargo: 'Coordinador de Seguridad y Salud', entidad: 'CSS', asistio: true },
      { id: '4', nombre: 'Miguel López Rodríguez', cargo: 'Jefe de Obra', entidad: 'Cabero Edificaciones, S.A.', asistio: true },
      { id: '5', nombre: 'Ana Gallego Núñez', cargo: 'Directora de ejecución', entidad: 'DEM', asistio: true }
    ],
    cuestionesTratadas: [
      {
        id: 'q1',
        subtitulo: 'Demoliciones y consolidaciones previas',
        puntos: [
          'Revisión del estado de los muros perimetrales de cantería y replanteo de catas de cimentación.',
          'Coordinación con el arqueólogo sobre los sectores a intervenir en caballerizas.'
        ]
      }
    ],
    indicacionesSeguridad: [
      'Revisión del vallado perimetral y señalización de desniveles.'
    ],
    actuacionesPrevistas: [
      'Envío de muestras de mortero de cal y recepción de fichas técnicas.'
    ],
    agentesInformados: [
      { id: '1', nombre: 'Rosa Vilas Romalde', cargo: 'Arquitecta Directora de Obra' },
      { id: '2', nombre: 'Miguel López Rodríguez', cargo: 'Jefe de Obra' }
    ],
    firmas: [
      { cargo: 'DO', texto: 'Fdo. Rosa Vilas Romalde (DO)' },
      { cargo: 'CSS', texto: 'Fdo. Juan Carlos Bello Criado (CSS)' }
    ],
    fotos: [],
    estado: 'firmada',
    creadoPor: 'Rosa Vilas Romalde',
    fechaCreacion: '2025-09-02T12:00:00Z',
    modificadoPor: 'Rosa Vilas Romalde',
    fechaModificacion: '2025-09-02T16:00:00Z'
  }
];

export const INITIAL_INFORMES = [
  {
    id: 'inf-1',
    obraId: 'obra-castillo-san-felipe',
    tipo: 'mensual',
    numero: 1,
    datosXerais: {
      proxecto: 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU',
      emprazamento: 'Castillo de San Felipe, 15591. Concello de Ferrol',
      contratista: 'Cabero Edificaciones, S.A.',
      direccionObra: 'Rosa Vilas Romalde e Sergio Beceiro Lodeiro (DO) / Ana Gallego Núñez (DEM)',
      mesInformado: 'Xullo - Agosto 2025 (Fase Inicial e Traballos Previos)',
      dataInforme: '2025-08-31'
    },
    resumoExecutivo: {
      estadoXeral: 'en_prazo',
      avancePrevisto: 16.0,
      avanceExecutado: 15.5,
      principaisFitos: 'Sinatura da acta de comprobación do replanteo sen reservas. Instalación completada das casetas de obra, guindastre torre e peche perimetral de seguridade no baluarte. Inicio das demolicións selectivas no bloque C e caballerizas.',
      principaisIncidencias: 'Detección de filtracións históricas na base do muro sur durante as catas preliminares de drenaxe. Resolto mediante desvío provisional de escorrentías cara á rede xeral.',
      riscosDetectados: 'Risco baixo: Dificultade de acceso para transportes pesados polo camiño histórico do castelo, resolto coordinando horarios con Policía Local.'
    },
    traballosExecutados: {
      executadosMes: 'Capítulo 01: Traballos previos e replanteo xeral con estación total e escáner láser 3D. Capítulo 02: Movemento de terras e escavación arqueolóxica manual en gabias de drenaxe perimetral. Capítulo 03: Demolición controlada de tabiques de ladrillo oco e forxados modernos de formigón sen valor patrimonial.',
      enCurso: 'Picado selectivo de morteiros de cemento Portland degradados sobre fábricas históricas de perpiaño e cachotería granítica no patio de armas.',
      previstosProximoMes: 'Consolidación estrutural de fábricas de cantería, saneamento da base dos muros e replanteo da solera ventilada tipo caviti na zona de cafetería.',
      controlXeometricoCualitativo: 'Levantamento topográfico de precisión milimétrica e comprobación de verticalidade e desplomes en muros de muralla con niveis láser.',
      coordinacionOrganismos: 'Visita técnica conxunta cos inspectores do Servizo de Patrimonio Cultural da Xunta de Galicia e técnicos de urbanismo do Concello de Ferrol.',
      obraNonAcreditada: 'Non se rexistra obra non acreditada no período informado.'
    },
    condicionantesModificacions: {
      circunstanciasSobrevidas: 'Aparición de antigos canais de drenaxe de pedra baixo o pavimento terrizo do patio de armas.',
      desfasesMedicions: 'Sen variacións significativas sobre as medicións do proxecto de execución.',
      previsionModificados: {
        situacion: 'non_hai',
        descricionBreve: 'Non se prevén modificacións contractuais nesta fase inicial.',
        impactoPrazoCusto: 'Sen impacto económico nin ampliación de prazo.'
      }
    },
    seguimentoOrzamentario: {
      controlEconomico: {
        orzamentoAdxudicacion: 894520.00,
        importeCertificadoAcumulado: 138650.60,
        porcentaxeAcumulada: 15.5,
        certificacionMes: 138650.60,
        desviacionEstimada: '-0.5% (axustado á programación inicial de traballos previos)'
      },
      controlPrazo: {
        situacion: 'en_prazo',
        desviacionSemanas: 0,
        causas: 'Cumprimento escrupuloso dos fitos iniciais de implantación e demolicións.',
        medidasCorrectoras: 'Seguimento semanal presencial coa xefatura de obra de Cabero Edificaciones.',
        previsionReestimacion: 'Mantense a data final prevista de execución para xuño de 2026.',
        actualizacionPrograma: 'Programa de traballos vixente conforme ao calendario contractual.',
        necesariaAmpliacion: false,
        xustificacionAmpliacion: ''
      }
    },
    controlCalidade: {
      resumoEnsaios: 'Ensaios de caracterización petrográfica do granito existente e análise físico-química de sales solubles nas fábricas de pedra. Ensaios de adherencia e compatibilidade dos novos morteiros de cal aérea graxa CL-90.',
      incidenciasSolucions: 'Morteros ensaiados cumpren os requisitos de transpirabilidade e resistencia esixidos no prego de prescricións técnicas.',
      ensaiosAnexos: 'Achegados informes de laboratorio acreditado no Anexo de Calidade.'
    },
    seguridadeSaude: {
      situacionXeral: 'correcta',
      incidenciasRelevantes: 'Plan de Seguridade e Saúde aprobado polo Coordinador CSS con acta de apertura do centro de traballo. Todos os operarios dispoñen de cursos PRL de 20 horas do sector da construción e EPIS regulamentarios.'
    },
    reportaxeFotografica: [
      {
        id: 'rf1-1',
        url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"%3E%3Crect fill="%23e2e8f0" width="100%25" height="100%25"/%3E%3Crect x="20" y="20" width="360" height="220" fill="%23cbd5e1" rx="4"/%3E%3Ccircle cx="90" cy="80" r="30" fill="%2394a3b8"/%3E%3Cpolygon points="50,210 180,100 280,190 350,140 370,210" fill="%2364748b"/%3E%3Ctext x="200" y="235" font-family="Arial" font-size="12" fill="%23334155" text-anchor="middle"%3EImplantación de guindastre e casetas de obra%3C/text%3E%3C/svg%3E',
        data: '2025-08-25',
        descripcion: 'Vista xeral da implantación do guindastre torre e casetas de obra no baluarte este.',
        categoria: 'Implantación'
      },
      {
        id: 'rf1-2',
        url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"%3E%3Crect fill="%23e2e8f0" width="100%25" height="100%25"/%3E%3Crect x="20" y="20" width="360" height="220" fill="%23dbeafe" rx="4"/%3E%3Cpolygon points="40,210 150,110 240,180 320,130 380,210" fill="%233b82f6"/%3E%3Ctext x="200" y="235" font-family="Arial" font-size="12" fill="%231e3a8a" text-anchor="middle"%3EDemolición selectiva de engadidos modernos%3C/text%3E%3C/svg%3E',
        data: '2025-08-28',
        descripcion: 'Retirada manual de elementos modernos sen interese histórico en caballerizas.',
        categoria: 'Demolicións'
      }
    ],
    outros: {
      modificacionCondicions: 'Sen alteracións nas condicións contractuais nin nos equipos previstos.',
      certificadoTerminacionFase: 'Certifícase o remate completo da Fase 0 (Implantación e demolicións selectivas).'
    },
    conclusion: {
      estado: 'favorable',
      comentariosFinais: 'O inicio das obras desenvólvese a bo ritmo, con execución rigorosa das directrices patrimoniais e estrita colaboración entre a Dirección Facultativa e a empresa adxudicataria.'
    },
    anexos: {
      actasVisitas: true,
      planObraActualizado: true,
      informesEnsaios: true,
      outrosAnexos: 'Acta de replanteo e primeiros ensaios petrográficos de compatibilidade de morteiros.'
    },
    actasAnexasIds: ['acta-16'],
    anexosPdf: [],
    estado: 'enviado',
    creadoPor: 'Rosa Vilas Romalde',
    fechaCreacion: '2025-08-31T14:00:00Z',
    modificadoPor: 'Rosa Vilas Romalde',
    fechaModificacion: '2025-08-31T17:30:00Z'
  },
  {
    id: 'inf-2',
    obraId: 'obra-castillo-san-felipe',
    tipo: 'mensual',
    numero: 2,
    datosXerais: {
      proxecto: 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU',
      emprazamento: 'Castillo de San Felipe, 15591. Concello de Ferrol',
      contratista: 'Cabero Edificaciones, S.A.',
      direccionObra: 'Rosa Vilas Romalde e Sergio Beceiro Lodeiro (DO) / Ana Gallego Núñez (DEM)',
      mesInformado: 'Setembro - Outubro 2025',
      dataInforme: '2025-10-31'
    },
    resumoExecutivo: {
      estadoXeral: 'en_prazo',
      avancePrevisto: 40.0,
      avanceExecutado: 38.0,
      principaisFitos: 'Aparición do trabatel orixinal de madeira histórica de castiñeiro na cafetaría do bloque C tras o picado de morteiros espurios. Descubrimento e desentullo da embocadura do pozo orixinal de caballerizas. Colocación e formigonado da solera con módulos Caviti de 20 cm sobre lámina impermeabilizante e grava filtrante.',
      principaisIncidencias: 'Necesidade de axuste técnico puntual para a preservación e posta en valor in situ do trabatel aparecido sen comprometer as alturas libres de proxecto.',
      riscosDetectados: 'Risco moderado de subministración de perpiaño de granito silvestre de canteira tradicional para reposición de pezas deterioradas.'
    },
    traballosExecutados: {
      executadosMes: 'Capítulo 04: Consolidación e rexuntado de panos de cantería con morteiro de cal hidráulica natural NHL 3.5. Capítulo 05: Saneamento e drenaxes perimetrais exteriores con tubaxe ranurada corrugada de polietileno DN 160 mm envolta en xeotéxtil. Capítulo 06: Execución da solera ventilada Caviti con mallazo electrosoldado B500S e formigón HA-25/B/20/IIa.',
      enCurso: 'Montaxe da estrutura de madeira laminada GL24h para as novas cubertas dos corpos auxiliares e tratamento fungicida e insecticida anticarcoma.',
      previstosProximoMes: 'Colocación do taboleiro de cuberta hidrófugo, illamento térmico de la de rocha de alta densidade e impermeabilización transpirable previa á tella cerámica.',
      controlXeometricoCualitativo: 'Control de cotas e mocheta en ocos de carpintería e comprobación de desplomes en fachadas.',
      coordinacionOrganismos: 'Consultas continuadas co Servizo do Patrimonio Cultural da Xunta de Galicia sobre o tratamento do pozo de caballerizas.',
      obraNonAcreditada: 'Non se rexistra obra non acreditada no período informado.'
    },
    condicionantesModificacions: {
      circunstanciasSobrevidas: 'Aparición de fábrica orixinal oculta baixo enfoscados de cemento en cafetaría e descubrimento do brocal do pozo.',
      desfasesMedicions: 'Lixeiro incremento en partidas de picado compensado con redución de acabados sintéticos.',
      previsionModificados: {
        situacion: 'en_estudo',
        descricionBreve: 'Axuste de solución de cuberta e preservación de trabatel histórico.',
        impactoPrazoCusto: 'Impacto económico estimado inferior ao 2% do orzamento de adxudicación. Sen ampliación de prazo.'
      }
    },
    seguimentoOrzamentario: {
      controlEconomico: {
        orzamentoAdxudicacion: 894520.00,
        importeCertificadoAcumulado: 339917.60,
        porcentaxeAcumulada: 38.0,
        certificacionMes: 201267.00,
        desviacionEstimada: '-2.0% respecto á programación lineal teórica'
      },
      controlPrazo: {
        situacion: 'en_prazo',
        desviacionSemanas: 0,
        causas: 'Mantemento do ritmo previsto polo reforzo das cuadrillas de canteiría e estruturas.',
        medidasCorrectoras: 'Seguimento semanal coas subcontratas de carpintería e estruturas.',
        previsionReestimacion: 'Previsión de cumprimento do prazo contratado para xuño 2026.',
        actualizacionPrograma: 'Programa de traballos vixente conforme a acta de replanteo.',
        necesariaAmpliacion: false,
        xustificacionAmpliacion: ''
      }
    },
    controlCalidade: {
      resumoEnsaios: 'Ensaios de resistencia á compresión a 28 días de probetas de formigón HA-25 dando valores medios de 29.4 N/mm² (conformes). Ensaios de humidade da madeira laminada (11.8%).',
      incidenciasSolucions: 'Resultados conformes con CTE e especificacións técnicas de prego.',
      ensaiosAnexos: 'Achegados ensaios do laboratorio acreditado no Anexo III.'
    },
    seguridadeSaude: {
      situacionXeral: 'correcta',
      incidenciasRelevantes: 'Revisión xeral de estadas multidireccionais perimetrais homologadas e liñas de vida instaladas para traballos na cuberta. Tramitación ante a autoridade laboral da notificación para retirada da cheminea de fibrocemento.'
    },
    reportaxeFotografica: [
      {
        id: 'rf2-1',
        url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"%3E%3Crect fill="%23e2e8f0" width="100%25" height="100%25"/%3E%3Crect x="20" y="20" width="360" height="220" fill="%23e0e7ff" rx="4"/%3E%3Cpolygon points="40,210 150,110 240,180 320,130 380,210" fill="%23818cf8"/%3E%3Ctext x="200" y="235" font-family="Arial" font-size="12" fill="%23312e81" text-anchor="middle"%3ETrabatel orixinal aparecido tras picado%3C/text%3E%3C/svg%3E',
        data: '2025-09-09',
        descripcion: 'Sala pequena de cafetaría bloque C dereito: aparición do trabatel orixinal tras o picado do mortero de cemento.',
        categoria: 'Estructura / Patrimonio'
      },
      {
        id: 'rf2-2',
        url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"%3E%3Crect fill="%23e2e8f0" width="100%25" height="100%25"/%3E%3Crect x="20" y="20" width="360" height="220" fill="%23fef3c7" rx="4"/%3E%3Ccircle cx="100" cy="80" r="30" fill="%23f59e0b"/%3E%3Cpolygon points="50,210 180,120 280,180 350,130 370,210" fill="%23d97706"/%3E%3Ctext x="200" y="235" font-family="Arial" font-size="12" fill="%2378350f" text-anchor="middle"%3EExecución de solado con caviti ventilado%3C/text%3E%3C/svg%3E',
        data: '2025-10-15',
        descripcion: 'Colocación dos módulos Caviti para a solera ventilada sanitaria na zona de cafetería.',
        categoria: 'Cimentacións'
      }
    ],
    outros: {
      modificacionCondicions: 'Incorporación de carpinteiro especialista de taller e equipo de cantería patrimonial.',
      certificadoTerminacionFase: 'Non aplica no período informado.'
    },
    conclusion: {
      estado: 'favorable',
      comentariosFinais: 'A obra mantén unha dinámica de traballo moi satisfactoria. A recuperación de elementos históricos orixinais está a ser coordinada con rigor e sen alterar a viabilidade técnica nin económica da intervención.'
    },
    anexos: {
      actasVisitas: true,
      planObraActualizado: true,
      informesEnsaios: true,
      outrosAnexos: 'Ficha técnica caviti Granchio e informe arqueolóxico preliminar.'
    },
    actasAnexasIds: ['acta-16', 'acta-17'],
    anexosPdf: [],
    estado: 'enviado',
    creadoPor: 'Rosa Vilas Romalde',
    fechaCreacion: '2025-10-31T17:00:00Z',
    modificadoPor: 'Sergio Beceiro Lodeiro',
    fechaModificacion: '2025-10-31T18:45:00Z'
  },
  {
    id: 'inf-3',
    obraId: 'obra-castillo-san-felipe',
    tipo: 'mensual',
    numero: 3,
    datosXerais: {
      proxecto: 'Refundido de actuaciones en el castillo de San Felipe, en el marco del plan de recuperación, transformación y resiliencia –financiado por la Unión Europea – Next Generation EU',
      emprazamento: 'Castillo de San Felipe, 15591. Concello de Ferrol',
      contratista: 'Cabero Edificaciones, S.A.',
      direccionObra: 'Rosa Vilas Romalde e Sergio Beceiro Lodeiro (DO) / Ana Gallego Núñez (DEM)',
      mesInformado: 'Novembro 2025 - Xaneiro 2026 (Inverno e Festas de Nadal)',
      dataInforme: '2026-01-31'
    },
    resumoExecutivo: {
      estadoXeral: 'con_desviacions',
      avancePrevisto: 62.0,
      avanceExecutado: 58.5,
      principaisFitos: 'Execución completa do peche e estanqueidade das cubertas antes do inicio dos temporais de xaneiro. Instalación das liñas de servizo de fontanería, saneamento e electricidade. Retirada controlada e homologada da antiga cheminea de fibrocemento con transporte a xestor autorizado sen incidencias ambientais.',
      principaisIncidencias: 'Período prolongado de dous meses e medio correspondente ao peche de ano, festividades de Nadal e varios temporais severos de vento e choiva na costa ferrolá que obrigaron a suspender temporalmente traballos exteriores nas coroacións de muralla.',
      riscosDetectados: 'Lixeiro desfase temporal de 2 semanas nos traballos exteriores de cantería compensado polo avance nos espazos interiores cubertos.'
    },
    traballosExecutados: {
      executadosMes: 'Capítulo 07: Cubertas tradicionais de tella cerámica curva sobre lámina transpirable e rastreis de piñeiro tratado. Capítulo 08: Redes de saneamento colgado de polipropileno insonorizado e conducións eléctricas libres de halóxenos CPR. Capítulo 09: Colocación de premarcos de carpintería de madeira maciza de iroko con barreira de vapor e selado elástico.',
      enCurso: 'Tendido de canalizacións de climatización e ventilación con recuperación de calor de alta eficiencia nos falsos teitos de madeira.',
      previstosProximoMes: 'Colocación de carpinterías definitivas con dobre acristalamento de seguridade baixo emisivo, remates de canteiría e pavimentos continuos de calzada e morteiro de cal.',
      controlXeometricoCualitativo: 'Control de niveis de cuberta e probas de pendentes nos canlóns de zinc ocultos.',
      coordinacionOrganismos: 'Presentación do informe de fin de traballos de desamiantado ante a autoridade laboral e ambiental.',
      obraNonAcreditada: 'Non se rexistra obra non acreditada no período informado.'
    },
    condicionantesModificacions: {
      circunstanciasSobrevidas: 'Temporais consecutivos con refachos de vento superiores a 90 km/h que aconsellaron reforzar os amarres de estadas e reprogramar labores en altura.',
      desfasesMedicions: 'Aumento menor en metros lineais de canalizacións enterradas compensado con aforro en alicatados interiores.',
      previsionModificados: {
        situacion: 'en_estudo',
        descricionBreve: 'Valoración da integración arquitectónica da iluminación rasante no adarve da muralla.',
        impactoPrazoCusto: 'Impacto económico estimado inferior ao 1,8% do orzamento. Non require ampliación de prazo.'
      }
    },
    seguimentoOrzamentario: {
      controlEconomico: {
        orzamentoAdxudicacion: 894520.00,
        importeCertificadoAcumulado: 523294.20,
        porcentaxeAcumulada: 58.5,
        certificacionMes: 183376.60,
        desviacionEstimada: '-3.5% (recuperable no vindeiro trimestre co remate de carpinterías e acabados)'
      },
      controlPrazo: {
        situacion: 'atraso_leve',
        desviacionSemanas: 2,
        causas: 'Condicións meteorolóxicas adversas (alertas laranxas por temporal costeiro) e vacacións de Nadal.',
        medidasCorrectoras: 'Aumento de cuadrillas nas instalacións interiores e montaxes en seco.',
        previsionReestimacion: 'Mantense a data final estimada de remate para o verán de 2026.',
        actualizacionPrograma: 'Programa de traballos axustado para acelerar cerramentos interiores.',
        necesariaAmpliacion: false,
        xustificacionAmpliacion: ''
      }
    },
    controlCalidade: {
      resumoEnsaios: 'Probas de estanqueidade de cubertas mediante ensaios de regado continuo sen detección de filtracións. Probas de presión hidráulica e estanqueidade da rede de fontanería a 10 bar durante 2 horas conforme a CTE-DB-HS.',
      incidenciasSolucions: 'Todas as instalacións superaron as probas de presión e estanqueidade regulamentarias.',
      ensaiosAnexos: 'Actas de probas de presión hidráulica e certificados de calidade de madeira FSC/PEFC.'
    },
    seguridadeSaude: {
      situacionXeral: 'correcta',
      incidenciasRelevantes: 'Desamiantado executado segundo o plan RERA aprobado pola autoridade laboral. Medicións ambientais de fibras de amianto en aire con resultados por debaixo dos límites de detección legal. Reforzo de amarres de estadas e sinalización de seguridade fronte a ventos fortes.'
    },
    reportaxeFotografica: [
      {
        id: 'rf3-1',
        url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"%3E%3Crect fill="%23e2e8f0" width="100%25" height="100%25"/%3E%3Crect x="20" y="20" width="360" height="220" fill="%23dcfce7" rx="4"/%3E%3Cpolygon points="50,210 180,90 280,170 350,120 370,210" fill="%2316a34a"/%3E%3Ctext x="200" y="235" font-family="Arial" font-size="12" fill="%2314532d" text-anchor="middle"%3EPeche de cubertas con tella tradicional%3C/text%3E%3C/svg%3E',
        data: '2026-01-18',
        descripcion: 'Montaxe de tella vella recuperada sobre lámina transpirable e rastreis de piñeiro tratado.',
        categoria: 'Cubertas'
      },
      {
        id: 'rf3-2',
        url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"%3E%3Crect fill="%23e2e8f0" width="100%25" height="100%25"/%3E%3Crect x="20" y="20" width="360" height="220" fill="%23f1f5f9" rx="4"/%3E%3Ccircle cx="120" cy="90" r="25" fill="%2364748b"/%3E%3Cpolygon points="40,210 160,130 260,180 340,110 380,210" fill="%23475569"/%3E%3Ctext x="200" y="235" font-family="Arial" font-size="12" fill="%230f172a" text-anchor="middle"%3EInstalacións interiores de saneamento%3C/text%3E%3C/svg%3E',
        data: '2026-01-26',
        descripcion: 'Tendido de redes colgadas de polipropileno insonorizado e tubaxes de distribución.',
        categoria: 'Instalacións'
      }
    ],
    outros: {
      modificacionCondicions: 'Ampliación de cuadrillas nas especialidades de electricidade e fontanería.',
      certificadoTerminacionFase: 'Certificado de estanqueidade e cerramento de envolvente exterior.'
    },
    conclusion: {
      estado: 'atencion_requirida',
      comentariosFinais: 'Malia as inclemencias climáticas habituais da época invernal e a duración estendida deste período (2,5 meses), o avance global da obra é moi positivo, acadando o 58,5% de execución e mantendo os estándares de máxima calidade construtiva e patrimonial esixidos.'
    },
    anexos: {
      actasVisitas: true,
      planObraActualizado: true,
      informesEnsaios: true,
      outrosAnexos: 'Actas de ensaios de estanqueidade e certificado final de retirada de amianto polo RERA.'
    },
    actasAnexasIds: ['acta-16', 'acta-17'],
    anexosPdf: [],
    estado: 'enviado',
    creadoPor: 'Rosa Vilas Romalde',
    fechaCreacion: '2026-01-31T18:30:00Z',
    modificadoPor: 'Rosa Vilas Romalde',
    fechaModificacion: '2026-01-31T19:15:00Z'
  }
];

export const INITIAL_NOTAS = [
  {
    id: 'not-1',
    obraId: 'obra-castillo-san-felipe',
    fecha: '2025-09-12',
    titulo: 'Reunión telefónica con Patrimonio sobre el pozo de caballerizas',
    categoria: 'llamada',
    urgencia: 'media',
    contenido: 'Conversación con el técnico de Patrimonio Cultural. Indican que remitirán el visto bueno por escrito el lunes para la fotogrametría del pozo.',
    autor: 'Rosa Vilas Romalde',
    modificadoPor: 'Rosa Vilas Romalde',
    fechaModificacion: '2025-09-12T11:20:00Z',
    vinculadoA: 'acta-17'
  },
  {
    id: 'not-2',
    obraId: 'obra-castillo-san-felipe',
    fecha: '2025-09-10',
    titulo: 'Aviso urgente retirada chimenea fibrocemento',
    categoria: 'incidencia',
    urgencia: 'alta',
    contenido: 'Recordar a la empresa constructora que la empresa acreditada RERA debe aportar el plan de desamiantado antes de la próxima visita del CSS.',
    autor: 'Juan Carlos Bello Criado',
    modificadoPor: 'Juan Carlos Bello Criado',
    fechaModificacion: '2025-09-10T09:15:00Z',
    vinculadoA: 'acta-17'
  },
  {
    id: 'not-3',
    obraId: 'obra-castillo-san-felipe',
    fecha: '2025-09-08',
    titulo: 'Cita en obra con carpintero de taller',
    categoria: 'recordatorio',
    urgencia: 'baja',
    contenido: 'El carpintero traerá los perfiles y el despiece de los marcos para comparar in situ con el vano existente.',
    autor: 'Sergio Beceiro Lodeiro',
    modificadoPor: 'Sergio Beceiro Lodeiro',
    fechaModificacion: '2025-09-08T16:40:00Z',
    vinculadoA: 'acta-17'
  }
];

export const INITIAL_REUNIONES = [
  {
    id: 'reu-1',
    obraId: 'obra-castillo-san-felipe',
    numero: 1,
    fecha: '2025-09-15',
    hora: '10:30',
    tipoModalidad: 'Presencial',
    lugar: 'Caseta de Obra - Castillo de San Felipe',
    tipoDocumento: 'reunion',
    asistentes: [
      { id: '1', nombre: 'Rosa Vilas Romalde', cargo: 'Arquitecta Directora de Obra', entidad: 'Dirección Facultativa', asistio: true, firma: true },
      { id: '2', nombre: 'Sergio Beceiro Lodeiro', cargo: 'Arquitecto Director de Obra', entidad: 'Dirección Facultativa', asistio: true, firma: true },
      { id: '3', nombre: 'Juan Carlos Bello Criado', cargo: 'Coordinador de Seguridad y Salud', entidad: 'CSS', asistio: true, firma: false },
      { id: '4', nombre: 'Miguel López Rodríguez', cargo: 'Jefe de Obra', entidad: 'Cabero Edificaciones, S.A.', asistio: true, firma: false },
      { id: '5', nombre: 'Ana Gallego Núñez', cargo: 'Directora de ejecución', entidad: 'DEM', asistio: true, firma: true }
    ],
    apartados: [
      {
        id: 'ap-1',
        titulo: 'COORDINACIÓN XERAL E REPLANTEO',
        secciones: [
          {
            id: 'sec-1-1',
            titulo: 'Revisión do programa de traballos e accesos',
            texto: '<p>Acórdase o cronograma de actuacións prioritarias e o protocolo de acceso de vehículos de subministro pola rampla principal.</p>'
          },
          {
            id: 'sec-1-2',
            titulo: 'Coordinación con Patrimonio Cultural',
            texto: '<p>A dirección de obra informa do contacto co servizo provincial para axilizar a resolución dos ensaios de morteiro de cal.</p>'
          }
        ]
      }
    ],
    firmas: [
      { cargo: 'Dirección de Obra', nombre: 'Rosa Vilas Romalde', texto: 'Fdo. Rosa Vilas Romalde (DO)' },
      { cargo: 'Dirección de Obra', nombre: 'Sergio Beceiro Lodeiro', texto: 'Fdo. Sergio Beceiro Lodeiro (DO)' },
      { cargo: 'Directora de ejecución', nombre: 'Ana Gallego Núñez', texto: 'Fdo. Ana Gallego Núñez (DEM)' }
    ],
    anexosPdf: [],
    fotos: [],
    estado: 'firmada',
    creadoPor: 'Rosa Vilas Romalde',
    fechaCreacion: '2025-09-15T12:00:00Z',
    modificadoPor: 'Sergio Beceiro Lodeiro',
    fechaModificacion: '2025-09-15T17:30:00Z'
  }
];

