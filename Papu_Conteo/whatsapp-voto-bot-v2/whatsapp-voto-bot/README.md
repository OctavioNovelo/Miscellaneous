# Bot de WhatsApp para registro de votos en Excel

Recibe mensajes de WhatsApp con este formato exacto (5 líneas):

```
Nombre
Seccion
Grado
Voto
Operador
```

Ejemplo:
```
Octavio Augusto Novelo Martinez
A
Segundo
Alex
Braulio
```

`Grado` acepta variantes razonables: "Primero"/"Primer"/"1", "Segundo"/"2",
"Tercero"/"Tercer"/"3", "Cuarto"/"4", "Quinto"/"5" (mayúsculas/minúsculas y
acentos no importan). Determina en cuál **hoja** del Excel se busca a la
persona (`Primer año`, `Segundo año`, `Tercer año`, etc.).

Y actualiza el archivo `data/Padron.xlsx`, marcando la fila en verde y colocando un `1`
en la columna del voto correspondiente (Tomas / Alex / Indeciso).

## 1. Instalación

```bash
cd whatsapp-voto-bot
npm install
cp .env.example .env
```

Edita `.env` con:
- `TELEGRAM_BOT_TOKEN`: token que te da @BotFather al crear el bot.
- `TELEGRAM_CHAT_ID`: el chat/grupo/canal al que se enviarán las alertas
  (puedes obtenerlo hablándole a @userinfobot o revisando `getUpdates` de tu bot).
- `EXCEL_PATH`: ruta al Excel (por defecto `./data/Padron.xlsx`, ya incluido y
  convertido desde tu CSV `LISTAS_A_X_D_Segundo_año_.csv`).

## 2. Ejecutar

```bash
npm start
```

La primera vez se mostrará un código QR en la terminal: escanéalo desde
WhatsApp → **Dispositivos vinculados**. La sesión se guarda localmente
(carpeta `.wwebjs_auth`), así que no tendrás que volver a escanear en cada
reinicio.

## 3. Lógica de negocio implementada

### Búsqueda (prioridad Grado → Sección → Nombre → Operador)
1. Se resuelve el **Grado** a una hoja del Excel (`Primer año`, `Segundo
   año`, `Tercer año`, ...). Si el grado no coincide con ninguna hoja
   existente, se avisa por Telegram como "grado no encontrado" y no se
   modifica nada.
2. Dentro de esa hoja, se filtran las filas por **Sección** (coincidencia
   exacta, A-G).
3. Dentro de esa sección se busca el mejor **Nombre** por similitud (tolera
   acentos, mayúsculas/minúsculas, orden de palabras y errores de tipeo
   leves — distancia de Levenshtein). Los nombres se muestran siempre
   normalizados en Título Case en las respuestas y notificaciones, sin
   importar cómo estén capturados en el Excel original.
4. Si hay dos nombres casi idénticos (empate), se usa el **Operador** para
   desempatar, comparando contra la columna "Operador Asignado" ya existente
   en tu padrón. Si sigue sin poder decidirse, se registra en la fila con
   mayor puntaje pero se avisa por Telegram como "coincidencia ambigua" para
   verificación manual.

### Registro del voto
- Si la fila **no** está marcada como confirmada (columna `Confirmado = NO`):
  se pone `1` en la columna de voto (Tomas/Alex/Indeciso), se llena
  `Confirmado = SI`, `Operador Confirmó`, fecha/hora, y **se pinta la fila de verde**.
- Si la fila **ya** está confirmada:
  - Mismo operador reportando de nuevo → se ignora (mensaje duplicado), no se
    toca el archivo.
  - Operador distinto → se revisan discrepancias (voto distinto, nombre
    distinto, etc.), se **pinta la fila de naranja** y se agrega el detalle en
    la columna "Discrepancia". **El voto original nunca se borra ni se
    sobreescribe** — sigue contando. Se envía un mensaje a Telegram con el
    número de fila y los parámetros que no coinciden.

> Nota de diseño: en vez de usar solo el color de la celda como "memoria" del
> sistema (frágil si alguien abre el Excel y cambia colores a mano), se agregó
> una columna `Confirmado` (SI/NO) que es la fuente de verdad real. El color
> verde/naranja es solo la capa visual que pediste, pero la lógica no depende
> de leer colores del archivo.

### Respuestas en WhatsApp vs. Telegram
Para no saturar al operador con mensajes, WhatsApp **solo responde** en dos casos:
- ✅ Voto registrado correctamente.
- ❌ Formato del mensaje inválido (para que el operador pueda corregir y reenviar).

Todo lo demás (duplicado ignorado, discrepancia entre operadores, nombre no
encontrado, sección inexistente, coincidencia ambigua) se queda **en silencio
en WhatsApp** y se reporta únicamente a **Telegram**, donde quien supervisa
puede revisar y actuar.

### Notificaciones a Telegram
Se envían automáticamente en estos casos:
- Discrepancia entre operadores.
- Nombre no encontrado en la sección indicada.
- Sección inexistente.
- Coincidencia ambigua entre dos nombres parecidos.
- Mensaje con formato inválido (si parece un intento de reporte de voto).

## 4. Estructura del Excel (una hoja por grado)

`data/Padron.xlsx` trae hoy 3 hojas, tomadas de tu archivo original
`LISTAS_A_X_D.xlsx`: `Primer año`, `Segundo año`, `Tercer año`. Todas
comparten exactamente las mismas columnas. Si más adelante agregas hojas
para `Cuarto año` o `Quinto año` con ese layout, el bot ya sabe reconocerlas
(no requiere cambios de código, solo que la hoja exista con ese nombre).

## 5. Estructura del proyecto

```
whatsapp-voto-bot/
├── data/
│   └── Padron.xlsx          ← tu Excel convertido, con columnas de control agregadas
├── src/
│   ├── index.js             ← arranca whatsapp-web.js y conecta todo
│   ├── excelManager.js       ← lee/escribe el Excel, aplica colores, detecta discrepancias
│   ├── matcher.js            ← normalización de texto y similitud de nombres
│   ├── messageParser.js       ← valida el formato de 4 líneas
│   └── telegramNotifier.js    ← envío de alertas a Telegram
├── .env.example
└── package.json
```

## 6. Columnas nuevas agregadas al Excel

| Columna | Uso |
|---|---|
| `Confirmado` | `SI`/`NO` — si el voto de esa persona ya fue contabilizado |
| `Voto Confirmado` | Tomas / Alex / Indeciso |
| `Operador Confirmó` | quién hizo el primer reporte válido |
| `Fecha Hora` | cuándo se registró el voto |
| `Discrepancia` | historial de discrepancias detectadas (no borra el voto) |

## 7. Sobre el dashboard estilo MAGI (Evangelion)

Es totalmente viable como siguiente fase: se puede exportar el estado del
Excel a JSON y montar un dashboard web (3 paneles estilo MAGI — por ejemplo
Tomas / Alex / Indecisos — con la tipografía monoespaciada, fondo negro y
acentos naranja/verde característicos, y actualización en vivo vía
WebSockets cada vez que `excelManager` guarda cambios). No se incluye en esta
entrega para mantener el bot central simple y estable primero; una vez que
el flujo de WhatsApp + Excel + Telegram esté probado en campo, se puede
construir el dashboard leyendo el mismo archivo (o migrando a una base de
datos ligera tipo SQLite si el volumen de mensajes es alto y quieres tiempo
real fino).

## 8. Limitaciones a tener en cuenta

- `whatsapp-web.js` requiere que el número usado quede vinculado como
  "dispositivo" de un WhatsApp normal; no es la API oficial de Meta, así que
  úsalo con un número dedicado y ten cuidado con los límites de WhatsApp
  ante envío/recepción masiva.
- Las escrituras al Excel están serializadas (una a la vez) para evitar
  corrupción si llegan varios mensajes casi simultáneos, pero con **muchos**
  operadores reportando en paralelo, migrar a una base de datos real
  (SQLite/Postgres) escalará mejor que un único archivo `.xlsx`.


