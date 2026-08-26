const { Client, LocalAuth} = require('whatsapp-web.js');
const qrcode = require("qrcode-terminal")


const respuestas = {
    hola: "Holaaaa!!!",
    queessociedaddealumnos: "Sociedad de alumnos es una agrupación estudiantil encargada de realizar actividades para la Facultad y está integrada por alumnas y alumnos interesados en colaborar.",
    sa: "Sociedad de alumnos es una agrupación estudiantil encargada de realizar actividades para la Facultad y está integrada por alumnas y alumnos interesados en colaborar.",
    gracias: "¡De nada! Estamos para ayudarte."
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


// Start your client
client.initialize();


