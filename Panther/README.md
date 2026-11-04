# Ito 🩷🩵

Bot de WhatsApp que contesta dudas frecuentes de la Facultad de Derecho: ubicaciones, horarios, contactos, constancias, tutorías, plan de estudios, etc.

Funciona con [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js): abre WhatsApp Web en un navegador controlado por el bot y responde desde el número que vincules.

> ⚠️ whatsapp-web.js no es una API oficial de WhatsApp. Usa un número dedicado al bot, no tu número personal: WhatsApp puede banear cuentas automatizadas.

## Requisitos

- Node.js 18 o más reciente.
- Un navegador basado en Chromium (Brave, Chromium o Chrome).

## Instalación y uso

```sh
npm install
npm start
```

La primera vez aparece un QR en la terminal. Escanéalo desde el teléfono del bot en **WhatsApp → Dispositivos vinculados**. La sesión se guarda en `sesion/`, así que las siguientes veces ya no lo pide.

Por defecto usa Brave en `/usr/bin/brave`. Para otro navegador:

```sh
CHROME_PATH=/usr/bin/chromium npm start
```

### Dejarlo corriendo

Si el bot encuentra un error grave, se cierra en vez de quedarse en un estado raro. Para que se reinicie solo, córrelo con [pm2](https://pm2.keymetrics.io/):

```sh
npm install -g pm2
pm2 start main.js --name ito
pm2 logs ito      # ver la consola
pm2 restart ito   # después de editar respuestas.json
```

## Archivos

| Archivo | Qué es |
|---|---|
| `main.js` | La conexión con WhatsApp: recibe mensajes y manda respuestas. |
| `motor.js` | Decide qué responder a cada mensaje. |
| `respuestas.json` | **Todo lo que el bot sabe.** Es el archivo que vas a editar. |
| `probar.js` | Para probar sin abrir WhatsApp. |
| `pruebas.json` | Frases de prueba con la respuesta que deben dar. |
| `sin_respuesta.jsonl` | Se crea solo: preguntas que el bot no supo contestar. |
| `sesion/` | Se crea sola: la sesión de WhatsApp. |

## Editar respuestas

`respuestas.json` tiene tres partes.

### `temas`

Cada tema es una respuesta con las formas de preguntar por ella:

```json
{
  "id": "biblioteca.horario_biblioteca",
  "categoria": "Biblioteca",
  "keywords": [
    ["horario", "biblioteca"],
    ["hora", "abre", "biblioteca"]
  ],
  "respuesta": "La biblioteca tiene atención de 8:30 a 21:00 horas."
}
```

- **`id`**: nombre único del tema. Lo usan las pruebas; si lo cambias, cámbialo también en `pruebas.json`.
- **`categoria`**: solo sirve para ordenar el archivo.
- **`keywords`**: lista de alternativas. Cada alternativa es una lista de palabras, y el tema aplica si el mensaje contiene **todas** las palabras de **alguna** alternativa, en cualquier orden y con palabras de más. Con el ejemplo, "oye ¿a qué hora abre la biblioteca?" coincide con la segunda alternativa.
- **`respuesta`**: lo que contesta el bot.
- **`prioridad`** *(opcional, por defecto 0)*: el tema con mayor prioridad gana siempre. Los saludos tienen `-1` para que "hola, ¿dónde está la biblioteca?" conteste lo de la biblioteca, y los temas de acoso tienen `10` para que nunca pierdan.
- **`prefijo`** *(opcional)*: con `true` basta con que la palabra del mensaje **empiece** con la keyword. `["acos"]` coincide con acoso, acosaron, acosador…

Al escribir keywords **no te preocupes por** acentos, mayúsculas, signos ni plurales: "Tutorías", "tutoria" y "TUTORIAS" son la misma palabra. Tampoco hace falta poner artículos ni preposiciones ("el", "la", "de"…).

Si el mensaje coincide con varios temas, gana:

1. El de mayor `prioridad`.
2. La alternativa con más palabras, o sea la más específica: "horario de la biblioteca" le gana a "biblioteca".
3. El que no necesitó corregir errores de dedo.
4. El que aparece primero en el archivo.

### `sinonimos`

Palabras que la gente escribe distinto pero significan lo mismo:

```json
"sinonimos": { "profe": "profesor", "cel": "telefono", "biblio": "biblioteca" }
```

Se aplican al mensaje y a las keywords, así que con `"profe": "profesor"` cualquier tema con la keyword `profesor` también responde a "profe".

### `mensajes`

- **`noEntendi`**: lo que contesta cuando no encuentra ningún tema.
- **`soloTexto`**: lo que contesta cuando le mandan una imagen, audio o archivo sin texto. Los stickers se ignoran.

### Si te equivocas

El bot revisa `respuestas.json` al arrancar. Si hay un error (un campo mal escrito, un tema sin respuesta, un `id` repetido…), no arranca y te dice exactamente dónde está:

```
respuestas.json tiene 1 error(es):
  - temas[5] (acoso.agresion): campo desconocido "respuestas" (¿error de dedo?)
```

## Qué tan "listo" es

Además de las keywords:

- **Errores de dedo**: "bibloteca", "costancia", "tutorais" o "telefomo" se corrigen solos si están a una letra de una keyword de 5 letras o más. Una palabra que ya existe en algún tema no se corrige, para que "cuando" no se confunda con "cuanto".
- **Contexto**: recuerda el último tema de cada chat por 5 minutos. Si alguien pregunta "¿dónde está la biblioteca?" y luego "¿y a qué hora abre?", el bot entiende que sigue hablando de la biblioteca. Solo se usa cuando el mensaje nuevo no coincide con nada por sí solo.
- **Sin spam**: contesta máximo 8 mensajes por minuto a cada chat.
- **Solo chats privados**: ignora grupos, estados y canales.

Los límites (minutos de contexto, mensajes por minuto) están como constantes al inicio de `main.js`.

## Probar sin WhatsApp

```sh
npm test                                     # corre todas las pruebas
node probar.js "donde esta la biblioteca"    # qué respondería a un mensaje
node probar.js "donde esta control escolar" "y el telefono?"   # una conversación
```

En una conversación, cada texto entre comillas es un mensaje distinto.

**Corre `npm test` cada vez que edites `respuestas.json`.** Si un cambio hace que alguna pregunta deje de dar su respuesta, te dice cuál:

```
✗ "donde esta la biblioteca"
    esperado: biblioteca.donde_biblioteca
    obtenido: salones.donde_salon
```

Para agregar una prueba, añade una línea a `pruebas.json`:

```json
{"mensaje": "hay cafeteria?", "esperado": "general.cafeteria"}
{"anterior": "donde esta la biblioteca", "mensaje": "y a que hora abre", "esperado": "biblioteca.horario_biblioteca"}
{"mensaje": "asdfgh", "esperado": null}
```

Con `null` la prueba exige que el bot **no** encuentre respuesta.

## Mejorar el bot con preguntas reales

Cada vez que el bot contesta "no te entendí", guarda la pregunta en `sin_respuesta.jsonl` con la fecha. No guarda el número de quien preguntó. Para ver un resumen:

```sh
node probar.js --pendientes
```

```
2 preguntas distintas sin respuesta (las más repetidas primero):

   12x  Como me doy de baja?
    3x  hay cafeteria?
```

La rutina recomendada, cada semana o dos:

1. Corre `node probar.js --pendientes`.
2. Para cada pregunta frecuente, agrega keywords a un tema existente o crea uno nuevo en `respuestas.json`.
3. Agrega la pregunta a `pruebas.json`.
4. Corre `npm test`, reinicia el bot y borra o renombra `sin_respuesta.jsonl` para empezar de cero.

## Privacidad

`sesion/` da acceso completo a la cuenta de WhatsApp del bot, y `sin_respuesta.jsonl` contiene mensajes de alumnos. Los dos están en `.gitignore`: **no los subas al repo ni los compartas.**
