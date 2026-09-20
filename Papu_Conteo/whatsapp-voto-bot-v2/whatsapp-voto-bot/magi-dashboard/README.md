# Dashboard MAGI — Conteo de votos en vivo

Panel local (no expuesto a internet) estilo terminal MAGI/NERV que lee tu
`Padron.xlsx` y se actualiza solo cada vez que el bot registra un voto.

## Instalación

1. Copia la carpeta `magi-dashboard` **al lado** de la carpeta de tu bot (donde
   están `index.js`, `excelManager.js`, etc.), no adentro. Algo así:

   ```
   proyecto/
     bot/                <- tu bot actual (index.js, excelManager.js, data/Padron.xlsx...)
     magi-dashboard/      <- esta carpeta
   ```

2. Entra a la carpeta e instala dependencias:

   ```bash
   cd magi-dashboard
   npm install
   ```

3. Dile dónde está el Excel real (la ruta debe apuntar al MISMO archivo que
   usa el bot, no a una copia). Crea un archivo `.env` en `magi-dashboard/`:

   ```
   DASHBOARD_EXCEL_PATH=../bot/data/Padron.xlsx
   DASHBOARD_PORT=4141
   ```

   Ajusta la ruta según donde esté tu `data/Padron.xlsx` real. Si no pones
   nada, por defecto busca `../data/Padron.xlsx` relativo a esta carpeta.

4. Arranca el dashboard (con el bot corriendo o no, es independiente):

   ```bash
   npm start
   ```

5. Abre en tu navegador: **http://localhost:4141**

## Cómo funciona

- El servidor (`server.js`) observa el archivo Excel con `chokidar`. Cada vez
  que el bot guarda un voto (`excelManager.save()`), el dashboard detecta el
  cambio, vuelve a leer el libro completo y manda las estadísticas nuevas por
  WebSocket a todos los navegadores conectados. También refresca solo cada
  10s por si acaso.
- No escribe nada en el Excel — es de solo lectura, así que no hay riesgo de
  interferir con el bot ni con `runExclusive`.
- Tres unidades "MAGI" (una por hoja/grado: Primer, Segundo y Tercer año)
  muestran participación y el desglose de voto de esa hoja.
- El panel central muestra el conteo global de Tomas / Alex / Indeciso, %
  y una barra de participación general.
- Hay una gráfica de dona (distribución global) y una de barras apiladas
  (desglose por grado), un panel de alertas (discrepancias detectadas por el
  bot) y un registro de actividad con los últimos votos confirmados.

## Notas

- Es solo para verlo tú: no tiene autenticación ni HTTPS, no lo expongas
  fuera de tu máquina/red local.
- Si cambias el nombre de las hojas o agregas grados (Cuarto/Quinto año), el
  dashboard los detecta solo — recorre todas las hojas del libro, no hay
  nombres de hoja quemados en el código, solo la etiqueta "MAGI-N" para las
  que pasen de tres.
