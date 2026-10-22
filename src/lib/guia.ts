/**
 * La guía de Dlay: el recorrido de bienvenida y el manual completo.
 *
 * Viven en el mismo archivo a propósito: si una explicación cambia, cambia en
 * los dos lugares a la vez y no se pueden contradecir.
 *
 * Sin `server-only`: el recorrido es un componente de cliente.
 *
 * Al escribir acá vale lo mismo que en toda la app: «cliente», «titular» y
 * «tu negocio»; nunca «clienta», «dueña» ni «estética».
 */

// ---------------------------------------------------------------------------
// El recorrido
// ---------------------------------------------------------------------------
// Cada paso ilumina un elemento marcado con `data-guia="..."`. Si ese
// elemento no está en pantalla —recepción no ve Informes, un profesional no
// ve la Caja—, el paso se saltea solo.

export type PasoRecorrido = {
  /** El `data-guia` del elemento a iluminar. Sin ancla, el paso va al centro. */
  ancla: string | null;
  titulo: string;
  texto: string;
};

export const RECORRIDO: PasoRecorrido[] = [
  {
    ancla: null,
    titulo: "¡Bienvenido a Dlay!",
    texto:
      "Te mostramos cada parte del sistema en un par de minutos. Podés saltearlo y verlo cuando quieras desde Ayuda.",
  },
  {
    ancla: "inicio",
    titulo: "Inicio",
    texto:
      "Lo primero que ves al entrar: los primeros pasos que te faltan, tu link de reservas y para instalar Dlay en el teléfono como una aplicación.",
  },
  {
    ancla: "agenda",
    titulo: "Agenda",
    texto:
      "Tus turnos, día por día. Desde acá agendás, marcás quién vino, cobrás y bloqueás horarios. Los turnos que tus clientes sacan o cambian solos aparecen sin que hagas nada.",
  },
  {
    ancla: "clientes",
    titulo: "Clientes",
    texto:
      "La ficha de cada persona: teléfono, avisos importantes como alergias, notas de cada sesión y su historial. Si ya tenés tus clientes en un Excel, los importás de una vez.",
  },
  {
    ancla: "caja",
    titulo: "Caja",
    texto:
      "Lo que entra y lo que sale cada día, por medio de pago. Al cerrar, contás el efectivo y Dlay te dice si cuadra.",
  },
  {
    ancla: "informes",
    titulo: "Informes",
    texto:
      "Cómo viene tu negocio: cuánto cobraste, cuántos faltaron, qué servicios dejan más y si los recordatorios están sirviendo.",
  },
  {
    ancla: "servicios",
    titulo: "Servicios",
    texto:
      "Lo que ofrecés, con su duración y su precio. Acá también elegís cuándo le llega el recordatorio a quien viene a cada servicio y qué le dice.",
  },
  {
    ancla: "avisos",
    titulo: "Avisos",
    texto:
      "Los recordatorios por WhatsApp. Arrancan en modo de prueba: no le llega nada a nadie hasta que vos lo decidas. En una tabla ves qué avisa cada servicio.",
  },
  {
    ancla: "ajustes",
    titulo: "Ajustes",
    texto:
      "Conectar tu WhatsApp, tus horarios de atención, la reserva online, tu equipo y tu cuenta. Casi todo se configura una vez y no se vuelve a tocar.",
  },
  {
    ancla: "ayuda",
    titulo: "Ayuda",
    texto:
      "La guía completa, con todo explicado y un buscador. Desde ahí también podés volver a ver este recorrido.",
  },
  {
    ancla: "primeros-pasos",
    titulo: "Por dónde empezar",
    texto:
      "Seguí estos pasos en orden y en un rato tenés todo andando. Cada uno se tacha solo cuando lo hacés.",
  },
];

// ---------------------------------------------------------------------------
// El manual
// ---------------------------------------------------------------------------

export type Tema = {
  titulo: string;
  /** Párrafos. Uno por renglón del arreglo. */
  texto: string[];
};

export type SeccionGuia = {
  id: string;
  titulo: string;
  resumen: string;
  /** La pantalla de la que habla, para ir directo. */
  enlace?: { href: string; texto: string };
  temas: Tema[];
};

export const MANUAL: SeccionGuia[] = [
  {
    id: "empezar",
    titulo: "Por dónde empezar",
    resumen: "Los pasos para dejar tu negocio andando el primer día.",
    temas: [
      {
        titulo: "El orden que conviene",
        texto: [
          "1. Cargá tus servicios, con su duración y su precio (Servicios → Nuevo servicio).",
          "2. Revisá tus horarios de atención (Ajustes → Horarios de atención). Vienen cargados de lunes a viernes; cambialos por los tuyos.",
          "3. Conectá tu WhatsApp escaneando un código, como WhatsApp Web (Ajustes → WhatsApp).",
          "4. Elegí qué avisa cada servicio y escribile su mensaje (Avisos, o dentro de cada servicio).",
          "5. Traé tus clientes desde un Excel o cargalos a medida que vengan (Clientes → Importar).",
          "6. Cuando los mensajes digan lo que querés, salí del modo de prueba (Avisos → Empezar a enviar de verdad).",
          "7. Si querés que reserven solos, abrí tu agenda al público (Ajustes → Reserva online) y compartí el link.",
        ],
      },
      {
        titulo: "La tarjeta «Primeros pasos»",
        texto: [
          "En el Inicio vas a ver una tarjeta con estos pasos. Cada uno se tacha solo cuando lo hacés, y la tarjeta desaparece cuando terminás.",
        ],
      },
      {
        titulo: "Volver a ver el recorrido",
        texto: [
          "El recorrido que aparece la primera vez se puede repetir cuando quieras desde Ayuda → «Ver el recorrido de nuevo».",
        ],
      },
    ],
  },
  {
    id: "inicio",
    titulo: "Inicio",
    resumen: "Lo de hoy, los pasos pendientes y los accesos rápidos.",
    enlace: { href: "/", texto: "Ir al inicio" },
    temas: [
      {
        titulo: "Instalar Dlay en el teléfono",
        texto: [
          "Dlay se puede instalar como una aplicación: abre con su ícono y sin la barra del navegador. Ocupa lo mismo que una pestaña.",
          "En el Inicio, en «Tenela a mano», tocá «Instalar la aplicación». En el iPhone se hace desde Safari: botón Compartir → «Agregar a pantalla de inicio».",
        ],
      },
      {
        titulo: "Avisos en tu teléfono",
        texto: [
          "Desde la misma tarjeta podés activar las notificaciones. Te avisan cuando entra una reserva online o cuando un cliente confirma, cancela o cambia su turno desde su enlace.",
          "Se activan por dispositivo: si usás el teléfono y la computadora, activalas en los dos. Con «Probar» te llega una de prueba.",
        ],
      },
      {
        titulo: "Tu link de reservas",
        texto: [
          "Si abriste la reserva online, en el Inicio está tu link para compartir en Instagram o mandárselo a tus clientes.",
        ],
      },
    ],
  },
  {
    id: "agenda",
    titulo: "Agenda",
    resumen: "Turnos, estados, cobros y horarios bloqueados.",
    enlace: { href: "/agenda", texto: "Ir a la agenda" },
    temas: [
      {
        titulo: "Cómo se lee",
        texto: [
          "Arriba hay una tira con los días de la semana y cuántos turnos tiene cada uno. Tocás un día y abajo ves sus turnos ordenados por hora.",
          "Si dos turnos coinciden en el horario se muestran juntos: es normal cuando un servicio admite varios a la vez.",
          "La agenda se actualiza sola: si un cliente reserva, confirma o cancela desde su teléfono, lo ves sin recargar.",
        ],
      },
      {
        titulo: "Agendar un turno",
        texto: [
          "Tocá «Nuevo turno», elegí o creá el cliente, marcá uno o varios servicios y elegí el horario.",
          "Si elegís varios servicios, se hacen uno detrás del otro y el turno dura la suma de todos.",
          "La nota del turno es sólo para ese turno. Lo que vale siempre (una alergia, una preferencia) va en la ficha del cliente.",
          "Si el horario está completo, el sistema no lo agenda y te dice por qué, por ejemplo: «Depilación admite 2 a la vez y ya están tomados».",
        ],
      },
      {
        titulo: "Los estados de un turno",
        texto: [
          "Sin confirmar: recién agendado.",
          "Confirmado: el cliente confirmó desde su enlace o lo marcaste vos.",
          "Atendido: vino. Marcalo para que los informes sepan quién vino.",
          "No vino: faltó sin avisar. Es lo que mide el ausentismo.",
          "Cancelado: avisó que no viene. El horario queda libre.",
          "Cada cambio queda registrado con quién lo hizo y cuándo. Un turno no se borra: se cancela, así la caja y los informes no quedan sin explicación.",
        ],
      },
      {
        titulo: "Cobrar desde el turno",
        texto: [
          "Dentro del turno hay una tarjeta de cobro con el saldo ya calculado: el precio menos lo que ya se cobró.",
          "El importe se puede cambiar, para señas o pagos en dos veces. Abajo te dice cuánto queda debiendo.",
          "Si cobrás en efectivo, la caja tiene que estar abierta: si no, el botón te lo avisa con un enlace para abrirla.",
        ],
      },
      {
        titulo: "Mover o cancelar un turno",
        texto: [
          "Desde el turno lo podés cambiar de horario o cancelar. Los recordatorios pendientes se ajustan solos: si lo cancelás, no sale ninguno.",
        ],
      },
      {
        titulo: "Bloquear horarios",
        texto: [
          "«Bloquear» cierra un rato o un día entero: un feriado, un trámite, vacaciones. En ese tiempo nadie puede reservar online.",
          "El motivo es opcional y sólo se ve adentro del negocio, nunca del lado del cliente.",
        ],
      },
      {
        titulo: "El sonido",
        texto: [
          "Con la agenda abierta podés activar un sonido que suena cuando un cliente confirma o cancela desde su enlace.",
        ],
      },
    ],
  },
  {
    id: "clientes",
    titulo: "Clientes",
    resumen: "Fichas, avisos importantes, notas e importación.",
    enlace: { href: "/clientes", texto: "Ir a clientes" },
    temas: [
      {
        titulo: "La ficha",
        texto: [
          "Lo único obligatorio es el nombre. El teléfono es lo que permite mandarle el recordatorio por WhatsApp.",
          "El historial de turnos, lo que gastó y cuántas veces faltó se calculan solos.",
        ],
      },
      {
        titulo: "El teléfono y el 9",
        texto: [
          "Escribilo como quieras: con 0, con 15, con espacios. Dlay lo guarda en el formato que necesita WhatsApp.",
          "WhatsApp necesita el 9 de los celulares argentinos. Si escribís un número sin 0 ni 15, Dlay asume que es celular y te lo avisa. Si es un fijo, marcá «Es un teléfono fijo»: los fijos no reciben WhatsApp.",
          "Dos fichas pueden tener el mismo número (por ejemplo, una madre que saca turno para su hija). La ficha te avisa cuando pasa.",
        ],
      },
      {
        titulo: "Aviso importante y notas",
        texto: [
          "El aviso importante es para lo que no se puede pasar por alto: alergias, embarazo, medicación. Se muestra siempre arriba de todo y al agendar.",
          "Las notas son el seguimiento sesión a sesión. Se van sumando y no se editan: si algo estaba mal, se agrega otra nota.",
        ],
      },
      {
        titulo: "Etiquetas",
        texto: [
          "Sirven para agrupar clientes como quieras: «frecuente», «paquete de 10», «referida de Ana». Se crean desde la ficha.",
        ],
      },
      {
        titulo: "Por dónde recibe los recordatorios",
        texto: [
          "En la ficha podés elegir que a una persona le avisemos siempre por WhatsApp, o que no le llegue ningún recordatorio. «Automático» deja que decida el sistema.",
        ],
      },
      {
        titulo: "Importar desde Excel",
        texto: [
          "Clientes → Importar acepta un Excel o un CSV. Dlay reconoce solo qué columna es el nombre, el teléfono o el correo, y antes de guardar te muestra cómo va a quedar.",
          "Si una persona ya existe (mismo teléfono o mismo correo), no se duplica.",
          "Se pueden importar miles de fichas de una vez.",
        ],
      },
      {
        titulo: "Buscar",
        texto: [
          "El buscador encuentra por nombre, apellido, teléfono o correo, aunque escribas sin tildes o con una letra de menos.",
        ],
      },
    ],
  },
  {
    id: "servicios",
    titulo: "Servicios",
    resumen: "Duración, precio, cupos y el recordatorio de cada servicio.",
    enlace: { href: "/servicios", texto: "Ir a servicios" },
    temas: [
      {
        titulo: "Duración y tiempo de preparación",
        texto: [
          "La duración es lo que dura la atención. El tiempo de preparación (limpieza, armado de la camilla) se suma después y ocupa la agenda, pero el cliente no lo ve.",
        ],
      },
      {
        titulo: "Turnos a la vez",
        texto: [
          "Si un servicio admite varias personas al mismo tiempo (por ejemplo, un aparato que trabaja solo mientras atendés a otro), poné cuántos. La agenda no deja pasarse de ese número.",
          "Un masaje, en cambio, es siempre de a uno.",
        ],
      },
      {
        titulo: "Precio o «a convenir»",
        texto: [
          "Cada servicio tiene un precio o se marca «a convenir» cuando depende de la zona o de las sesiones. Los «a convenir» no muestran precio en la reserva online.",
          "Cuando cambiás un precio, los turnos ya agendados conservan el de antes: cada turno guarda cuánto costaba el día que se agendó.",
        ],
      },
      {
        titulo: "Activo y reservable online",
        texto: [
          "Un servicio no se borra: se desactiva. Así los turnos viejos siguen teniendo a qué servicio referirse.",
          "«Reservable online» decide si tus clientes lo ven en el link de reservas. Uno apagado lo seguís pudiendo agendar vos.",
        ],
      },
      {
        titulo: "El recordatorio de cada servicio",
        texto: [
          "Abajo de todo, en «Recordatorio por WhatsApp», elegís cuándo le avisamos a quien viene a ese servicio: una semana antes, un día antes o las dos.",
          "En «Qué le querés decir» escribís lo propio de ese servicio: cómo prepararse, qué traer, tu política de ausencias. Con los botones «+ Nombre», «+ Día y hora», etc. agregás datos que se completan solos.",
          "Abajo ves cómo le va a llegar, tal cual. Lo gris es el saludo y el cierre, iguales para todos los servicios; lo negro es lo tuyo.",
        ],
      },
    ],
  },
  {
    id: "avisos",
    titulo: "Avisos (recordatorios)",
    resumen: "Cómo salen los recordatorios por WhatsApp y cómo controlarlos.",
    enlace: { href: "/recordatorios", texto: "Ir a avisos" },
    temas: [
      {
        titulo: "Cómo funcionan",
        texto: [
          "Dlay mira tus turnos de los próximos días y arma solo los recordatorios. Salen por WhatsApp desde tu número, uno por uno y despacio, como si los mandara una persona.",
          "Cada mensaje trae el enlace del turno, desde donde el cliente confirma, cancela o cambia el horario. Lo que haga aparece solo en tu agenda.",
          "Si un turno se agenda cuando ya pasó el momento del aviso, el aviso sale igual en los minutos siguientes, siempre que el turno no sea para hoy.",
        ],
      },
      {
        titulo: "Qué avisa cada servicio",
        texto: [
          "La tabla de Avisos muestra todos tus servicios y dos casillas: «Semana antes» y «Día antes». Cada toque se guarda solo.",
          "«Todos» y «Ninguno», arriba de cada columna, prenden o apagan ese aviso para todos los servicios de una vez.",
          "Si un turno tiene dos servicios, el cliente recibe un solo mensaje con lo de los dos.",
          "Si apagás un aviso, también se cancelan los que ya estaban en la cola para ese servicio.",
        ],
      },
      {
        titulo: "El modo de prueba",
        texto: [
          "Toda cuenta nueva arranca en modo de prueba: el sistema arma cada mensaje y lo anota, pero no le llega nada a nadie.",
          "Dejalo unos días, mirá en «Próximos envíos» qué se habría mandado, y cuando esté bien tocá «Empezar a enviar de verdad».",
          "Para salir del modo de prueba primero tenés que tener tu WhatsApp conectado.",
        ],
      },
      {
        titulo: "Frenar todo",
        texto: [
          "Al pie de Avisos está «Frenar todos los envíos». Corta todo al instante, por ejemplo si detectás un error en un mensaje. Lo pendiente queda esperando hasta que lo reanudes.",
        ],
      },
      {
        titulo: "Próximos envíos y contadores",
        texto: [
          "Arriba ves cuántos hay en cola, cuántos salieron este mes y cuántos se saltearon. En «Próximos envíos» ves a quién le va a llegar cada uno y cuándo.",
          "Un aviso se saltea cuando la persona ya recibió el máximo de mensajes del día o de la semana, o cuando no tiene teléfono.",
        ],
      },
      {
        titulo: "Opciones avanzadas",
        texto: [
          "Para la mayoría no hace falta tocarlas. Ahí están las reglas a medida (por ejemplo, un aviso dos horas antes, o sólo para quien ya faltó alguna vez), el saludo y el cierre de los mensajes, y el horario de envío.",
        ],
      },
      {
        titulo: "Horario y topes de envío",
        texto: [
          "En Ajustes → Envío de mensajes elegís la franja en la que pueden salir (por defecto, de 9 a 20). Lo que vence de madrugada espera a la mañana.",
          "También el máximo de mensajes por persona por día y por semana: es la red de seguridad si varias reglas caen el mismo día.",
        ],
      },
    ],
  },
  {
    id: "whatsapp",
    titulo: "WhatsApp",
    resumen: "Conectar tu número con un código QR.",
    enlace: { href: "/configuracion/whatsapp", texto: "Ir a WhatsApp" },
    temas: [
      {
        titulo: "Conectar tu número",
        texto: [
          "Ajustes → WhatsApp → «Mostrar el código QR». En el teléfono del negocio abrí WhatsApp → Ajustes → Dispositivos vinculados → Vincular un dispositivo, y apuntá al código.",
          "En unos segundos dice «WhatsApp conectado con QR». Tu número sigue funcionando normal en el teléfono, y los mensajes que mande Dlay aparecen ahí también.",
          "El código cambia cada unos segundos y vence a los dos minutos. Si vence, generá otro.",
        ],
      },
      {
        titulo: "Mandarte una prueba",
        texto: [
          "Con el número conectado aparece «Mandarme un mensaje de prueba». Usá otro número tuyo: un número no se puede escribir a sí mismo.",
        ],
      },
      {
        titulo: "Para que no se desconecte",
        texto: [
          "El teléfono tiene que conectarse a internet al menos una vez cada 14 días; si no, WhatsApp desvincula el dispositivo, igual que con WhatsApp Web.",
          "Si lo desvinculás desde el teléfono, Dlay lo detecta y te pide escanear de nuevo.",
        ],
      },
      {
        titulo: "Cuidados",
        texto: [
          "WhatsApp no permite oficialmente esta forma de conexión: si detecta algo raro puede bloquear el número. Por eso los mensajes salen de a uno, con pausas.",
          "Los primeros días conviene que salgan pocos mensajes. Evitá mandar recordatorios a números que nunca te escribieron si podés.",
        ],
      },
      {
        titulo: "Las respuestas",
        texto: [
          "Lo que te escriban tus clientes llega a tu WhatsApp de siempre, como hasta hoy. Confirmar, cancelar o cambiar el turno lo hacen desde el enlace.",
        ],
      },
    ],
  },
  {
    id: "enlace",
    titulo: "El enlace del turno",
    resumen: "Lo que ve tu cliente y qué puede hacer.",
    enlace: { href: "/configuracion/reservas", texto: "Ir a reserva online" },
    temas: [
      {
        titulo: "Qué es",
        texto: [
          "Cada turno tiene su propio enlace, que viaja en el recordatorio y en la confirmación de la reserva. Lo abre el cliente sin usuario ni contraseña.",
          "Ve su turno (día, hora, servicio) y los botones que elegiste: confirmar, cambiar el día o el horario, y no voy a poder ir.",
        ],
      },
      {
        titulo: "Elegir los botones",
        texto: [
          "En Ajustes → Reserva online → «Qué botones ve en el enlace» prendés o apagás cada uno. Si no aceptás cambios de horario, apagá ese.",
          "Si apagás los tres, el enlace muestra el turno y le dice que los cambios se hacen hablando, con tu teléfono.",
        ],
      },
      {
        titulo: "Hasta cuándo puede cancelar o cambiar",
        texto: [
          "Pasado ese plazo (en horas antes del turno), ya no le aparecen los botones de cancelar ni de cambiar: si no puede venir, te tiene que avisar.",
          "Ojo: el recordatorio del día anterior sale 24 horas antes. Si el plazo es de 24 o más, cuando lo recibe ya no puede cancelar desde el enlace.",
          "También elegís cuántas veces puede mover el mismo turno.",
        ],
      },
    ],
  },
  {
    id: "reserva",
    titulo: "Reserva online",
    resumen: "Que tus clientes saquen turno solos, a cualquier hora.",
    enlace: { href: "/configuracion/reservas", texto: "Ir a reserva online" },
    temas: [
      {
        titulo: "Abrir la agenda al público",
        texto: [
          "Nace cerrada. Configurá todo con calma y prendé «Agenda abierta al público» cuando esté lista. El link aparece en el Inicio.",
          "Sólo se ofrecen los horarios libres según tus horarios de atención, tus bloqueos y los cupos de cada servicio.",
        ],
      },
      {
        titulo: "Las reglas",
        texto: [
          "Anticipación mínima: cuántas horas antes como mínimo se puede reservar.",
          "Hasta cuántos días adelante: cuánto hacia el futuro.",
          "Cada cuánto se ofrece un horario: con 15 minutos se ofrecen 9:00, 9:15, 9:30…",
          "Turnos a futuro por persona y clientes nuevos por hora: frenos contra quien reserva media agenda y no viene.",
        ],
      },
      {
        titulo: "Qué ven tus clientes",
        texto: [
          "Podés mostrar u ocultar los precios, poner un texto de bienvenida y una indicación de cómo llegar.",
          "Al reservar, si el teléfono ya está en tus clientes, el turno se suma a esa ficha y no se pisa nada de lo que cargaste.",
        ],
      },
    ],
  },
  {
    id: "caja",
    titulo: "Caja",
    resumen: "Cobros, gastos y el cierre del día.",
    enlace: { href: "/caja", texto: "Ir a la caja" },
    temas: [
      {
        titulo: "Abrir la caja",
        texto: [
          "Al empezar el día, abrí la caja con el efectivo que ya hay en el cajón (o 0).",
        ],
      },
      {
        titulo: "Cobros y gastos",
        texto: [
          "Registrás cobros y gastos con importe, concepto y medio de pago: efectivo, transferencia, débito, crédito, Mercado Pago u otro.",
          "Lo que no es efectivo se puede registrar aunque la caja esté cerrada: no pasa por el cajón. Se ve aparte, como «cobros fuera de la caja», y entra en los informes.",
        ],
      },
      {
        titulo: "Corregir un error",
        texto: [
          "Los movimientos no se editan ni se borran: se anulan. La anulación crea el movimiento contrario y quedan los dos a la vista, así siempre se sabe qué pasó.",
        ],
      },
      {
        titulo: "Cerrar y arqueo",
        texto: [
          "Al cerrar, contás el efectivo y lo escribís. Recién después Dlay te muestra cuánto debería haber y la diferencia.",
          "Si falta plata suele ser un cobro sin registrar o un vuelto de más; si sobra, un cobro registrado de menos. Podés anotar observaciones.",
          "Una caja cerrada no se reabre: para seguir cobrando se abre otra.",
        ],
      },
    ],
  },
  {
    id: "informes",
    titulo: "Informes",
    resumen: "Cómo viene tu negocio en un período.",
    enlace: { href: "/informes", texto: "Ir a informes" },
    temas: [
      {
        titulo: "Períodos",
        texto: [
          "Este mes, el mes pasado, los últimos 30 días, este año, o un rango que elijas.",
        ],
      },
      {
        titulo: "Cobrado y facturado",
        texto: [
          "Cobrado es lo que entró por la caja. Facturado es el precio de los turnos atendidos. Si lo facturado es bastante más, falta cargar cobros o hay clientes debiendo.",
        ],
      },
      {
        titulo: "Agenda y ausentismo",
        texto: [
          "Turnos, atendidos, ausencias y cancelados. El ausentismo se mide sobre turnos ya cumplidos: cancelar con aviso no es faltar.",
          "La ocupación compara los minutos agendados con tus horarios de atención.",
          "Si quedan turnos sin marcar como atendido o no vino, el informe te avisa: marcarlos es lo que hace que los números sean ciertos.",
        ],
      },
      {
        titulo: "Servicios y recordatorios",
        texto: [
          "Qué servicios dejan más plata y cuánto tiempo de agenda ocupan.",
          "«¿Sirven los recordatorios?» compara cuánto faltan quienes recibieron aviso contra quienes no. Aparece cuando hay al menos cinco turnos de cada lado.",
        ],
      },
    ],
  },
  {
    id: "ajustes",
    titulo: "Ajustes",
    resumen: "Tu negocio, horarios, equipo, datos y cuenta.",
    enlace: { href: "/configuracion", texto: "Ir a ajustes" },
    temas: [
      {
        titulo: "Tu negocio",
        texto: [
          "El nombre que ven tus clientes, la dirección y la zona horaria. La zona horaria decide cuándo empieza cada día y a qué hora sale cada recordatorio: revisá que sea la tuya.",
        ],
      },
      {
        titulo: "Horarios de atención",
        texto: [
          "Qué días y en qué franjas atendés. Un día puede tener varias franjas (por ejemplo, 9 a 13 y 16 a 20). Un día sin franjas queda cerrado.",
        ],
      },
      {
        titulo: "Tus datos",
        texto: [
          "Descargá tus clientes y tus turnos en Excel cuando quieras. Todo lo que cargaste es tuyo.",
        ],
      },
      {
        titulo: "Tu equipo y los roles",
        texto: [
          "Invitás a alguien con un enlace que mandás por WhatsApp. Sirve una sola vez y vence en una semana.",
          "Titular: todo. Administración: todo menos dar de baja el negocio. Recepción: agenda, clientes y caja, sin informes ni ajustes. Profesional: la agenda y las fichas, sin plata.",
          "Cada uno entra con su propio usuario, así queda registrado quién hizo cada cosa.",
        ],
      },
      {
        titulo: "Tu cuenta",
        texto: [
          "El primer mes es gratis. Después se paga por adelantado cada 30 días, desde Tu cuenta, con Mercado Pago.",
          "Si se vence, tenés 5 días de margen. Pasados, la cuenta se suspende: se frenan los recordatorios y la reserva online hasta que pagues. No se borra nada.",
        ],
      },
    ],
  },
  {
    id: "preguntas",
    titulo: "Preguntas frecuentes",
    resumen: "Lo que más se pregunta, resuelto.",
    temas: [
      {
        titulo: "A un cliente no le llegó el recordatorio",
        texto: [
          "Revisá en orden: que no estés en modo de prueba; que tu WhatsApp diga «conectado» en Ajustes → WhatsApp; que la ficha tenga un celular (no un fijo); que el servicio del turno tenga el aviso prendido en Avisos; y en «Próximos envíos», si se salteó y por qué.",
        ],
      },
      {
        titulo: "En el enlace sólo aparece «Confirmar»",
        texto: [
          "Ya pasó el plazo para cancelar o cambiar (Ajustes → Reserva online). Bajalo si querés que el cliente pueda cancelar cuando recibe el recordatorio del día anterior.",
        ],
      },
      {
        titulo: "Quiero cambiar el texto del recordatorio",
        texto: [
          "Lo de cada servicio se cambia en el servicio, en «Qué le querés decir». El saludo y el cierre, iguales para todos, en Avisos → Opciones avanzadas → Saludo y cierre de los mensajes.",
        ],
      },
      {
        titulo: "Me aparece «WhatsApp desconectado»",
        texto: [
          "Volvé a escanear el código en Ajustes → WhatsApp. Suele pasar si el teléfono estuvo más de 14 días sin internet o si se desvinculó desde el teléfono.",
        ],
      },
      {
        titulo: "Me equivoqué al cobrar",
        texto: [
          "En la caja, anulá el movimiento y registralo de nuevo bien. Las dos cosas quedan a la vista.",
        ],
      },
      {
        titulo: "Alguien del equipo no ve la caja o los informes",
        texto: [
          "Es por su rol. Recepción no ve informes y un profesional no ve la plata. Lo ves en Ajustes → Tu equipo.",
        ],
      },
    ],
  },
];
