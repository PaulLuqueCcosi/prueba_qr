import type { Translation } from './en'

export const es: Translation = {
  app: {
    name: 'Matrix QR',
    tagline: 'Herramientas de factorización QR',
    signIn: 'Iniciar sesión',
    loginError: 'Error de inicio de sesión',
    loading: 'Cargando',
    toggleSidebar: 'Mostrar u ocultar la barra lateral',
  },
  signIn: {
    tagline: 'Calcula la factorización QR y las estadísticas de una matriz',
    secureHint:
      'Inicio de sesión seguro con Logto: te redirigimos y volverás aquí',
    waiting: 'Redirigiendo a la página segura de inicio de sesión...',
    waitingShort: 'Redirigiendo...',
    errorTitle: 'Problema al iniciar sesión',
    failed:
      'No pudimos iniciar el proceso de inicio de sesión. Inténtalo de nuevo.',
  },
  callback: {
    completing: 'Completando el inicio de sesión...',
    failedTitle: 'Problema al iniciar sesión',
    failed: 'No pudimos completar el inicio de sesión. Inténtalo de nuevo.',
    back: 'Volver al inicio',
  },
  sidebar: {
    tools: 'Herramientas',
    developer: 'Desarrollador',
    login: 'Iniciar sesión',
    logout: 'Cerrar sesión',
  },
  views: {
    qr: {
      label: 'Factorización QR',
      title: 'Factorización QR',
      description: 'Q es ortogonal, R es triangular superior y A = Q·R.',
    },
    statistics: {
      label: 'Estadísticas',
      title: 'Estadísticas',
      description:
        'Máximo, mínimo, promedio, suma y chequeo de diagonal sobre tres matrices.',
    },
    health: {
      label: 'Estado de las APIs',
      title: 'Estado de las APIs',
      description: 'Estado y latencia de go-api y node-api.',
    },
    developer: {
      label: 'API y token',
      title: 'API y token',
      description:
        'Revisa o copia el ID token (el Bearer token) para probar las APIs a mano.',
    },
  },
  qr: {
    inputTitle: 'Matriz de entrada',
    inputDescription:
      'Se envía a {{url}}/api/v1/qr. Edita las celdas, elige un ejemplo o llénala al azar.',
    random: 'Aleatoria',
    clear: 'Limpiar',
    examples: 'Ejemplos',
    compute: 'Calcular QR',
    computing: 'Calculando...',
    statisticsTitle: 'Estadísticas',
    statisticsDescription:
      'Calculadas sobre la matriz original, Q y R en conjunto.',
    matricesTitle: 'Matrices',
    matricesDescription: 'A = Q·R, con Q ortogonal y R triangular superior.',
    qCaption: 'Ortogonal: Qᵀ·Q = I.',
    rCaption: 'Triangular superior.',
    originalTitle: 'Original (A)',
    originalCaption: 'La matriz que enviaste.',
  },
  examples: {
    classic: 'Clásica 3x3',
    tall: 'Alta 3x2',
    wide: 'Ancha 2x3',
    single: '1x1',
    diagonal: 'Diagonal',
    ragged: 'Inválida (irregular)',
  },
  grid: {
    rows: 'Filas',
    columns: 'Columnas',
    addRow: 'Agregar fila',
    removeRow: 'Quitar fila',
    addColumn: 'Agregar columna',
    removeColumn: 'Quitar columna',
    matrixValues: 'Valores de la matriz',
    cell: 'Fila {{row}}, columna {{column}}',
    size: '{{rows}}x{{columns}}',
    sizeHint: 'Hasta {{max}}x{{max}} (límite del frontend, no de las APIs).',
    pasteJson: 'Pegar JSON',
    pasteJsonTitle: 'Cargar matriz desde JSON',
    pasteJsonDescription:
      'Pega una matriz como arreglo JSON de filas, p. ej. [[1,2],[3,4]]. Útil para matrices grandes.',
    pasteJsonPlaceholder: '[[1,2],[3,4]]',
    loadJson: 'Cargar',
    cancel: 'Cancelar',
  },
  statisticsPanel: {
    inputTitle: 'Matrices de entrada',
    inputDescription:
      'Se envían directo a {{url}}/api/v1/statistics, sin pasar por go-api.',
    label: 'Matrices como JSON',
    hint: 'Objeto con original, q y r. La API no comprueba que Q·R sea igual a la original.',
    compute: 'Calcular estadísticas',
    resultTitle: 'Resultado',
    resultDescription: 'Calculado sobre las tres matrices en conjunto.',
  },
  stats: {
    max: 'Máximo',
    min: 'Mínimo',
    average: 'Promedio',
    sum: 'Suma total',
    diagonalQuestion: '¿Matriz diagonal?',
    original: 'Original',
    any: 'Alguna',
    yes: 'Sí',
    no: 'No',
    badge: '{{name}}: {{answer}}',
  },
  matrixTable: {
    copyJson: 'Copiar JSON',
    copyAria: 'Copiar {{title}} como JSON',
  },
  health: {
    title: 'Estado de las APIs',
    description:
      'Llama a GET /health de cada API directamente desde el navegador.',
    checking: 'Comprobando',
    ok: 'OK',
    down: 'Caída',
    checkAgain: 'Comprobar de nuevo',
    latency: '{{ms}} ms',
    http: 'HTTP {{status}}',
    timeout: 'Tiempo agotado tras {{ms}} ms',
    unreachable: 'Inaccesible',
  },
  developer: {
    title: 'ID token',
    description:
      'Copia un token nuevo para llamar a las APIs desde Postman o Swagger. El token nunca se muestra.',
    copy: 'Copiar ID token',
    showClaims: 'Mostrar claims',
    couldNotGet: 'No se pudo obtener el ID token.',
    copied: 'ID token copiado al portapapeles.',
    couldNotCopy: 'No se pudo copiar el ID token.',
    unknown: 'desconocido',
    expired: 'vencido',
    secondsLeft: 'faltan {{seconds}} s',
  },
  configError: {
    title: 'Falta configuración',
    body: 'Define estas variables en .env.local (ver .env.example) y reinicia el servidor de desarrollo:',
  },
  errors: {
    renderTitle: 'No se pudieron mostrar los resultados',
    renderBody:
      'Algo falló al mostrar este resultado. Tus datos están a salvo: inténtalo de nuevo.',
    renderRetry: 'Reintentar',
    clientValidation: 'Entrada inválida',
    serverMessage: 'Mensaje del servidor',
    titles: {
      '0': 'No se puede acceder a la API',
      '400': 'Solicitud incorrecta',
      '401': 'No autorizado',
      '403': 'Prohibido',
      '413': 'Contenido demasiado grande',
      '422': 'Matriz inválida',
      '502': 'Servicio no disponible',
      default: 'Error',
    },
    codes: {
      NETWORK_ERROR:
        'No se puede acceder a la API. ¿Está en ejecución y CORS permite este origen?',
      TOKEN_ERROR:
        'No se pudo obtener el ID token. Cierra sesión y vuelve a entrar.',
      INVALID_JSON: 'El cuerpo de la solicitud no es JSON válido.',
      INVALID_MATRIX: 'La matriz es inválida.',
      PAYLOAD_TOO_LARGE: 'El contenido es demasiado grande.',
      UPSTREAM_UNAVAILABLE: 'La API de destino (node-api) no está disponible.',
      INTERNAL_ERROR: 'Error interno del servidor.',
      NOT_FOUND: 'Ruta no encontrada.',
      NON_FINITE_RESULT: 'El resultado contiene números no finitos.',
    },
    fallback: {
      '400': 'Solicitud mal formada (JSON inválido).',
      '401': 'No autorizado: el token falta, es inválido o venció.',
      '403': 'Prohibido: acceso denegado.',
      '413': 'El contenido es demasiado grande.',
      '422': 'La matriz es inválida.',
      '502': 'La API de destino (node-api) no está disponible.',
      default: 'Respuesta inesperada ({{status}}).',
    },
  },
  issues: {
    invalidJson: 'JSON inválido{{detail}}',
    emptyMatrix: 'La matriz debe ser un arreglo no vacío de filas.',
    emptyRow: 'La fila {{row}} debe ser un arreglo no vacío.',
    notRectangular:
      'La matriz no es rectangular: la fila {{row}} tiene {{actual}} valores y se esperaban {{expected}}.',
    notFinite:
      'El valor en la fila {{row}}, columna {{column}} no es un número finito.',
    expectedObject: 'Se esperaba un objeto con original, q y r.',
    emptyCells_one:
      '{{count}} celda vacía: complétala (en la fila {{row}}, columna {{column}}).',
    emptyCells_other:
      '{{count}} celdas vacías: complétalas (la primera en la fila {{row}}, columna {{column}}).',
    invalidNumber:
      'El valor en la fila {{row}}, columna {{column}} no es un número válido. Usa dígitos con signo o punto decimal opcionales.',
    tooLarge:
      'La matriz es {{rows}}x{{columns}}, supera el límite de {{max}}x{{max}} del frontend. Las APIs no tienen ese límite; súbelo en src/lib/grid.ts si necesitas más.',
  },
  language: {
    label: 'Idioma',
    en: 'English',
    es: 'Español',
  },
  theme: {
    label: 'Tema',
    light: 'Claro',
    dark: 'Oscuro',
    system: 'Sistema',
  },
}
