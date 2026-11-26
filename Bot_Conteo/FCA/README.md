# Bot de WhatsApp para conteo de votos en Excel

Un grupo de WhatsApp recibe los votos. El bot corre en tu número, lee los mensajes
del grupo, registra cada voto en `data/Padron.xlsx` y avisa a Telegram cuando algo
necesita revisión.

## 1. Formato del voto

Cada voto empieza con la palabra **VOTO**. Cualquier otro mensaje del grupo se
ignora en silencio.

```
VOTO
Octavio Augusto Novelo Martinez
Jade
```

| Línea | Qué es |
|---|---|
| `VOTO` | Obligatorio. Marca el mensaje como voto. |
| Nombre | Nombre y apellido (al menos dos palabras), tal como está en el padrón. Una persona por mensaje. Se busca en todos los grados y secciones. |
| Por quién votas | `Voto Omar`, `NO voto por Omar` o `No ha votado`. **Opcional**: si se omite, cuenta como Voto Omar. |

Si el nombre no está en el padrón, o la opción no es válida, el bot responde con el motivo y no registra nada.

Si el mensaje tiene solo `VOTO: Juan Perez`, el voto cuenta como Voto Omar.

También basta con mandar solo el nombre, en una sola línea y sin `VOTO` (p. ej. `Pepe Botellas`): cuenta como Voto Omar si la persona está en el padrón. Si no está, el bot lo ignora en silencio, para no contestar la charla del grupo.

### Quién puede votar

- Cualquier **participante del grupo** de votación.
- El **número del bot** (el tuyo) también cuenta sus votos.
- El bot solo mira el grupo indicado en `VOTACION_GRUPO_ID`. Los votos mandados por otro chat se ignoran.

## 2. Instalación

```bash
cd Bot_Conteo
npm install
cp .env.example .env
```

Edita `.env`:

- `VOTACION_GRUPO_ID`: id del grupo de votación (termina en `@g.us`). **Obligatorio**:
  sin él el bot no arranca.
- `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`: para las alertas (opcional, sin ellos
  las alertas solo aparecen en consola).
- `EXCEL_PATH`: ruta al padrón (por defecto `./data/Padron.xlsx`).
- `SECCIONES_VALIDAS`: por defecto `A,B,C,D,E,F,G`.

El padrón no viene en git (contiene datos personales). Copia tu `Padron.xlsx` a `data/`.

## 3. Ejecutar

```bash
npm start
```

La primera vez aparece un código QR en la terminal: escanéalo desde WhatsApp →
**Dispositivos vinculados**. La sesión queda en `.wwebjs_auth/`.

Pruebas:

```bash
npm test
```

## 4. Qué pasa con cada voto

### Búsqueda
1. Se busca el **Nombre** más parecido en todos los grados y secciones (tolera acentos, mayúsculas, orden de palabras y errores leves).
2. Si dos nombres empatan, se desempata con la columna **Operador**. Si sigue ambiguo, se usa la fila de mayor puntaje y se avisa por Telegram.

**El bot nunca agrega personas nuevas.** Si el nombre no existe, no toca el Excel y avisa por Telegram.

### Registro
- Persona **sin confirmar**: se marca la columna del candidato con `1` (las demás quedan en blanco), `Confirmado = SI`, se guarda operador y fecha, y la fila se pinta de verde.
- Persona **ya confirmada** con el **mismo voto**: se ignora (duplicado) y Telegram lo registra como aviso.
- Persona **ya confirmada** con **voto distinto**: la fila se pinta de naranja y se agrega una nota en `Discrepancia`. **El voto original nunca se borra**; Telegram avisa.

Cada guardado se hace de forma atómica (archivo temporal + renombrado) y en serie, así
que dos votos casi simultáneos no corrompen el Excel. Si un guardado falla, el bot
recarga el archivo del disco para no quedar con votos que no se escribieron, y avisa
por Telegram con los nombres pendientes.

Antes de registrar cada voto, el bot compara la fecha del archivo con la de su último
guardado. Si cambió (alguien lo editó a mano), recarga del disco y registra sobre esa
versión, así que no pisa la edición. Aun así, lo más seguro es detener el bot antes de editar.

Al arrancar, el bot copia el padrón a `data/Padron.backup-<fecha-hora>.xlsx`.

### Respuestas
- En el grupo, el bot responde **citando el mensaje** cuando hay algo que decir: lo registrado, lo no registrado con el motivo, o el formato inválido.
- Telegram recibe además el detalle de discrepancias, duplicados, nombres no encontrados, ambigüedades y fallos de guardado.
- **Regla para operadores:** si el bot no responde, el voto no contó; reenviarlo. Sin negritas (`*VOTO*` se ignora) y sin editar el mensaje (una edición no se procesa).

### Alertas a Telegram
- Discrepancia entre votos.
- Nombre no encontrado.
- Coincidencia ambigua (se registra la mejor coincidencia y se avisa).
- Formato inválido.
- Fallo de guardado (con operador y nombres pendientes).
- Desconexión o fallo de autenticación de WhatsApp, y al reconectar (con la hora, para revisar votos enviados durante una caída).

## 5. Estructura del Excel

`data/Padron.xlsx` se genera desde la hoja de Google con `node src/normalizarPadron.js <carpeta-csv> data/Padron.xlsx`.
Tiene una hoja por grado (`Primer año` a `Noveno año`) más `OTROS`. Las columnas se leen por **nombre de encabezado**, no por posición. Cada
hoja debe tener `Salon` (o `Seccion`), `Nombre` y las columnas de opción `Voto Omar`,
`NO voto por Omar` y `No ha votado`; si falta alguna, el bot no arranca.

| Columna | Uso |
|---|---|
| `Salon` (sección), `Nombre`, `Número Tel.` | Datos de la persona |
| `Voto Omar` … `No ha votado` | Marca `1` en la opción elegida (`No ha votado` para quien no ha votado) |
| `Operador` | Operador asignado; para desempatar nombres parecidos |
| `Confirmado` | `SI`/`NO`: fuente de verdad de si el voto ya se contó. Se agrega al cargar si no existe |
| `Voto Confirmado` | Nombre del candidato votado |
| `Operador Confirmo` | Quién registró el primer voto válido |
| `Fecha/Hora` | Cuándo se registró |
| `Discrepancia` | Historial de discrepancias (no borra el voto) |

Las personas agregadas a `OTROS` a mano se buscan como cualquier otra hoja; el bot nunca agrega filas.

**Marcas supuestas.** Al generar el padrón, todas las filas salen con `Confirmado = NO`. El `1` que
trae cada fila en `Voto Omar`, `NO voto por Omar` o `No ha votado` es solo una suposición de la lista.
Al registrar un voto, el bot:
- Si la persona no está confirmada: pone `1` en la opción elegida, borra las otras marcas y confirma.
  El aviso dice si confirmó el supuesto, lo cambió por otra opción, o si no tenía supuesto.
- Si ya está confirmada: duplicado si es la misma opción; discrepancia si es distinta (no cambia el voto).

## 6. Dashboard MAGI

`magi-dashboard/` muestra el conteo en vivo leyendo el mismo `Padron.xlsx`.

```bash
cd magi-dashboard
npm install
npm start
```

Abre `http://127.0.0.1:4141`. Solo escucha en local.

Si el padrón está en otro lugar, crea `magi-dashboard/.env` con
`DASHBOARD_EXCEL_PATH=/ruta/al/Padron.xlsx`. Las rutas relativas se resuelven desde
la carpeta `magi-dashboard/`.

## 7. Limitaciones

- `whatsapp-web.js` no es la API oficial de WhatsApp. Usa un número dedicado y ten
  cuidado con los límites de envío.
- Todo el conteo vive en un solo `.xlsx`. Con muchos operadores en paralelo, una base de
  datos (SQLite/Postgres) escala mejor.
- La identidad del votante es su contacto de WhatsApp (nombre que muestra), no un número
  verificado contra una lista. Si necesitas que solo voten números concretos, hay que
  agregar una lista de números autorizados.
