const { Client, LocalAuth} = require('whatsapp-web.js');
const qrcode = require("qrcode-terminal")

// Red de seguridad: si alguna promesa se rechaza sin manejar en cualquier
// parte del código, solo la registramos en consola en vez de dejar que
// Node mate todo el proceso (esto es lo que estaba pasando con los stickers).
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection (el bot sigue corriendo):', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception (el bot sigue corriendo):', err);
});


const respuestas = {

    // agregar recursamientos
    // agregar la variacion facultad con derecho
    // cafeteria

    // =========================
    // GENERAL
    // =========================

    // tengo duda
    hola: "Holaaaa!!!",
    holaa: "Holaaaa!!!",
    holaaa: "Holaaaa!!!",
    buenas: "¡Holaaaa! ¿En qué puedo ayudarte?",
    buenastardes: "¡Holaaaa! ¿En qué puedo ayudarte?",
    buenosdias: "¡Holaaaa! ¿En qué puedo ayudarte?",
    buenasnoches: "¡Holaaaa! ¿En qué puedo ayudarte?",


    // =========================
    // SOCIEDAD DE ALUMNOS
    // =========================

    queessociedaddealumnos: "Sociedad de alumnos es una agrupación estudiantil encargada de realizar actividades para la Facultad y está integrada por alumnas y alumnos interesados en colaborar.",
    quesociedaddealumnos: "Sociedad de alumnos es una agrupación estudiantil encargada de realizar actividades para la Facultad y está integrada por alumnas y alumnos interesados en colaborar.",
    queeslasociedaddealumnos: "Sociedad de alumnos es una agrupación estudiantil encargada de realizar actividades para la Facultad y está integrada por alumnas y alumnos interesados en colaborar.",
    paraquesirvelasociedaddealumnos: "Sociedad de alumnos es una agrupación estudiantil encargada de realizar actividades para la Facultad y está integrada por alumnas y alumnos interesados en colaborar.",
    quehacesociedaddealumnos: "Sociedad de alumnos es una agrupación estudiantil encargada de realizar actividades para la Facultad y está integrada por alumnas y alumnos interesados en colaborar.",
    quehacenlasociedaddealumnos: "Sociedad de alumnos es una agrupación estudiantil encargada de realizar actividades para la Facultad y está integrada por alumnas y alumnos interesados en colaborar.",
    quieneslasociedaddealumnos: "Sociedad de alumnos es una agrupación estudiantil encargada de realizar actividades para la Facultad y está integrada por alumnas y alumnos interesados en colaborar.",
    quienesformanlasociedaddealumnos: "Sociedad de alumnos es una agrupación estudiantil encargada de realizar actividades para la Facultad y está integrada por alumnas y alumnos interesados en colaborar.",


    // =========================
    // UBICACIÓN DE LA FACULTAD
    // =========================

    dondeestaderecho: "La Facultad de Derecho de la UADY se encuentra en Mérida, Yucatán. https://www.google.com/maps/place/Facultad+de+Derecho,+Gran+San+Pedro+Cholul,+97305+Yuc./@21.0211342,-89.5583981,17z/data=!3m1!4b1!4m6!3m5!1s0x8f56775d85302a9d:0x47660475084b7594!8m2!3d21.0211342!4d-89.5558232!16s%2Fg%2F11qg0r8_s1?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",
    dondeestalafacultaddederecho: "La Facultad de Derecho de la UADY se encuentra en Mérida, Yucatán. https://www.google.com/maps/place/Facultad+de+Derecho,+Gran+San+Pedro+Cholul,+97305+Yuc./@21.0211342,-89.5583981,17z/data=!3m1!4b1!4m6!3m5!1s0x8f56775d85302a9d:0x47660475084b7594!8m2!3d21.0211342!4d-89.5558232!16s%2Fg%2F11qg0r8_s1?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",
    dondequedaderecho: "La Facultad de Derecho de la UADY se encuentra en Mérida, Yucatán. https://www.google.com/maps/place/Facultad+de+Derecho,+Gran+San+Pedro+Cholul,+97305+Yuc./@21.0211342,-89.5583981,17z/data=!3m1!4b1!4m6!3m5!1s0x8f56775d85302a9d:0x47660475084b7594!8m2!3d21.0211342!4d-89.5558232!16s%2Fg%2F11qg0r8_s1?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",
    dondequedalafacultaddederecho: "La Facultad de Derecho de la UADY se encuentra en Mérida, Yucatán. https://www.google.com/maps/place/Facultad+de+Derecho,+Gran+San+Pedro+Cholul,+97305+Yuc./@21.0211342,-89.5583981,17z/data=!3m1!4b1!4m6!3m5!1s0x8f56775d85302a9d:0x47660475084b7594!8m2!3d21.0211342!4d-89.5558232!16s%2Fg%2F11qg0r8_s1?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",
    dondeestafacultaddederecho: "La Facultad de Derecho de la UADY se encuentra en Mérida, Yucatán. https://www.google.com/maps/place/Facultad+de+Derecho,+Gran+San+Pedro+Cholul,+97305+Yuc./@21.0211342,-89.5583981,17z/data=!3m1!4b1!4m6!3m5!1s0x8f56775d85302a9d:0x47660475084b7594!8m2!3d21.0211342!4d-89.5558232!16s%2Fg%2F11qg0r8_s1?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",
    ubicacionderecho: "La Facultad de Derecho de la UADY se encuentra en Mérida, Yucatán. https://www.google.com/maps/place/Facultad+de+Derecho,+Gran+San+Pedro+Cholul,+97305+Yuc./@21.0211342,-89.5583981,17z/data=!3m1!4b1!4m6!3m5!1s0x8f56775d85302a9d:0x47660475084b7594!8m2!3d21.0211342!4d-89.5558232!16s%2Fg%2F11qg0r8_s1?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",
    ubicaciondelafacultad: "La Facultad de Derecho de la UADY se encuentra en Mérida, Yucatán. https://www.google.com/maps/place/Facultad+de+Derecho,+Gran+San+Pedro+Cholul,+97305+Yuc./@21.0211342,-89.5583981,17z/data=!3m1!4b1!4m6!3m5!1s0x8f56775d85302a9d:0x47660475084b7594!8m2!3d21.0211342!4d-89.5558232!16s%2Fg%2F11qg0r8_s1?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",
    dondeestauniversidaddederecho: "La Facultad de Derecho de la UADY se encuentra en Mérida, Yucatán. https://www.google.com/maps/place/Facultad+de+Derecho,+Gran+San+Pedro+Cholul,+97305+Yuc./@21.0211342,-89.5583981,17z/data=!3m1!4b1!4m6!3m5!1s0x8f56775d85302a9d:0x47660475084b7594!8m2!3d21.0211342!4d-89.5558232!16s%2Fg%2F11qg0r8_s1?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",
    dondeestaescueladederecho: "La Facultad de Derecho de la UADY se encuentra en Mérida, Yucatán. https://www.google.com/maps/place/Facultad+de+Derecho,+Gran+San+Pedro+Cholul,+97305+Yuc./@21.0211342,-89.5583981,17z/data=!3m1!4b1!4m6!3m5!1s0x8f56775d85302a9d:0x47660475084b7594!8m2!3d21.0211342!4d-89.5558232!16s%2Fg%2F11qg0r8_s1?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",

    comollegoaderecho: "Usa la ubicación de Google Maps para encontrar tu mejor ruta. https://www.google.com/maps/place/Facultad+de+Derecho,+Gran+San+Pedro+Cholul,+97305+Yuc./@21.0211342,-89.5583981,17z/data=!3m1!4b1!4m6!3m5!1s0x8f56775d85302a9d:0x47660475084b7594!8m2!3d21.0211342!4d-89.5558232!16s%2Fg%2F11qg0r8_s1?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",
    comollegoalafacultaddederecho: "Usa la ubicación de Google Maps para encontrar tu mejor ruta. https://www.google.com/maps/place/Facultad+de+Derecho,+Gran+San+Pedro+Cholul,+97305+Yuc./@21.0211342,-89.5583981,17z/data=!3m1!4b1!4m6!3m5!1s0x8f56775d85302a9d:0x47660475084b7594!8m2!3d21.0211342!4d-89.5558232!16s%2Fg%2F11qg0r8_s1?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",
    comoiraderecho: "Usa la ubicación de Google Maps para encontrar tu mejor ruta. https://www.google.com/maps/place/Facultad+de+Derecho,+Gran+San+Pedro+Cholul,+97305+Yuc./@21.0211342,-89.5583981,17z/data=!3m1!4b1!4m6!3m5!1s0x8f56775d85302a9d:0x47660475084b7594!8m2!3d21.0211342!4d-89.5558232!16s%2Fg%2F11qg0r8_s1?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",
    comoiralfacultaddederecho: "Usa la ubicación de Google Maps para encontrar tu mejor ruta. https://www.google.com/maps/place/Facultad+de+Derecho,+Gran+San+Pedro+Cholul,+97305+Yuc./@21.0211342,-89.5583981,17z/data=!3m1!4b1!4m6!3m5!1s0x8f56775d85302a9d:0x47660475084b7594!8m2!3d21.0211342!4d-89.5558232!16s%2Fg%2F11qg0r8_s1?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",
    comollegoalafacultad: "Usa la ubicación de Google Maps para encontrar tu mejor ruta. https://www.google.com/maps/place/Facultad+de+Derecho,+Gran+San+Pedro+Cholul,+97305+Yuc./@21.0211342,-89.5583981,17z/data=!3m1!4b1!4m6!3m5!1s0x8f56775d85302a9d:0x47660475084b7594!8m2!3d21.0211342!4d-89.5558232!16s%2Fg%2F11qg0r8_s1?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",
    rutaalafacultad: "Usa la ubicación de Google Maps para encontrar tu mejor ruta. https://www.google.com/maps/place/Facultad+de+Derecho,+Gran+San+Pedro+Cholul,+97305+Yuc./@21.0211342,-89.5583981,17z/data=!3m1!4b1!4m6!3m5!1s0x8f56775d85302a9d:0x47660475084b7594!8m2!3d21.0211342!4d-89.5558232!16s%2Fg%2F11qg0r8_s1?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",


    // =========================
    // TELÉFONOS Y CORREOS
    // =========================

    cualeseltelefonodelafacultad: "La Secretaría Académica maneja el teléfono 99 9448 6532, extensión 72105.",
    telefonodelafacultad: "La Secretaría Académica maneja el teléfono 99 9448 6532, extensión 72105.",
    telefonofacultaddederecho: "La Secretaría Académica maneja el teléfono 99 9448 6532, extensión 72105.",
    cualestelefonodelafacultad: "La Secretaría Académica maneja el teléfono 99 9448 6532, extensión 72105.",
    numerodelafacultad: "La Secretaría Académica maneja el teléfono 99 9448 6532, extensión 72105.",
    numerodetelefonodelafacultad: "La Secretaría Académica maneja el teléfono 99 9448 6532, extensión 72105.",
    comocontactoalafacultad: "La Secretaría Académica maneja el teléfono 99 9448 6532, extensión 72105.",

    cualeselcorreodesecretariaacademica: "El correo de Secretaría Académica es academica.derecho@correo.uady.mx.",
    correodesecretariaacademica: "El correo de Secretaría Académica es academica.derecho@correo.uady.mx.",
    emaildesecretariaacademica: "El correo de Secretaría Académica es academica.derecho@correo.uady.mx.",
    correosecretariaacademica: "El correo de Secretaría Académica es academica.derecho@correo.uady.mx.",
    comocontactoasecretariaacademica: "El correo de Secretaría Académica es academica.derecho@correo.uady.mx.",

    cualeselcorreodecontrolescolar: "El correo de Control Escolar es cescolar.derecho@alumnos.uady.mx.",
    correodecontrolescolar: "El correo de Control Escolar es cescolar.derecho@alumnos.uady.mx.",
    correocontrolescolar: "El correo de Control Escolar es cescolar.derecho@alumnos.uady.mx.",
    emaildecontrolescolar: "El correo de Control Escolar es cescolar.derecho@alumnos.uady.mx.",
    comocontactoacontrolescolar: "El correo de Control Escolar es cescolar.derecho@alumnos.uady.mx.",

    cualeseltelefonodecontrolescolar: "El teléfono de Control Escolar es 99 9982 5876, extensión 72114.",
    telefonodecontrolescolar: "El teléfono de Control Escolar es 99 9982 5876, extensión 72114.",
    telefonocontrolescolar: "El teléfono de Control Escolar es 99 9982 5876, extensión 72114.",
    numerodecontrolescolar: "El teléfono de Control Escolar es 99 9982 5876, extensión 72114.",
    comollamoacontrolescolar: "El teléfono de Control Escolar es 99 9982 5876, extensión 72114.",

    cualeselcorreodesecretariaadministrativa: "El correo de Secretaría Administrativa es administrativa.derecho@correo.uady.mx.",
    correosecretariaadministrativa: "El correo de Secretaría Administrativa es administrativa.derecho@correo.uady.mx.",
    correodesecretariaadministrativa: "El correo de Secretaría Administrativa es administrativa.derecho@correo.uady.mx.",
    emaildesecretariaadministrativa: "El correo de Secretaría Administrativa es administrativa.derecho@correo.uady.mx.",
    comocontactoasecretariaadministrativa: "El correo de Secretaría Administrativa es administrativa.derecho@correo.uady.mx.",


    // =========================
    // HORARIOS
    // =========================

    horariocontrolescolar: "Usualmente de lunes a viernes de 9:00 a 16:30 horas.",
    cualeselhorariodecontrolescolar: "Usualmente de lunes a viernes de 9:00 a 16:30 horas.",
    horariodecontrolescolar: "Usualmente de lunes a viernes de 9:00 a 16:30 horas.",
    aqueshoraabrecontrolescolar: "Usualmente de lunes a viernes de 9:00 a 16:30 horas.",
    aqueshoracontrolescolar: "Usualmente de lunes a viernes de 9:00 a 16:30 horas.",
    cuandoabrecontrolescolar: "Usualmente de lunes a viernes de 9:00 a 16:30 horas.",
    cuandoatiendecontrolescolar: "Usualmente de lunes a viernes de 9:00 a 16:30 horas.",
    quediasabrecontrolescolar: "Usualmente de lunes a viernes de 9:00 a 16:30 horas.",

    cualeselhorariodesecretariaadministrativa: "Lunes a viernes, de 8:00 a 16:00 horas.",
    horariosecretariaadministrativa: "Lunes a viernes, de 8:00 a 16:00 horas.",
    horariodesecretariaadministrativa: "Lunes a viernes, de 8:00 a 16:00 horas.",
    aqueshoraabresecretariaadministrativa: "Lunes a viernes, de 8:00 a 16:00 horas.",
    aqueshorasecretariaadministrativa: "Lunes a viernes, de 8:00 a 16:00 horas.",
    cuandoatiendesecretariaadministrativa: "Lunes a viernes, de 8:00 a 16:00 horas.",


    // =========================
    // UBICACIÓN DE CONTROL ESCOLAR
    // =========================

    dondeestacontrolescolar: "Se encuentra en el Departamento de Control Escolar de la Facultad; los trámites presenciales publicados se realizan ahí y se encuentra en la lateral de la explanada.",
    dondeseencuentracontrolescolar: "Se encuentra en el Departamento de Control Escolar de la Facultad; los trámites presenciales publicados se realizan ahí y se encuentra en la lateral de la explanada.",
    dondeencuentrocontrolescolar: "Se encuentra en el Departamento de Control Escolar de la Facultad; los trámites presenciales publicados se realizan ahí y se encuentra en la lateral de la explanada.",
    dondequedacontrolescolar: "Se encuentra en el Departamento de Control Escolar de la Facultad; los trámites presenciales publicados se realizan ahí y se encuentra en la lateral de la explanada.",
    ubicacioncontrolescolar: "Se encuentra en el Departamento de Control Escolar de la Facultad; los trámites presenciales publicados se realizan ahí y se encuentra en la lateral de la explanada.",
    dondeestaelcontroldeestudiantes: "Se encuentra en el Departamento de Control Escolar de la Facultad; los trámites presenciales publicados se realizan ahí y se encuentra en la lateral de la explanada.",
    dondehagotramitesescolares: "Se encuentra en el Departamento de Control Escolar de la Facultad; los trámites presenciales publicados se realizan ahí y se encuentra en la lateral de la explanada.",
    dondehagotramites: "Control Escolar atiende los trámites escolares correspondientes en la Facultad.",


    // =========================
    // UBICACIÓN SECRETARÍA ADMINISTRATIVA
    // =========================

    dondeestasecretariaadministrativa: "La Secretaría Administrativa se encuentra en las instalaciones de la Facultad de Derecho, en la planta baja, a un lado de Control Escolar.",
    dondeseencuentrasecretariaadministrativa: "La Secretaría Administrativa se encuentra en las instalaciones de la Facultad de Derecho, en la planta baja, a un lado de Control Escolar.",
    dondeencuentrosecretariaadministrativa: "La Secretaría Administrativa se encuentra en las instalaciones de la Facultad de Derecho, en la planta baja, a un lado de Control Escolar.",
    ubicacionsecretariaadministrativa: "La Secretaría Administrativa se encuentra en las instalaciones de la Facultad de Derecho, en la planta baja, a un lado de Control Escolar.",
    dondequedasecretariaadministrativa: "La Secretaría Administrativa se encuentra en las instalaciones de la Facultad de Derecho, en la planta baja, a un lado de Control Escolar.",
    dondeestaadministracion: "La Secretaría Administrativa se encuentra en las instalaciones de la Facultad de Derecho, en la planta baja, a un lado de Control Escolar.",
    dondequedaadministracion: "La Secretaría Administrativa se encuentra en las instalaciones de la Facultad de Derecho, en la planta baja, a un lado de Control Escolar.",


    // =========================
    // UBICACIÓN SECRETARÍA ACADÉMICA
    // =========================

    dondeestasecretariaacademica: "La Secretaría Académica se encuentra en las instalaciones de la Facultad de Derecho, en el segundo piso, a un lado de la Dirección.",
    dondeseencuentrasecretariaacademica: "La Secretaría Académica se encuentra en las instalaciones de la Facultad de Derecho, en el segundo piso, a un lado de la Dirección.",
    dondeencuentrosecretariaacademica: "La Secretaría Académica se encuentra en las instalaciones de la Facultad de Derecho, en el segundo piso, a un lado de la Dirección.",
    ubicacionsecretariaacademica: "La Secretaría Académica se encuentra en las instalaciones de la Facultad de Derecho, en el segundo piso, a un lado de la Dirección.",
    dondequedasecretariaacademica: "La Secretaría Académica se encuentra en las instalaciones de la Facultad de Derecho, en el segundo piso, a un lado de la Dirección.",
    dondeestaacademica: "La Secretaría Académica se encuentra en las instalaciones de la Facultad de Derecho, en el segundo piso, a un lado de la Dirección.",


    // =========================
    // BIBLIOTECA
    // =========================

    dondeestalabiblioteca: "La biblioteca se encuentra a un lado del pasillo que lleva a la Facultad de Educación, saliendo de la Facultad de Derecho. Tiene atención de 8:30 a 21:00 horas.",
    dondeencuentrolabiblioteca: "La biblioteca se encuentra a un lado del pasillo que lleva a la Facultad de Educación, saliendo de la Facultad de Derecho. Tiene atención de 8:30 a 21:00 horas.",
    dondeseencuentralabiblioteca: "La biblioteca se encuentra a un lado del pasillo que lleva a la Facultad de Educación, saliendo de la Facultad de Derecho. Tiene atención de 8:30 a 21:00 horas.",
    dondequedalabiblioteca: "La biblioteca se encuentra a un lado del pasillo que lleva a la Facultad de Educación, saliendo de la Facultad de Derecho. Tiene atención de 8:30 a 21:00 horas.",
    ubicacionbiblioteca: "La biblioteca se encuentra a un lado del pasillo que lleva a la Facultad de Educación, saliendo de la Facultad de Derecho. Tiene atención de 8:30 a 21:00 horas.",
    dondeestabiblioteca: "La biblioteca se encuentra a un lado del pasillo que lleva a la Facultad de Educación, saliendo de la Facultad de Derecho. Tiene atención de 8:30 a 21:00 horas.",
    dondepuedoencontrarlabiblioteca: "La biblioteca se encuentra a un lado del pasillo que lleva a la Facultad de Educación, saliendo de la Facultad de Derecho. Tiene atención de 8:30 a 21:00 horas.",
    horariodelabiblioteca: "La biblioteca tiene atención de 8:30 a 21:00 horas.",
    aqueshoraabrelabiblioteca: "La biblioteca tiene atención de 8:30 a 21:00 horas.",
    aqueshoracierralabiblioteca: "La biblioteca tiene atención de 8:30 a 21:00 horas.",


    // =========================
    // SALONES
    // =========================

    salones: "El edificio completo de la Facultad tiene salones que se van ubicando por nombres con número y letra o, en su caso, son nombrados con carteles como el “Salón de Banderas”.",
    dondeestanlossalones: "El edificio completo de la Facultad tiene salones que se van ubicando por nombres con número y letra o, en su caso, son nombrados con carteles como el “Salón de Banderas”.",
    dondeestanlossalones: "El edificio completo de la Facultad tiene salones que se van ubicando por nombres con número y letra o, en su caso, son nombrados con carteles como el “Salón de Banderas”.",
    dondequedanalossalones: "El edificio completo de la Facultad tiene salones que se van ubicando por nombres con número y letra o, en su caso, son nombrados con carteles como el “Salón de Banderas”.",
    dondeencuentrolossalones: "El edificio completo de la Facultad tiene salones que se van ubicando por nombres con número y letra o, en su caso, son nombrados con carteles como el “Salón de Banderas”.",
    comoestanidentificadoslossalones: "Los salones están identificados mediante números, letras o nombres colocados en carteles.",
    comoidentificomisalon: "Los salones están identificados mediante números, letras o nombres colocados en carteles.",
    comoencuentromisalon: "Los salones están identificados mediante números, letras o nombres colocados en carteles.",
    dondeestamisalon: "No puedo apoyarte con la ubicación exacta de un salón específico. Sin embargo, los salones están marcados por número, letra o nombre.",
    dondeestaelsalon: "Los salones están identificados mediante números, letras o nombres colocados en carteles.",
    comoencuentroelsalon: "Los salones están identificados mediante números, letras o nombres colocados en carteles.",


    // =========================
    // BAÑOS
    // =========================

    // agregar el ".... puedo ir "
    baños: "En cada piso están los baños en la lateral de cada escalera.",
    banos: "En cada piso están los baños en la lateral de cada escalera.",
    dondeestanlosbaños: "En cada piso están los baños en la lateral de cada escalera.",
    dondeestanlosbanos: "En cada piso están los baños en la lateral de cada escalera.",
    dondequedanlosbaños: "En cada piso están los baños en la lateral de cada escalera.",
    dondequedanlosbanos: "En cada piso están los baños en la lateral de cada escalera.",
    dondeencuentrolosbaños: "En cada piso están los baños en la lateral de cada escalera.",
    dondeencuentrolosbanos: "En cada piso están los baños en la lateral de cada escalera.",
    haybañosenlafacultad: "Sí. En cada piso están los baños en la lateral de cada escalera.",
    haybanosenlafacultad: "Sí. En cada piso están los baños en la lateral de cada escalera.",


    // =========================
    // ESTUDIAR
    // =========================

    dondeestudiar: "La Facultad cuenta con espacios destinados a la actividad académica, como la cafetería, el espacio de estudios con una biblioteca comunitaria y el área verde que cuenta con sillas para el alumnado.",
    dondepuedoestudiar: "La Facultad cuenta con espacios destinados a la actividad académica, como la cafetería, el espacio de estudios con una biblioteca comunitaria y el área verde que cuenta con sillas para el alumnado.",
    dondeestudio: "La Facultad cuenta con espacios destinados a la actividad académica, como la cafetería, el espacio de estudios con una biblioteca comunitaria y el área verde que cuenta con sillas para el alumnado.",
    dondepuedoirmeaestudiar: "La Facultad cuenta con espacios destinados a la actividad académica, como la cafetería, el espacio de estudios con una biblioteca comunitaria y el área verde que cuenta con sillas para el alumnado.",
    dondepuedoestudiarenlafacultad: "La Facultad cuenta con espacios destinados a la actividad académica, como la cafetería, el espacio de estudios con una biblioteca comunitaria y el área verde que cuenta con sillas para el alumnado.",
    haylugaresparaestudiar: "Sí. La Facultad cuenta con espacios destinados a la actividad académica, como la cafetería, el espacio de estudios con una biblioteca comunitaria y el área verde que cuenta con sillas para el alumnado.",
    haydondeestudiar: "Sí. La Facultad cuenta con espacios destinados a la actividad académica, como la cafetería, el espacio de estudios con una biblioteca comunitaria y el área verde que cuenta con sillas para el alumnado.",
    centrodeestudio: "La Facultad cuenta con espacios destinados a la actividad académica, como la cafetería, el espacio de estudios con una biblioteca comunitaria y el área verde que cuenta con sillas para el alumnado.",
    centroparaestudiar: "La Facultad cuenta con espacios destinados a la actividad académica, como la cafetería, el espacio de estudios con una biblioteca comunitaria y el área verde que cuenta con sillas para el alumnado.",
    lugarparaestudiar: "La Facultad cuenta con espacios destinados a la actividad académica, como la cafetería, el espacio de estudios con una biblioteca comunitaria y el área verde que cuenta con sillas para el alumnado.",


    // =========================
    // IMPRESIONES Y COPIAS
    // =========================

    impresiones: "La Facultad cuenta con una papelería que se encuentra en prefectura, pero en caso de no estar abierta el salón de cómputo también ofrece este servicio.",
    dondepuedoimprimir: "La Facultad cuenta con una papelería que se encuentra en prefectura, pero en caso de no estar abierta el salón de cómputo también ofrece este servicio.",
    dondeimprimir: "La Facultad cuenta con una papelería que se encuentra en prefectura, pero en caso de no estar abierta el salón de cómputo también ofrece este servicio.",
    dondepuedosacarimpresiones: "La Facultad cuenta con una papelería que se encuentra en prefectura, pero en caso de no estar abierta el salón de cómputo también ofrece este servicio.",
    dondeimprimirdocumentos: "La Facultad cuenta con una papelería que se encuentra en prefectura, pero en caso de no estar abierta el salón de cómputo también ofrece este servicio.",
    dondeimprimirundocumento: "La Facultad cuenta con una papelería que se encuentra en prefectura, pero en caso de no estar abierta el salón de cómputo también ofrece este servicio.",
    dondepuedohacerimpresiones: "La Facultad cuenta con una papelería que se encuentra en prefectura, pero en caso de no estar abierta el salón de cómputo también ofrece este servicio.",
    haydondeimprimir: "Sí. La Facultad cuenta con una papelería en prefectura y, en caso de no estar abierta, el salón de cómputo también ofrece este servicio.",

    copias: "La Facultad cuenta con una papelería que se encuentra en prefectura, pero en caso de no estar abierta el salón de cómputo también ofrece este servicio.",
    copas: "La Facultad cuenta con una papelería que se encuentra en prefectura, pero en caso de no estar abierta el salón de cómputo también ofrece este servicio.",
    dondecopias: "La Facultad cuenta con una papelería que se encuentra en prefectura, pero en caso de no estar abierta el salón de cómputo también ofrece este servicio.",
    dondesacarcopias: "La Facultad cuenta con una papelería que se encuentra en prefectura, pero en caso de no estar abierta el salón de cómputo también ofrece este servicio.",
    dondehagocopias: "La Facultad cuenta con una papelería que se encuentra en prefectura, pero en caso de no estar abierta el salón de cómputo también ofrece este servicio.",
    dondepuedosacarcopias: "La Facultad cuenta con una papelería que se encuentra en prefectura, pero en caso de no estar abierta el salón de cómputo también ofrece este servicio.",
    haydondehacercopias: "Sí. La Facultad cuenta con una papelería en prefectura y, en caso de no estar abierta, el salón de cómputo también ofrece este servicio.",


    // =========================
    // AUDITORIO
    // =========================

    dondeestaelauditorio: "El auditorio se encuentra cerca del área verde y tiene un letrero en la puerta.",
    auditorio: "El auditorio se encuentra cerca del área verde y tiene un letrero en la puerta.",
    dondeauditorio: "El auditorio se encuentra cerca del área verde y tiene un letrero en la puerta.",
    dondequedaelauditorio: "El auditorio se encuentra cerca del área verde y tiene un letrero en la puerta.",
    dondeencuentroelauditorio: "El auditorio se encuentra cerca del área verde y tiene un letrero en la puerta.",
    ubicaciondelauditorio: "El auditorio se encuentra cerca del área verde y tiene un letrero en la puerta.",
    comoencuentroelauditorio: "El auditorio se encuentra cerca del área verde y tiene un letrero en la puerta.",


    // =========================
    // AUTORIDADES
    // =========================

    // variacion de director
    directora: "La directora de la Facultad es la Dra. María Minerva Zapata Denis.",
    quienesladirectora: "La directora de la Facultad es la Dra. María Minerva Zapata Denis.",
    directorafacultaddederecho: "La directora de la Facultad es la Dra. María Minerva Zapata Denis.",
    directoradederecho: "La directora de la Facultad es la Dra. María Minerva Zapata Denis.",
    quienesladirectoradederecho: "La directora de la Facultad es la Dra. María Minerva Zapata Denis.",
    quienestáalfrentedelafacultad: "La directora de la Facultad es la Dra. María Minerva Zapata Denis.",
    quienestacargodelafacultad: "La directora de la Facultad es la Dra. María Minerva Zapata Denis.",
    quiendirigelafacultad: "La directora de la Facultad es la Dra. María Minerva Zapata Denis.",

    secretarioacademico: "El Dr. Stephen Javier Urbina Rodríguez.",
    quieneselsecretarioacademico: "El Dr. Stephen Javier Urbina Rodríguez.",
    secretarioacademicadederecho: "El Dr. Stephen Javier Urbina Rodríguez.",
    secretarioacademicodelafacultad: "El Dr. Stephen Javier Urbina Rodríguez.",
    secretarioacademicodelafacultaddederecho: "El Dr. Stephen Javier Urbina Rodríguez.",
    quienestasecretarioacademico: "El Dr. Stephen Javier Urbina Rodríguez.",
    quieneselsecretarioacademico: "El Dr. Stephen Javier Urbina Rodríguez.",
    quienestaacargodesecretariaacademica: "El Dr. Stephen Javier Urbina Rodríguez.",

    secretaríaadministrativa: "La Mtra. Liliana Rivero Vallado.",
    secretariaadministrativa: "La Mtra. Liliana Rivero Vallado.",
    quienessecretariaadministrativa: "La Mtra. Liliana Rivero Vallado.",
    quieneslasecretariaadministrativa: "La Mtra. Liliana Rivero Vallado.",
    quienestasecretariaadministrativa: "La Mtra. Liliana Rivero Vallado.",
    quienestaacargodesecretariaadministrativa: "La Mtra. Liliana Rivero Vallado.",
    secretariaadministrativadederecho: "La Mtra. Liliana Rivero Vallado.",
    secretariaadministrativadelafacultad: "La Mtra. Liliana Rivero Vallado.",

    quiencoordinaposgradoeinvestigacion: "El Mtro. Mario A. Cardeña Lara.",
    quiencoordinaposgrado: "El Mtro. Mario A. Cardeña Lara.",
    quiencoordinalainvestigacion: "El Mtro. Mario A. Cardeña Lara.",
    quienestacargodeposgrado: "El Mtro. Mario A. Cardeña Lara.",
    quienestacargodeinvestigacion: "El Mtro. Mario A. Cardeña Lara.",
    coordinadordeposgrado: "El Mtro. Mario A. Cardeña Lara.",
    coordinadordeinvestigacion: "El Mtro. Mario A. Cardeña Lara.",
    posgrado: "El Mtro. Mario A. Cardeña Lara es quien coordina esta área.",
    investigacion: "El Mtro. Mario A. Cardeña Lara es quien coordina esta área.",
    quienllevaelposgrado: "El Mtro. Mario A. Cardeña Lara es quien coordina esta área.",

    quiencoordinatutorias: "La Dra. Xóchitl Aline Mézquita Leana.",
    quieneslacoordinadoradetutorias: "La Dra. Xóchitl Aline Mézquita Leana.",
    quienllevalastutorias: "La Dra. Xóchitl Aline Mézquita Leana.",
    quienestacargodetutorias: "La Dra. Xóchitl Aline Mézquita Leana.",
    quienseencargadetutorias: "La Dra. Xóchitl Aline Mézquita Leana.",
    quiendirigetutorias: "La Dra. Xóchitl Aline Mézquita Leana.",
    quiendirigelastutorias: "La Dra. Xóchitl Aline Mézquita Leana.",
    tutorias: "La Dra. Xóchitl Aline Mézquita Leana es quien coordina esta área.",
    coordinatutorias: "La Dra. Xóchitl Aline Mézquita Leana es quien coordina esta área.",


    // =========================
    // BUFETE JURÍDICO
    // =========================

    bufetejuridico: "La Dra. Pilar Ventura Martínez aparece como coordinadora del Bufete Gratuito. También aparece el Dr. Jorge Armando Parra Dáger como coordinador adjunto.",
    bufetegratuito: "La Dra. Pilar Ventura Martínez aparece como coordinadora del Bufete Gratuito. También aparece el Dr. Jorge Armando Parra Dáger como coordinador adjunto.",
    quiencoordinaelbufetejuridico: "La Dra. Pilar Ventura Martínez aparece como coordinadora del Bufete Gratuito. También aparece el Dr. Jorge Armando Parra Dáger como coordinador adjunto.",
    quiendirigeelbufetejuridico: "La Dra. Pilar Ventura Martínez aparece como coordinadora del Bufete Gratuito. También aparece el Dr. Jorge Armando Parra Dáger como coordinador adjunto.",
    directordelbufetejuridico: "La Dra. Pilar Ventura Martínez aparece como coordinadora del Bufete Gratuito. También aparece el Dr. Jorge Armando Parra Dáger como coordinador adjunto.",
    directoradelbufetejuridico: "La Dra. Pilar Ventura Martínez aparece como coordinadora del Bufete Gratuito. También aparece el Dr. Jorge Armando Parra Dáger como coordinador adjunto.",
    quienestaacargodelbufete: "La Dra. Pilar Ventura Martínez aparece como coordinadora del Bufete Gratuito. También aparece el Dr. Jorge Armando Parra Dáger como coordinador adjunto.",
    quienllevaelbufete: "La Dra. Pilar Ventura Martínez aparece como coordinadora del Bufete Gratuito. También aparece el Dr. Jorge Armando Parra Dáger como coordinador adjunto.",


    // =========================
    // CONTACTAR PROFESORES
    // =========================

    contactarprofesor: "La vía oficial de comunicación es a través del correo institucional del profesor, con formato ....@correo.uady.mx.",
    contactarmaestro: "La vía oficial de comunicación es a través del correo institucional del profesor, con formato ....@correo.uady.mx.",
    puedocontactardirectamenteaunprofesor: "La vía oficial de comunicación es a través del correo institucional del profesor, con formato ....@correo.uady.mx.",
    puedohablardirectamenteaunprofesor: "La vía oficial de comunicación es a través del correo institucional del profesor, con formato ....@correo.uady.mx.",
    puedocontactardirectamenteaunmaestro: "La vía oficial de comunicación es a través del correo institucional del profesor, con formato ....@correo.uady.mx.",
    puedohablardirectamenteaunmaestro: "La vía oficial de comunicación es a través del correo institucional del profesor, con formato ....@correo.uady.mx.",
    comocontactoamiprofesor: "La vía oficial de comunicación es a través del correo institucional del profesor, con formato ....@correo.uady.mx.",
    comocontactoamimaestro: "La vía oficial de comunicación es a través del correo institucional del profesor, con formato ....@correo.uady.mx.",
    comocontactoaunprofesor: "La vía oficial de comunicación es a través del correo institucional del profesor, con formato ....@correo.uady.mx.",
    comohablaconunprofesor: "La vía oficial de comunicación es a través del correo institucional del profesor, con formato ....@correo.uady.mx.",
    puedohablarconunprofesor: "La vía oficial de comunicación es a través del correo institucional del profesor, con formato ....@correo.uady.mx.",


    // =========================
    // PROBLEMAS ACADÉMICOS
    // =========================

    asuntosacademicos: "Si tienes un asunto académico, puedes acudir a Secretaría Académica o Tutorías, dependiendo del tipo de situación.",
    situacionesacademicas: "Si tienes un asunto académico, puedes acudir a Secretaría Académica o Tutorías, dependiendo del tipo de situación.",
    situacionacademica: "Si tienes un asunto académico, puedes acudir a Secretaría Académica o Tutorías, dependiendo del tipo de situación.",
    problemaacademico: "Si tienes un problema académico, puedes acudir a Secretaría Académica o Tutorías, dependiendo del tipo de situación.",
    problemasacademicos: "Si tienes un problema académico, puedes acudir a Secretaría Académica o Tutorías, dependiendo del tipo de situación.",
    dondepreguntoporasuntosacademicos: "Si tienes un asunto académico, puedes acudir a Secretaría Académica o Tutorías, dependiendo del tipo de situación.",
    dondeatiendenasuntosacademicos: "Si tienes un asunto académico, puedes acudir a Secretaría Académica o Tutorías, dependiendo del tipo de situación.",


    // =========================
    // PAGOS Y DOCUMENTOS
    // =========================

    pagos: "En Secretaría Administrativa o Control Escolar, según el trámite.",
    documentosadministrativos: "En Secretaría Administrativa o Control Escolar, según el trámite.",
    pagosadministrativos: "En Secretaría Administrativa o Control Escolar, según el trámite.",
    dondepreguntoporpagos: "En Secretaría Administrativa o Control Escolar, según el trámite.",
    dondepreguntoporpagosodocumentosadministrativos: "En Secretaría Administrativa o Control Escolar, según el trámite.",
    dondepreguntopordocumentos: "En Secretaría Administrativa o Control Escolar, según el trámite.",
    dondehagodocumentosadministrativos: "En Secretaría Administrativa o Control Escolar, según el trámite.",
    dondehagogestionesadministrativas: "En Secretaría Administrativa o Control Escolar, según el trámite.",
    dondepreguntoportrámitesadministrativos: "En Secretaría Administrativa o Control Escolar, según el trámite.",
    aquienpreguntoporpagos: "En Secretaría Administrativa o Control Escolar, según el trámite.",


    // =========================
    // DURACIÓN DE LA CARRERA
    // =========================

    duraciondelacarreradederecho: "La Licenciatura en Derecho tiene una duración de entre 9 y 10 semestres, dependiendo del plan de estudios con el cual hayas ingresado.",
    duraderecho: "La Licenciatura en Derecho tiene una duración de entre 9 y 10 semestres, dependiendo del plan de estudios con el cual hayas ingresado.",
    carreradederecho: "La Licenciatura en Derecho tiene una duración de entre 9 y 10 semestres, dependiendo del plan de estudios con el cual hayas ingresado.",
    cuantoduralacarreradederecho: "La Licenciatura en Derecho tiene una duración de entre 9 y 10 semestres, dependiendo del plan de estudios con el cual hayas ingresado.",
    cuantossemestresdura: "La Licenciatura en Derecho tiene una duración de entre 9 y 10 semestres, dependiendo del plan de estudios con el cual hayas ingresado.",
    cuantossemestrestienederecho: "La Licenciatura en Derecho tiene una duración de entre 9 y 10 semestres, dependiendo del plan de estudios con el cual hayas ingresado.",
    cuantosanosduraelderecho: "La Licenciatura en Derecho tiene una duración de entre 9 y 10 semestres, dependiendo del plan de estudios con el cual hayas ingresado.",
    cuantosanossondederecho: "La Licenciatura en Derecho tiene una duración de entre 9 y 10 semestres, dependiendo del plan de estudios con el cual hayas ingresado.",
    encuantossemestresterminoderecho: "La Licenciatura en Derecho tiene una duración de entre 9 y 10 semestres, dependiendo del plan de estudios con el cual hayas ingresado.",


    // =========================
    // TÍTULO Y PLAN DE ESTUDIOS
    // =========================

    quetituloobtengo: "La información del nuevo plan indica que el título será de Licenciado o Licenciada en Derecho.",
    cualestituloobtengo: "La información del nuevo plan indica que el título será de Licenciado o Licenciada en Derecho.",
    quetitulorecibo: "La información del nuevo plan indica que el título será de Licenciado o Licenciada en Derecho.",
    quegradoobtengo: "La información del nuevo plan indica que el título será de Licenciado o Licenciada en Derecho.",
    quegradoacademicoobtengo: "La información del nuevo plan indica que el título será de Licenciado o Licenciada en Derecho.",
    comoeseltitulo: "La información del nuevo plan indica que el título será de Licenciado o Licenciada en Derecho.",
    quevoyasertitulado: "La información del nuevo plan indica que el título será de Licenciado o Licenciada en Derecho.",

    cuantoscreditostienelacarrera: "El plan publicado contempla 400 créditos.",
    cuantoscreditostiene: "El plan publicado contempla 400 créditos.",
    cuantoscreditosson: "El plan publicado contempla 400 créditos.",
    cuantoscreditosnecesito: "El plan publicado contempla 400 créditos.",
    cuantoscreditosnecesitoparagraduarme: "El plan publicado contempla 400 créditos.",
    cuantoscreditosnecesitoparaterminar: "El plan publicado contempla 400 créditos.",
    cuantoscreditostieneelderecho: "El plan publicado contempla 400 créditos.",
    creditosdelacarrera: "El plan publicado contempla 400 créditos.",
    creditosdelacarreradederecho: "El plan publicado contempla 400 créditos.",

    quetiposdeasignaturasexisten: "Existen asignaturas institucionales, obligatorias disciplinares/profesionalizantes, optativas, libres, además de práctica profesional y servicio social.",
    quetiposdemateriasexisten: "Existen asignaturas institucionales, obligatorias disciplinares/profesionalizantes, optativas, libres, además de práctica profesional y servicio social.",
    quetiposdemateriashay: "Existen asignaturas institucionales, obligatorias disciplinares/profesionalizantes, optativas, libres, además de práctica profesional y servicio social.",
    comosedividenlasasignaturas: "Existen asignaturas institucionales, obligatorias disciplinares/profesionalizantes, optativas, libres, además de práctica profesional y servicio social.",
    comosedividenlasmaterias: "Existen asignaturas institucionales, obligatorias disciplinares/profesionalizantes, optativas, libres, además de práctica profesional y servicio social.",
    cualeslostiposdematerias: "Existen asignaturas institucionales, obligatorias disciplinares/profesionalizantes, optativas, libres, además de práctica profesional y servicio social.",

    enquehorarioseestudia: "Los primeros cuatro semestres se imparten por la mañana y los seis restantes por la tarde, según la información general publicada.",
    cualeseselhorariodelacarrera: "Los primeros cuatro semestres se imparten por la mañana y los seis restantes por la tarde, según la información general publicada.",
    cualeseselhorariodederecho: "Los primeros cuatro semestres se imparten por la mañana y los seis restantes por la tarde, según la información general publicada.",
    aqueshoraestudian: "Los primeros cuatro semestres se imparten por la mañana y los seis restantes por la tarde, según la información general publicada.",
    enquehorarioestanlasclases: "Los primeros cuatro semestres se imparten por la mañana y los seis restantes por la tarde, según la información general publicada.",
    cuandoestudio: "Los primeros cuatro semestres se imparten por la mañana y los seis restantes por la tarde, según la información general publicada.",

    necesitoingles: "Sí. El plan publicado establece acreditar B1 de inglés para poder inscribirse al séptimo semestre.",
    necesitorelestudiaringles: "Sí. El plan publicado establece acreditar B1 de inglés para poder inscribirse al séptimo semestre.",
    esnecesarioelingles: "Sí. El plan publicado establece acreditar B1 de inglés para poder inscribirse al séptimo semestre.",
    necesitohablareingles: "Sí. El plan publicado establece acreditar B1 de inglés para poder inscribirse al séptimo semestre.",
    necesitoinglesparaderecho: "Sí. El plan publicado establece acreditar B1 de inglés para poder inscribirse al séptimo semestre.",
    hayqueacreditaringles: "Sí. El plan publicado establece acreditar B1 de inglés para poder inscribirse al séptimo semestre.",
    hayquepresentaringles: "Sí. El plan publicado establece acreditar B1 de inglés para poder inscribirse al séptimo semestre.",

    queniveldeinglesnecesito: "El nivel de inglés requerido es B1, conforme al Marco Común Europeo de Referencia.",
    queniveldeinglespiden: "El nivel de inglés requerido es B1, conforme al Marco Común Europeo de Referencia.",
    queniveldeboacreditar: "El nivel de inglés requerido es B1, conforme al Marco Común Europeo de Referencia.",
    queniveldeinglesdebotener: "El nivel de inglés requerido es B1, conforme al Marco Común Europeo de Referencia.",
    queinglesnecesito: "El nivel de inglés requerido es B1, conforme al Marco Común Europeo de Referencia.",
    necesitoelb1: "El nivel de inglés requerido es B1, conforme al Marco Común Europeo de Referencia.",
    cualniveldeingles: "El nivel de inglés requerido es B1, conforme al Marco Común Europeo de Referencia.",

    cuandoacreditoelb1: "Debes acreditar el nivel B1 de inglés para poder inscribirte al séptimo semestre.",
    cuandoesnecesarioelb1: "Debes acreditar el nivel B1 de inglés para poder inscribirte al séptimo semestre.",
    enquesemestrenecesitoelb1: "Debes acreditar el nivel B1 de inglés para poder inscribirte al séptimo semestre.",
    cuandohayquepresentarelingles: "Debes acreditar el nivel B1 de inglés para poder inscribirte al séptimo semestre.",
    cuandodebotenerelb1: "Debes acreditar el nivel B1 de inglés para poder inscribirte al séptimo semestre.",

    puedohacermovilidad: "Sí. El plan contempla movilidad estudiantil que la Facultad va publicando, dependiendo de los convenios que vayan saliendo.",
    puedohacermovilidadestudiantil: "Sí. El plan contempla movilidad estudiantil que la Facultad va publicando, dependiendo de los convenios que vayan saliendo.",
    haymovilidad: "Sí. El plan contempla movilidad estudiantil que la Facultad va publicando, dependiendo de los convenios que vayan saliendo.",
    puedoirmeaintercambio: "Sí. El plan contempla movilidad estudiantil que la Facultad va publicando, dependiendo de los convenios que vayan saliendo.",
    puedohacerintercambio: "Sí. El plan contempla movilidad estudiantil que la Facultad va publicando, dependiendo de los convenios que vayan saliendo.",
    puedohacerunintercambio: "Sí. El plan contempla movilidad estudiantil que la Facultad va publicando, dependiendo de los convenios que vayan saliendo.",
    existemovilidad: "Sí. El plan contempla movilidad estudiantil que la Facultad va publicando, dependiendo de los convenios que vayan saliendo.",

    cuantoscreditospuedohacerenmovilidad: "El plan permite hasta 20 % de los créditos en programas reconocidos de otras instituciones nacionales o extranjeras.",
    cuantoscreditospuedocursarenmovilidad: "El plan permite hasta 20 % de los créditos en programas reconocidos de otras instituciones nacionales o extranjeras.",
    cuantoscreditospuedohacerdeintercambio: "El plan permite hasta 20 % de los créditos en programas reconocidos de otras instituciones nacionales o extranjeras.",
    queporcentajepuedohacerenmovilidad: "El plan permite hasta 20 % de los créditos en programas reconocidos de otras instituciones nacionales o extranjeras.",
    cuantopuedohacerenmovilidad: "El plan permite hasta 20 % de los créditos en programas reconocidos de otras instituciones nacionales o extranjeras.",

    cualeslasareasdecompetenciadelegresado: "Las áreas de competencia del egresado incluyen asesoría, litigación, procuración e impartición de justicia; el nuevo plan también incorpora la solución de conflictos por medios alternos.",
    enqueareaspuedetrabajarelegresado: "Las áreas de competencia del egresado incluyen asesoría, litigación, procuración e impartición de justicia; el nuevo plan también incorpora la solución de conflictos por medios alternos.",
    quepuedehacerunegresadodederecho: "Las áreas de competencia del egresado incluyen asesoría, litigación, procuración e impartición de justicia; el nuevo plan también incorpora la solución de conflictos por medios alternos.",
    quehaceunlicenciadoenderecho: "Las áreas de competencia del egresado incluyen asesoría, litigación, procuración e impartición de justicia; el nuevo plan también incorpora la solución de conflictos por medios alternos.",
    enquepuedetrabajarelegresado: "Las áreas de competencia del egresado incluyen asesoría, litigación, procuración e impartición de justicia; el nuevo plan también incorpora la solución de conflictos por medios alternos.",

    dondeveolamallacurricular: "La malla curricular puede consultarse en la sección oficial de la Secretaría Académica, donde actualmente se publica la malla del Plan de Licenciatura en Derecho MEFI 2026.",
    dondeconsultolamallacurricular: "La malla curricular puede consultarse en la sección oficial de la Secretaría Académica, donde actualmente se publica la malla del Plan de Licenciatura en Derecho MEFI 2026.",
    dondeveoelplandeestudios: "La malla curricular puede consultarse en la sección oficial de la Secretaría Académica, donde actualmente se publica la malla del Plan de Licenciatura en Derecho MEFI 2026.",
    dondeestalamallacurricular: "La malla curricular puede consultarse en la sección oficial de la Secretaría Académica, donde actualmente se publica la malla del Plan de Licenciatura en Derecho MEFI 2026.",
    cualeslamallacurricular: "La malla curricular puede consultarse en la sección oficial de la Secretaría Académica, donde actualmente se publica la malla del Plan de Licenciatura en Derecho MEFI 2026.",

    // cual es el plan de estudios.
    cualplandeestudiosestavigente: "La Secretaría Académica actualmente publica la malla del MEFI 2026. La página general todavía conserva información del MEFI 2019, por lo que es importante identificar el plan de estudios del estudiante antes de responder.",
    cualplanestavigente: "La Secretaría Académica actualmente publica la malla del MEFI 2026. La página general todavía conserva información del MEFI 2019, por lo que es importante identificar el plan de estudios del estudiante antes de responder.",
    queplandeestudiosestavigente: "La Secretaría Académica actualmente publica la malla del MEFI 2026. La página general todavía conserva información del MEFI 2019, por lo que es importante identificar el plan de estudios del estudiante antes de responder.",
    queplanestudiosmanejan: "La Secretaría Académica actualmente publica la malla del MEFI 2026. La página general todavía conserva información del MEFI 2019, por lo que es importante identificar el plan de estudios del estudiante antes de responder.",
    cualeselplanactual: "La Secretaría Académica actualmente publica la malla del MEFI 2026. La página general todavía conserva información del MEFI 2019, por lo que es importante identificar el plan de estudios del estudiante antes de responder.",


    // =========================
    // CONSTANCIAS
    // =========================

    // agregar tramito
    // agregar el link https://forms.office.com/Pages/ResponsePage.aspx?id=nqyDK0gk30WTGUjYYjal6svikakWeu5DnAap57UzwIZUMVhWNVJFV0lOMjRaU0dCNjlYUFJNSVBRTS4u
    comosolicitounaconstancia: "Puedes solicitar una constancia mediante el Formulario Constancia institucional, ingresando con tu correo institucional, o presencialmente en Control Escolar.",
    comoobtengounaconstancia: "Puedes solicitar una constancia mediante el Formulario Constancia institucional, ingresando con tu correo institucional, o presencialmente en Control Escolar.",
    comopedirunaconstancia: "Puedes solicitar una constancia mediante el Formulario Constancia institucional, ingresando con tu correo institucional, o presencialmente en Control Escolar.",
    dondesolicitounaconstancia: "Puedes solicitar una constancia mediante el Formulario Constancia institucional, ingresando con tu correo institucional, o presencialmente en Control Escolar.",
    dondepuedosolicitarunaconstancia: "Puedes solicitar una constancia mediante el Formulario Constancia institucional, ingresando con tu correo institucional, o presencialmente en Control Escolar.",
    dondesolicitounaconstancia: "Puedes solicitar una constancia mediante el Formulario Constancia institucional, ingresando con tu correo institucional, o presencialmente en Control Escolar.",
    comosacounaconstancia: "Puedes solicitar una constancia mediante el Formulario Constancia institucional, ingresando con tu correo institucional, o presencialmente en Control Escolar.",
    comosacarunaconstancia: "Puedes solicitar una constancia mediante el Formulario Constancia institucional, ingresando con tu correo institucional, o presencialmente en Control Escolar.",
    dondesacounaconstancia: "Puedes solicitar una constancia mediante el Formulario Constancia institucional, ingresando con tu correo institucional, o presencialmente en Control Escolar.",
    dondehagolaconstancia: "Puedes solicitar una constancia mediante el Formulario Constancia institucional, ingresando con tu correo institucional, o presencialmente en Control Escolar.",

    puedopedirvariasconstancias: "Sí, la Facultad indica que pueden solicitarse una o varias constancias.",
    puedosolicitarvariasconstancias: "Sí, la Facultad indica que pueden solicitarse una o varias constancias.",
    puedopedirmasdeunaconstancia: "Sí, la Facultad indica que pueden solicitarse una o varias constancias.",
    cuantasconstanciaspuedopedir: "La Facultad indica que pueden solicitarse una o varias constancias.",
    puedosacarvariasconstancias: "Sí, la Facultad indica que pueden solicitarse una o varias constancias.",

    cuantocuestaunaconstancia: "La información publicada indica $15 MXN por cada constancia, con referencia de costo desde el 10 de enero de 2024. Conviene verificar que el importe siga vigente antes de pagar.",
    cualeselpreciodeunaconstancia: "La información publicada indica $15 MXN por cada constancia, con referencia de costo desde el 10 de enero de 2024. Conviene verificar que el importe siga vigente antes de pagar.",
    cuantodebopagarporunaconstancia: "La información publicada indica $15 MXN por cada constancia, con referencia de costo desde el 10 de enero de 2024. Conviene verificar que el importe siga vigente antes de pagar.",
    preciodelaconstancia: "La información publicada indica $15 MXN por cada constancia, con referencia de costo desde el 10 de enero de 2024. Conviene verificar que el importe siga vigente antes de pagar.",
    costodeunaconstancia: "La información publicada indica $15 MXN por cada constancia, con referencia de costo desde el 10 de enero de 2024. Conviene verificar que el importe siga vigente antes de pagar.",

    comopagounaconstancia: "La constancia puede pagarse mediante transferencia o ventanilla bancaria, o en la caja de la Facultad, según el procedimiento publicado.",
    dondepagounaconstancia: "La constancia puede pagarse mediante transferencia o ventanilla bancaria, o en la caja de la Facultad, según el procedimiento publicado.",
    comosepagalaconstancia: "La constancia puede pagarse mediante transferencia o ventanilla bancaria, o en la caja de la Facultad, según el procedimiento publicado.",
    dondepuedopagarlaconstancia: "La constancia puede pagarse mediante transferencia o ventanilla bancaria, o en la caja de la Facultad, según el procedimiento publicado.",
    comosepagalaconstancia: "La constancia puede pagarse mediante transferencia o ventanilla bancaria, o en la caja de la Facultad, según el procedimiento publicado.",

    cuantotardaunaconstancia: "La información publicada señala un tiempo de 1 a 3 días hábiles después de realizar la solicitud.",
    cuandomeentreganlaconstancia: "La información publicada señala un tiempo de 1 a 3 días hábiles después de realizar la solicitud.",
    cuantosdiastardaunaconstancia: "La información publicada señala un tiempo de 1 a 3 días hábiles después de realizar la solicitud.",
    tiempodeentregadeconstancia: "La información publicada señala un tiempo de 1 a 3 días hábiles después de realizar la solicitud.",

    donderecojolaconstancia: "Las constancias se recogen presencialmente en Control Escolar.",
    donderecogerlaconstancia: "Las constancias se recogen presencialmente en Control Escolar.",
    dondepuedorecogerunaconstancia: "Las constancias se recogen presencialmente en Control Escolar.",
    dondeentreganlaconstancia: "Las constancias se recogen presencialmente en Control Escolar.",
    dondemeentreganlaconstancia: "Las constancias se recogen presencialmente en Control Escolar.",

    quehorariotienecontrolescolarparaconstancias: "El horario de Control Escolar para constancias es de lunes a viernes, de 9:00 a 16:30 horas.",
    horariodecontrolescolarparaconstancias: "El horario de Control Escolar para constancias es de lunes a viernes, de 9:00 a 16:30 horas.",
    aqueshoraatiendecontrolescolar: "El horario de Control Escolar para constancias es de lunes a viernes, de 9:00 a 16:30 horas.",
    aqueshorapuedoiracontrolescolar: "El horario de Control Escolar para constancias es de lunes a viernes, de 9:00 a 16:30 horas.",

    necesitofotoparalaconstancia: "La información publicada indica que al recoger la constancia debe proporcionarse una fotografía reciente tamaño infantil, blanco y negro, en papel mate, con blusa o camisa blanca.",
    necesitofotografia: "La información publicada indica que al recoger la constancia debe proporcionarse una fotografía reciente tamaño infantil, blanco y negro, en papel mate, con blusa o camisa blanca.",
    necesitofotografiaparaconstancia: "La información publicada indica que al recoger la constancia debe proporcionarse una fotografía reciente tamaño infantil, blanco y negro, en papel mate, con blusa o camisa blanca.",
    quefotonecesitoparalaconstancia: "La información publicada indica que al recoger la constancia debe proporcionarse una fotografía reciente tamaño infantil, blanco y negro, en papel mate, con blusa o camisa blanca.",
    quefotografiapidenparalaconstancia: "La información publicada indica que al recoger la constancia debe proporcionarse una fotografía reciente tamaño infantil, blanco y negro, en papel mate, con blusa o camisa blanca.",


    // =========================
    // TUTORÍAS
    // =========================

    quesonlastutorias: "Las tutorías son un proceso de acompañamiento y orientación personal y académica para estudiantes de la Facultad.",
    quesontutorias: "Las tutorías son un proceso de acompañamiento y orientación personal y académica para estudiantes de la Facultad.",
    paraquesirvenlastutorias: "Las tutorías son un proceso de acompañamiento y orientación personal y académica para estudiantes de la Facultad.",
    paraquesirvetutoria: "Las tutorías son un proceso de acompañamiento y orientación personal y académica para estudiantes de la Facultad.",
    quehacentutorias: "Las tutorías brindan acompañamiento y orientación personal y académica a estudiantes de la Facultad.",
    queeslatutoria: "Las tutorías son un proceso de acompañamiento y orientación personal y académica para estudiantes de la Facultad.",

    quiencoordinatutorias: "La Dra. Xóchitl Aline Mézquita Leana coordina Tutorías.",
    quienllevalastutorias: "La Dra. Xóchitl Aline Mézquita Leana coordina Tutorías.",
    quienestacargodetutorias: "La Dra. Xóchitl Aline Mézquita Leana coordina Tutorías.",
    quienseencargadetutorias: "La Dra. Xóchitl Aline Mézquita Leana coordina Tutorías.",
    quiendirigetutorias: "La Dra. Xóchitl Aline Mézquita Leana coordina Tutorías.",

    queproblemaspuedoconsultartutorias: "Tutorías puede orientarte sobre problemas personales y académicos, dificultades durante el programa, estrategias de aprendizaje y desarrollo académico y profesional, entre otros temas.",
    queproblemasatiendetutorias: "Tutorías puede orientarte sobre problemas personales y académicos, dificultades durante el programa, estrategias de aprendizaje y desarrollo académico y profesional, entre otros temas.",
    quepuedoconsultarentutorias: "Tutorías puede orientarte sobre problemas personales y académicos, dificultades durante el programa, estrategias de aprendizaje y desarrollo académico y profesional, entre otros temas.",
    enqueayudantutorias: "Tutorías puede orientarte sobre problemas personales y académicos, dificultades durante el programa, estrategias de aprendizaje y desarrollo académico y profesional, entre otros temas.",
    paraquepuedoiratutorias: "Tutorías puede orientarte sobre problemas personales y académicos, dificultades durante el programa, estrategias de aprendizaje y desarrollo académico y profesional, entre otros temas.",

    lastutoriassonindividuales: "Sí, las tutorías pueden ser individuales.",
    tutoriasindividuales: "Sí, las tutorías pueden ser individuales.",
    haytutoriasindividuales: "Sí, las tutorías pueden ser individuales.",
    puedotenerunatutoriaindividual: "Sí, las tutorías pueden ser individuales.",
    puedohacertutoriaindividual: "Sí, las tutorías pueden ser individuales.",

    haytutoriasgrupales: "Sí, también existen tutorías grupales.",
    tutoriasgrupales: "Sí, también existen tutorías grupales.",
    existentutoriasgrupales: "Sí, también existen tutorías grupales.",
    puedohacertutoriagrupal: "Sí, también existen tutorías grupales.",
    haytutoriaengrupo: "Sí, también existen tutorías grupales.",

    tutoriasmeayudaconserviciosocial: "Sí, Tutorías puede asesorarte sobre la selección de servicio social.",
    tutoriaspuedeayudarmeconserviciosocial: "Sí, Tutorías puede asesorarte sobre la selección de servicio social.",
    tutoriasorientaserviciosocial: "Sí, Tutorías puede asesorarte sobre la selección de servicio social.",
    puedopreguntartutoriasporserviciosocial: "Sí, Tutorías puede asesorarte sobre la selección de servicio social.",
    dondepreguntopormiserviciosocial: "Puedes acudir a Secretaría Académica y/o Tutorías para recibir orientación sobre servicio social.",

    tutoriasmeayudaconpracticasprofesionales: "Sí, Tutorías puede orientarte sobre prácticas profesionales.",
    tutoriaspuedeayudarmeconpracticas: "Sí, Tutorías puede orientarte sobre prácticas profesionales.",
    tutoriasorientapracticasprofesionales: "Sí, Tutorías puede orientarte sobre prácticas profesionales.",
    puedopreguntartutoriasporpracticas: "Sí, Tutorías puede orientarte sobre prácticas profesionales.",
    dondepreguntoporpracticasprofesionales: "Puedes acudir a Secretaría Académica y/o Tutorías para recibir orientación sobre prácticas profesionales.",

    tutoriasmeayudacontitulacion: "Sí, entre los servicios de Tutorías está la orientación sobre opciones de titulación.",
    tutoriaspuedeayudarmecontitulacion: "Sí, entre los servicios de Tutorías está la orientación sobre opciones de titulación.",
    tutoriasorientasobretitulacion: "Sí, entre los servicios de Tutorías está la orientación sobre opciones de titulación.",
    puedopreguntartutoriasportitulacion: "Sí, entre los servicios de Tutorías está la orientación sobre opciones de titulación.",
    dondepreguntopormititulacion: "Puedes acudir a Tutorías para recibir orientación sobre las opciones de titulación.",

    tutoriasatiendeproblemaspersonales: "Sí. Tutorías brinda orientación y acompañamiento ante problemas personales que puedan afectar tu trayectoria académica.",
    puedohablarcontutoriasdemiproblemapersonal: "Sí. Tutorías brinda orientación y acompañamiento ante problemas personales que puedan afectar tu trayectoria académica.",
    puedocontarleunproblemapersonalatutorias: "Sí. Tutorías brinda orientación y acompañamiento ante problemas personales que puedan afectar tu trayectoria académica.",
    tutoriasmeayudaconproblemaspersonales: "Sí. Tutorías brinda orientación y acompañamiento ante problemas personales que puedan afectar tu trayectoria académica.",
    puedoconsultarproblemaspersonales: "Sí. Tutorías brinda orientación y acompañamiento ante problemas personales que puedan afectar tu trayectoria académica.",

    tutoriaspuedecanalizarme: "Sí, Tutorías puede canalizarte al Departamento de Orientación y Consejo Educativo cuando sea necesario.",
    puedocanalizarmeentutorias: "Sí, Tutorías puede canalizarte al Departamento de Orientación y Consejo Educativo cuando sea necesario.",
    tutoriascanaliza: "Sí, Tutorías puede canalizarte al Departamento de Orientación y Consejo Educativo cuando sea necesario.",
    tutoriaspuedeenviarmeaotraarea: "Sí, Tutorías puede canalizarte al Departamento de Orientación y Consejo Educativo cuando sea necesario.",


    // =========================
    // ACTIVIDADES Y EVENTOS
    // =========================

    hayactividadesparalosestudiantes: "Sí. La Facultad publica actividades académicas y estudiantiles mediante noticias, avisos y convocatorias.",
    hayactividadesparaalumnos: "Sí. La Facultad publica actividades académicas y estudiantiles mediante noticias, avisos y convocatorias.",
    hayactividadesparaestudiantes: "Sí. La Facultad publica actividades académicas y estudiantiles mediante noticias, avisos y convocatorias.",
    queactividadeshayparalosestudiantes: "La Facultad publica actividades académicas y estudiantiles mediante noticias, avisos y convocatorias.",
    dondeveolasactividades: "Las actividades se publican mediante noticias, avisos y convocatorias de la Facultad.",
    dondeveoloseventos: "Los eventos se publican mediante noticias, avisos y convocatorias de la Facultad.",
    dondepuedoverloseventos: "Los eventos se publican mediante noticias, avisos y convocatorias de la Facultad.",
    dondepublicanlasactividades: "Las actividades se publican mediante noticias, avisos y convocatorias de la Facultad.",
    dondeveoeventosdelafacultad: "Los eventos se publican mediante noticias, avisos y convocatorias de la Facultad.",
    hayeventos: "Sí. La Facultad publica actividades y eventos académicos y estudiantiles mediante noticias, avisos y convocatorias.",

    hayactividadesextracurriculares: "Sí. Las actividades extracurriculares pueden publicarse mediante convocatorias y avisos de la Facultad.",
    queactividadesextracurriculareshay: "Las actividades extracurriculares pueden publicarse mediante convocatorias y avisos de la Facultad.",
    hayeventosextracurriculares: "Las actividades extracurriculares pueden publicarse mediante convocatorias y avisos de la Facultad.",
    dondeveolasactividadesextracurriculares: "Las actividades extracurriculares pueden publicarse mediante convocatorias y avisos de la Facultad.",

    hayconcursos: "Sí. La Facultad ha publicado convocatorias de concursos para estudiantes.",
    hayconcursosparaalumnos: "Sí. La Facultad ha publicado convocatorias de concursos para estudiantes.",
    existenconcursos: "Sí. La Facultad ha publicado convocatorias de concursos para estudiantes.",
    hayconcursosestudiantiles: "Sí. La Facultad ha publicado convocatorias de concursos para estudiantes.",
    dondeveolosconcursos: "Las convocatorias de concursos para estudiantes se publican mediante los avisos y medios oficiales de la Facultad.",

    haycongresos: "Sí. La Facultad publica convocatorias y actividades académicas relacionadas con congresos.",
    haycongresosenlafacultad: "Sí. La Facultad publica convocatorias y actividades académicas relacionadas con congresos.",
    existencongresos: "Sí. La Facultad publica convocatorias y actividades académicas relacionadas con congresos.",
    hayeventosacademicos: "Sí. La Facultad publica actividades académicas, incluyendo actividades relacionadas con congresos.",
    dondeveoloscongresos: "Las convocatorias y actividades relacionadas con congresos se publican mediante los medios oficiales de la Facultad.",

    hayactividadesdederechoshumanos: "Sí. La Facultad ha publicado actividades relacionadas con Derechos Humanos, como un concurso de proyectos de impacto social.",
    hayeventosdederechoshumanos: "Sí. La Facultad ha publicado actividades relacionadas con Derechos Humanos, como un concurso de proyectos de impacto social.",
    hayconcursosdederechoshumanos: "Sí. La Facultad ha publicado actividades relacionadas con Derechos Humanos, como un concurso de proyectos de impacto social.",
    existenactividadesdederechoshumanos: "Sí. La Facultad ha publicado actividades relacionadas con Derechos Humanos, como un concurso de proyectos de impacto social.",

    hayceremoniadegraduacion: "Sí. La Facultad realiza ceremonias de graduación. Por ejemplo, realizó la ceremonia académica de la generación 2020–2025 el 11 de julio de 2025.",
    hayceremoniasdegraduacion: "Sí. La Facultad realiza ceremonias de graduación. Por ejemplo, realizó la ceremonia académica de la generación 2020–2025 el 11 de julio de 2025.",
    haygraduaciones: "Sí. La Facultad realiza ceremonias de graduación.",
    cuandoeslagraduacion: "La fecha de cada ceremonia de graduación depende de la generación y se publica mediante los avisos oficiales de la Facultad.",
    dondeveolafechadegraduacion: "Las fechas de las ceremonias de graduación se publican mediante los avisos oficiales de la Facultad.",

    sereconocenlosmejorespromedios: "Sí. En la ceremonia de la generación 2020–2025 se reconocieron estudiantes con mejores promedios.",
    reconocenalosmejorespromedios: "Sí. En la ceremonia de la generación 2020–2025 se reconocieron estudiantes con mejores promedios.",
    hayreconocimientoparalosmejorespromedios: "Sí. En la ceremonia de la generación 2020–2025 se reconocieron estudiantes con mejores promedios.",
    premianalosmejorespromedios: "Sí. En la ceremonia de la generación 2020–2025 se reconocieron estudiantes con mejores promedios.",
    haypremiosporpromedio: "Sí. En la ceremonia de la generación 2020–2025 se reconocieron estudiantes con mejores promedios.",


    // =========================
    // PROBLEMAS Y ORIENTACIÓN
    // =========================

    tengounproblemaacademico: "Si tienes un problema académico, puedes acudir a Secretaría Académica o Tutorías, dependiendo del problema.",
    tengoproblemasacademicos: "Si tienes un problema académico, puedes acudir a Secretaría Académica o Tutorías, dependiendo del problema.",
    tengounproblemaacademico: "Si tienes un problema académico, puedes acudir a Secretaría Académica o Tutorías, dependiendo del problema.",
    tengoproblemasconmisestudios: "Si tienes un problema académico, puedes acudir a Secretaría Académica o Tutorías, dependiendo del problema.",
    dondeatiendenproblemasacademicos: "Puedes acudir a Secretaría Académica o Tutorías, dependiendo del problema.",

    tengounproblemapersonal: "Tutorías puede orientarte y canalizarte cuando sea necesario si tienes un problema personal que afecta tus estudios.",
    tengounproblemapersonalqueafectamisestudios: "Tutorías puede orientarte y canalizarte cuando sea necesario si tienes un problema personal que afecta tus estudios.",
    tengoproblemaspersonales: "Tutorías puede orientarte y canalizarte cuando sea necesario si tienes un problema personal que afecta tus estudios.",
    aquienacudositengounproblemapersonal: "Tutorías puede orientarte y canalizarte cuando sea necesario si tienes un problema personal que afecta tus estudios.",
    quienmeayudaconunproblemapersonal: "Tutorías puede orientarte y canalizarte cuando sea necesario si tienes un problema personal que afecta tus estudios.",

    tengoproblemasconunamateria: "Si tienes problemas con una materia, primero puedes acudir a Tutorías o Secretaría Académica.",
    tengoproblemasconunamateria: "Si tienes problemas con una materia, primero puedes acudir a Tutorías o Secretaría Académica.",
    noentiendounamateria: "Si tienes problemas con una materia, primero puedes acudir a Tutorías o Secretaría Académica.",
    tengodificultadesconunamateria: "Si tienes problemas con una materia, primero puedes acudir a Tutorías o Secretaría Académica.",
    quienmeayudaconunamateria: "Si tienes problemas con una materia, primero puedes acudir a Tutorías o Secretaría Académica.",
    dondepreguntopormimateria: "Si tienes problemas con una materia, primero puedes acudir a Tutorías o Secretaría Académica.",

    tengoproblemasconmiinscripcion: "Si el problema es académico, puedes acudir a Secretaría Académica; si es administrativo o escolar, debes acudir a Control Escolar.",
    tengoproblemasconmiinscripcion: "Si el problema es académico, puedes acudir a Secretaría Académica; si es administrativo o escolar, debes acudir a Control Escolar.",
    miinscripciontieneunproblema: "Si el problema es académico, puedes acudir a Secretaría Académica; si es administrativo o escolar, debes acudir a Control Escolar.",
    nopuedoinscribirme: "Si el problema es académico, puedes acudir a Secretaría Académica; si es administrativo o escolar, debes acudir a Control Escolar.",
    problemasparainscribirme: "Si el problema es académico, puedes acudir a Secretaría Académica; si es administrativo o escolar, debes acudir a Control Escolar.",
    quienmeayudaconmiinscripcion: "Si el problema es académico, puedes acudir a Secretaría Académica; si es administrativo o escolar, debes acudir a Control Escolar.",

    tengoproblemasconuntramite: "Si tienes problemas con un trámite, puedes acudir a Control Escolar o Secretaría Administrativa, dependiendo del tipo de trámite.",
    tengoproblemasconuntramite: "Si tienes problemas con un trámite, puedes acudir a Control Escolar o Secretaría Administrativa, dependiendo del tipo de trámite.",
    tengounproblemaadministrativo: "Si tienes problemas con un trámite, puedes acudir a Control Escolar o Secretaría Administrativa, dependiendo del tipo de trámite.",
    tengoproblemasconuntramiteescolar: "Si tienes problemas con un trámite, puedes acudir a Control Escolar o Secretaría Administrativa, dependiendo del tipo de trámite.",
    dondepreguntoporuntramite: "Si tienes problemas con un trámite, puedes acudir a Control Escolar o Secretaría Administrativa, dependiendo del tipo de trámite.",
    quienmeayudaconuntramite: "Si tienes problemas con un trámite, puedes acudir a Control Escolar o Secretaría Administrativa, dependiendo del tipo de trámite.",

    tengoproblemasconmitesis: "Si tienes problemas con tu tesis, puedes acudir a Secretaría Académica.",
    tengoproblemasconmitesis: "Si tienes problemas con tu tesis, puedes acudir a Secretaría Académica.",
    dondepreguntopormitesis: "Si tienes problemas con tu tesis, puedes acudir a Secretaría Académica.",
    quienmeayudaconmitesis: "Si tienes problemas con tu tesis, puedes acudir a Secretaría Académica.",
    aquienpreguntopormitesis: "Si tienes problemas con tu tesis, puedes acudir a Secretaría Académica.",

    tengoproblemasconserviciosocial: "Para problemas o dudas sobre servicio social puedes acudir a Secretaría Académica y/o Tutorías.",
    tengoproblemasconserviciosocial: "Para problemas o dudas sobre servicio social puedes acudir a Secretaría Académica y/o Tutorías.",
    quienmeayudaconserviciosocial: "Para problemas o dudas sobre servicio social puedes acudir a Secretaría Académica y/o Tutorías.",
    aquienpreguntoporserviciosocial: "Para problemas o dudas sobre servicio social puedes acudir a Secretaría Académica y/o Tutorías.",

    tengoproblemasconpracticasprofesionales: "Para problemas o dudas sobre prácticas profesionales puedes acudir a Secretaría Académica y/o Tutorías.",
    tengoproblemasconpracticasprofesionales: "Para problemas o dudas sobre prácticas profesionales puedes acudir a Secretaría Académica y/o Tutorías.",
    quienmeayudaconpracticasprofesionales: "Para problemas o dudas sobre prácticas profesionales puedes acudir a Secretaría Académica y/o Tutorías.",
    dondepreguntoporpracticas: "Para problemas o dudas sobre prácticas profesionales puedes acudir a Secretaría Académica y/o Tutorías.",
    aquienpreguntoporpracticasprofesionales: "Para problemas o dudas sobre prácticas profesionales puedes acudir a Secretaría Académica y/o Tutorías.",

    necesitoorientacionacademica: "Puedes acudir a Tutorías para recibir orientación académica.",
    necesitoayudaacademica: "Puedes acudir a Tutorías para recibir orientación académica.",
    necesitoasesoriaacademica: "Puedes acudir a Tutorías para recibir orientación académica.",
    quienmepuedeorientaracademicamente: "Puedes acudir a Tutorías para recibir orientación académica.",
    dondepuedorecibirorientacionacademica: "Puedes acudir a Tutorías para recibir orientación académica.",
    quienmeayudaconorientacionacademica: "Puedes acudir a Tutorías para recibir orientación académica.",

    tutoriaspuedecanalizarme: "Sí, Tutorías puede canalizarte al Departamento de Orientación y Consejo Educativo cuando sea necesario.",
    puedocanalizarmeentutorias: "Sí, Tutorías puede canalizarte al Departamento de Orientación y Consejo Educativo cuando sea necesario.",
    tutoriascanaliza: "Sí, Tutorías puede canalizarte al Departamento de Orientación y Consejo Educativo cuando sea necesario."
};

// Create a new client instance
const client = new Client({  
    puppeteer: {
        executablePath: '/usr/bin/brave',
    },
    authStrategy: new LocalAuth({
        dataPath: './sesion'
    })
});

// When the client received QR-Code
client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
});

// When the client is ready.
client.on('ready', () => {
    console.log('Client is ready!');
});


// Aqui esta lo util, este primero es para responder el mensaje del chat.
// Listening to all incoming messages
client.on('message_create', message => {

    const mensaje = message.body
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[¿?¡!.,]/g, '')
        .replace(/\s+/g, '');

    for (const palabra in respuestas) {
        if (mensaje.includes(palabra)) {
            client.sendMessage(message.from, respuestas[palabra]);
            break;
        }
    }
});


// Si enviamos imagenes. 
client.on('message', async (msg) => {
    if (msg.body === '!send-media') {
        const media = new MessageMedia('image/png', base64Image);
        await client.sendMessage(msg.from, media);
    }
});

// No recibiremos media, sin embargo lo usaremos para mandar un error.
client.on('message', async (msg) => {
    if (msg.hasMedia) {
        try {
            const media = await msg.downloadMedia();
            // do something with the media data here
        } catch (err) {
            // Los stickers (y a veces otros medios) pueden fallar al
            // descargarse por bugs internos de whatsapp-web.js/puppeteer.
            // Lo registramos y seguimos, en vez de crashear el bot.
            console.error(`Error al descargar media de ${msg.from}:`, err.message || err);
        }
    }
});

// Start your client
client.initialize();