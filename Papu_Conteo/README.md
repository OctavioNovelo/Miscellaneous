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
A
Segundo
Tomas
```

| Línea | Qué es |
|---|---|
| `VOTO` | Obligatorio. Marca el mensaje como voto. |
| Nombre | Nombre completo tal como está en el padrón. Puedes poner varios, uno por línea (misma Sección y Grado). |
| Sección | `A` a `G`. |
| Grado | `Primero`/`Primer`/`1`, `Segundo`/`2`, `Tercero`/`Tercer`/`3`, `Cuarto`/`4`, `Quinto`/`5` (no importan mayúsculas ni acentos). |
| Voto | `Tomas`, `Alex` o `Indeciso`. **Opcional**: si se omite, cuenta como Alex. |

También funciona en una sola línea: `VOTO: Juan Perez C Segundo`.

### Quién puede votar

- Cualquier **participante del grupo** de votación.
- El **número del bot** (el tuyo) también cuenta sus votos.
- El bot solo mira el grupo indicado en `VOTACION_GRUPO_ID`. Los votos mandados por otro chat se ignoran.

## 2. Instalación

```bash
cd Papu_Conteo
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
1. El **Grado** elige la hoja (`Primer año`, `Segundo año`, …). Si no existe, no se registra nada.
2. Se filtran las filas por **Sección**.
3. Se busca el **Nombre** más parecido (tolera acentos, mayúsculas, orden de palabras y errores leves).
4. Si dos nombres empatan, se desempata con la columna **Operador Asignado**. Si sigue ambiguo, se usa la fila de mayor puntaje y se avisa por Telegram.

**El bot nunca agrega personas nuevas.** Si el nombre, la sección o el grado no existen,
no toca el Excel y avisa por Telegram.

### Registro
- Persona **sin confirmar**: se marca el voto, `Confirmado = SI`, se guarda operador y fecha, y la fila se pinta de verde.
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
- Sección o grado inexistentes.
- Coincidencia ambigua (se registra la mejor coincidencia y se avisa).
- Formato inválido.
- Fallo de guardado (con operador y nombres pendientes).
- Desconexión o fallo de autenticación de WhatsApp, y al reconectar (con la hora, para revisar votos enviados durante una caída).

## 5. Estructura del Excel

`data/Padron.xlsx` tiene una hoja por grado: `Primer año`, `Segundo año`, `Tercer año`,
`Cuarto año`, `Quinto año`, y `Revisar_Manual` (no se usa para votos).
Todas las hojas de grado comparten columnas:

| Columna | Uso |
|---|---|
| `Seccion`, `Nombre`, `Telefono` | Datos del padrón |
| `Tomas`, `Alex`, `Indeciso` | Marca `1` en la columna del voto |
| `Operador Asignado` | Para desempatar nombres parecidos |
| `Confirmado` | `SI`/`NO`: fuente de verdad de si el voto ya se contó |
| `Voto Confirmado` | `Tomas` / `Alex` / `Indeciso` |
| `Operador Confirmo` | Quién registró el primer voto válido |
| `Fecha/Hora` | Cuándo se registró |
| `Discrepancia` | Historial de discrepancias (no borra el voto) |

Al arrancar, las personas precargadas como Tomas o Indeciso se marcan como confirmadas
(precarga inicial). Es idempotente.

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
