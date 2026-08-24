# reservasCafeterias · UIS

Prototipo web para que **el personal de las cuatro cafeterías** de la
**Universidad Industrial de Santander** registre y consulte las reservas de
almuerzo del día.

### Quién lo usa

Es una herramienta interna, **no una página para los comensales**. Tiene dos
públicos y dos pantallas:

| | Quién | Dónde | Qué hace |
|---|---|---|---|
| **Mostrador** | Personal de cafetería | `index.html` → `reserva.html` | Registra, corrige y cancela las reservas **de hoy**, de **su** cafetería |
| **Administración** | Coordinación / Bienestar | `admin.html` | Consulta el **histórico** de todas las sedes, consolida, exporta y mantiene el catálogo |

En la de mostrador, quien la abre es quien atiende, y anota la reserva a nombre
de otra persona. Eso explica varias decisiones que de otro modo parecerían
arbitrarias:

- Los textos dicen «registrar reserva», no «reserva tu almuerzo», y los
  mensajes hablan de la persona en tercera persona.
- Los campos del formulario llevan `autocomplete="off"`: el navegador
  ofrecería los datos de quien teclea —el empleado— y no los del comensal, en
  un formulario que se rellena decenas de veces al día con datos ajenos.
- La tabla muestra el **móvil de contacto** de cada reserva, que es lo que la
  cafetería necesita para avisar a alguien. En una página pública eso sería un
  problema de privacidad; en una pantalla de mostrador es el dato útil.
- Cualquier reserva se puede editar desde la tabla, porque quien corrige un
  nombre mal escuchado es el personal, no el comensal.

HTML + CSS + JavaScript vanilla con módulos ES nativos. Sin framework, sin
build, sin dependencias.

---

## Cómo abrirlo

Los módulos ES **no funcionan con `file://`** (el navegador los bloquea por
CORS). Hay que servir la carpeta por HTTP:

```powershell
npx serve .
# o, si hay Python:
python -m http.server 8000
```

En VS Code también sirve la extensión **Live Server** (clic derecho sobre
`index.html` → *Open with Live Server*).

Luego: `http://localhost:3000` (o el puerto que indique el comando).

---

## Estructura

```
reservasCafeterias/
├── index.html                 Inicio: las 4 cafeterías
├── reserva.html               Plantilla única, lee ?cafeteria=<id>
├── admin.html                 Módulo de administración (3 pestañas)
│
├── CONTRATO.md                LO QUE DEBE CUMPLIR CUALQUIER BACKEND
├── package.json               Solo declara "type": module. NO instala nada
│
├── apps-script/
│   └── Codigo.gs              BACKEND: pegar en Apps Script (no se sirve)
│
├── pruebas/
│   └── contrato.mjs           CONTRATO.md, ejecutable
│
├── assets/img/logo-uis.webp   Logo institucional
│
├── css/
│   ├── base.css               Reset + variables de diseño (:root)
│   ├── componentes.css        Marca, botón, tarjeta, tabla, modal, campos
│   ├── paginas.css            Cabecera, pie, index, reserva, móvil
│   └── admin.css              Solo el módulo de administración
│
└── js/
    ├── config.js              ← INTERRUPTOR: FUENTE_DATOS y API_BASE_URL
    │
    ├── services/              ← CAPA DE DATOS (la única que cambia al migrar)
    │   ├── api.js             Selector de transporte + ErrorServicio + pedir()
    │   ├── httpClient.js      fetch al backend real (hoy sin uso)
    │   ├── cafeteriasService.js
    │   ├── menuService.js
    │   └── reservasService.js
    │
    ├── mock/                  ← DATOS SIMULADOS (se borra entera al migrar)
    │   ├── mockApi.js         Enrutador que imita el contrato de Apps Script
    │   ├── cafeterias.js
    │   ├── menuSemanal.js
    │   └── reservas.js
    │
    ├── ui/                    ← INTERFAZ (no conoce el mock ni el fetch)
    │   ├── dom.js             Helpers, bloques de estado, crearSVG
    │   ├── tarjetaCafeteria.js
    │   ├── tablaReservas.js
    │   ├── modalReserva.js         Comportamiento del formulario
    │   ├── modalConfirmacion.js    Confirmar acciones destructivas
    │   ├── accesoAdmin.js         Pestillo de admin.html (no es seguridad)
    │   ├── marcadoModalReserva.js  Su marcado, compartido por las 2 páginas
    │   ├── graficas.js             SVG a mano: columnas, barras, indicadores
    │   ├── adminReservas.js        Tabla de detalle del administrador
    │   ├── adminConsolidado.js     Indicadores + gráficas + tablas de totales
    │   └── adminCatalogo.js        Cafeterías y carta semanal
    │
    ├── utils/
    │   ├── fechas.js          Rangos, semanas, formatos
    │   ├── telefono.js        Normaliza y formatea el móvil
    │   ├── idReserva.js       El identificador 01-260823-001
    │   ├── texto.js           Slugs y búsqueda sin acentos
    │   ├── csv.js             Exportación que Excel abre bien
    │   └── url.js
    │
    ├── paginaInicio.js        Entrada de index.html
    ├── paginaReserva.js       Entrada de reserva.html
    └── paginaAdmin.js         Entrada de admin.html
```

### La regla que sostiene todo

**La UI nunca importa de `js/mock/`.** Solo llama a funciones de
`js/services/`. Un solo archivo del proyecto —`js/services/api.js`— sabe que
el mock existe.

```
paginaReserva.js  →  reservasService.js  →  api.js  →  mockApi.js   (hoy)
                                                    ↘  httpClient.js (mañana)
```

---

## Flujo de la pantalla de mostrador

**`index.html`** pide `getCafeterias()` y pinta una tarjeta por cafetería. Cada
tarjeta enlaza a `reserva.html?cafeteria=<id>`.

**`reserva.html`** lee el `id` de la URL y:

1. `getCafeteria(id)` → nombre y ubicación en el encabezado.
   Si hoy es **sábado o domingo**, se para aquí: aviso de día sin servicio,
   botón deshabilitado y nada de tabla.
2. `getReservasDelDia(id)` → tabla de hoy (Nombre · Menú · Móvil · Editar).
3. Al pulsar **Registrar reserva**: `getMenuDelDia()` y se abre el modal con
   los platos de hoy.
4. Al confirmar: `crearReserva(...)`, se cierra el modal, aparece el aviso de
   éxito y **la tabla se recarga desde el servicio** — sin recargar la página.
5. Al pulsar **Editar** en una fila: el mismo modal, ya relleno y con el
   historial de esa reserva. Al guardar: `actualizarReserva(...)`.
6. Dentro de ese modal está **Cancelar reserva**: confirmación y
   `cancelarReserva(id)`. La fila desaparece de la tabla; el registro y su
   historial se conservan.

La fila **solo ofrece «Editar»**. Cancelar vive un nivel más adentro a
propósito: es la única acción que destruye algo, y no debe estar a un clic de
distancia en una lista de veinte filas, donde se pulsa la de al lado sin
querer. Para llegar a ella hay que abrir la reserva concreta —y verla— antes.

Se recarga la tabla en vez de tocar la fila a mano a propósito: así lo que se
ve siempre es lo que devolvió el servidor, no lo que el cliente supone.

### Confirmar antes de destruir

Cancelar una reserva, cerrar una cafetería o descartar una carta a medio
escribir pasan por `ui/modalConfirmacion.js`, un `<dialog>` con el mismo
lenguaje visual que el formulario de reserva. Sustituye al `confirm()` del
navegador, que se ve como una alerta del sistema, dice «Aceptar» sin decir a
qué, y **bloquea el hilo** mientras está abierto.

Devuelve una promesa: `if (confirm(...))` pasa a ser `if (await confirmar(...))`.

Tres detalles que importan en una acción destructiva:

- **El botón dice qué hace** —«Sí, cancelar la reserva»— y no «Aceptar». Quien
  lee solo los botones tiene que poder decidir.
- **El foco arranca en «Volver»**, no en el botón rojo: un Enter reflejo sobre
  un diálogo recién aparecido no debe borrar nada.
- **Escape y el clic en el fondo cuentan como «no»**. El diálogo resuelve en un
  único punto —el evento `close`—, así que ninguna forma de cerrarlo puede
  dejar la promesa colgada ni ejecutar la acción por accidente.

`.boton--peligro` existe solo para ese botón: en la fila de una tabla, un rojo
repetido diez veces deja de significar «cuidado» y pasa a ser decoración.

### Un solo modal para crear y para editar

Los campos son los mismos, así que duplicar el formulario garantizaría que un
día se corrija la validación en uno y no en el otro. `ui/modalReserva.js` abre
en modo creación con `abrir({ menu })` y en modo edición con
`abrir({ menu, reserva })`; lo que cambia es el título, la nota, el texto del
botón, los valores de partida y si se muestra el historial.

---

## Módulo de administración (`admin.html`)

### La clave de acceso es un pestillo, no una cerradura

`admin.html` pide una clave antes de mostrar nada. **Léase esto antes de
confiar en ella:** sin backend, todo el código y todos los datos viajan al
navegador de quien abra la página, así que **cualquiera con las herramientas
de desarrollo se la salta en veinte segundos**. Su único trabajo es que quien
llegue por casualidad a la URL no se encuentre dentro del histórico.

La protección real solo puede vivir en el servidor. Cuando Apps Script esté en
marcha, es él quien tiene que validar la sesión y **negarse a devolver datos**
sin ella; entonces esto se sustituye, no se complementa.

Con esa advertencia hecha, lo que sí hace bien:

- **Falla cerrado.** `#contenido` lleva `hidden` en el propio HTML, así que si
  el módulo de acceso no cargara, la pantalla se queda cerrada, no abierta.
- **Guarda el SHA-256, no la clave.** No lo hace más fuerte; evita que la
  clave —que casi seguro se reutiliza en otro sitio— quede escrita en claro en
  el repositorio.
- **La sesión vive en `sessionStorage`**, no en `localStorage`: se cierra al
  cerrar la pestaña. En un equipo compartido, dejarla abierta para siempre es
  peor que pedir la clave cada mañana. Hay además un botón de **Cerrar
  sesión**, que recarga la página para no dejar en memoria lo que se estaba
  consultando.
- **No da pistas**: la clave falla siempre con el mismo mensaje.

**La clave actual es `AdminSilvia` y hay que cambiarla.** Se pega esto
en la consola del navegador y el resultado va a `HASH_CLAVE_ADMIN` en
`js/config.js`:

```js
crypto.subtle.digest('SHA-256', new TextEncoder().encode('MI-CLAVE'))
  .then(b => console.log([...new Uint8Array(b)]
    .map(x => x.toString(16).padStart(2, '0')).join('')));
```

Un detalle que muerde: `crypto.subtle` **solo existe en contexto seguro** —
https, o http en `localhost` y `127.0.0.1`. Servida desde una IP de la red
local por http, no está, y la pantalla lo dice con esas palabras en vez de
fallar en silencio.


Tres pestañas. Las dos primeras comparten la barra de filtros; en la tercera se
retira, porque allí no pinta nada.

### Reservas

Filtro por **rango de fechas** (con presets: hoy, esta semana, la pasada,
últimos 30 días, este mes, el pasado, todo), **cafetería**, **estado** y
**texto** (nombre o móvil, sin distinguir acentos). Tabla de detalle con
Fecha · Cafetería · Nombre · Móvil · Menú · Estado, y el botón de editar en
cada fila activa. Cancelar está dentro de ese modal, igual que en mostrador.

**La tabla muestra como mucho 500 filas**, pero el pie dice siempre cuántas
casan de verdad con el filtro, y **la exportación se lleva todas**. Pedir
`limite: 0` solo al exportar es deliberado: renderizar mil quinientas filas
para mirarlas por encima no sirve de nada, pero exportar una página en vez del
reporte completo sería la peor clase de error, porque el archivo *parece*
correcto.

### Consolidado

Cuatro indicadores, y tres bloques de **gráfica + tabla con los mismos
números**: activas por día, por cafetería y platos más pedidos. La tabla no es
redundancia — la gráfica da la forma de un vistazo, la tabla da el valor exacto
que se copia a un informe, y es lo que hace la pantalla utilizable con lector
de pantalla, donde un SVG no dice nada.

Las gráficas son SVG dibujado a mano, sin librerías. Todas son de **serie
única** y de un solo color (el verde institucional): lo que hay que leer aquí
es la magnitud, no distinguir series entre sí, y una sola tonalidad se lee
mejor y no depende de distinguir colores. Las canceladas no van como segunda
serie: están en los indicadores, en las tablas y en el filtro de estado.

Si el rango pasa de seis semanas, la serie diaria **se agrupa por semanas** y
el subtítulo lo dice — noventa columnas de dos píxeles no se leen.

Los platos se cuentan **solo sobre reservas activas**: un consolidado de
consumo que sume las canceladas manda a cocinar de más.

### Catálogo

- **Cafeterías**: crear, editar, cerrar y reabrir. El `id` sale del nombre y
  **no es editable**: es la clave con la que miles de reservas históricas
  apuntan a esa cafetería. Cerrar es otro borrado lógico (`activa: false`).
- **Carta semanal**: una sola carta para todo el campus. Se elige la semana y
  se editan los siete días de una vez. Cuatro decisiones para que actualizarla
  cada semana no duela:
  - **Una caja de texto por día, un plato por línea**, y no campos numerados
    con botones de añadir y quitar: el número de platos cambia de un día a
    otro, y así además se puede pegar la carta desde un documento de un tirón.
  - **Un solo botón «Guardar semana»**. Publicar la carta es una tarea
    semanal, no siete diarias. La escritura es atómica: si un día trae un
    plato repetido, no se guarda ninguno — no puede quedar media semana
    publicada.
  - **«Copiar semana anterior»**, que es el atajo que de verdad ahorra
    trabajo: la mayoría de las semanas se parecen a la anterior, y corregir
    cuatro platos es mucho menos que escribir veintiuno. Deja los días
    marcados como pendientes, porque copiar no es publicar.
  - **Los días con cambios sin guardar se marcan**, y cambiar de semana,
    copiar encima o cerrar la pestaña pide confirmación antes de perderlos.
  - **Sábado y domingo son de solo lectura**: no hay servicio, así que no hay
    carta que publicar. «Copiar semana anterior» también los respeta.

  Dejar un día laborable vacío es la forma de decir «ese día no hay carta».

### Exportación a CSV

Pensada para que Excel la abra bien: **BOM UTF-8** (sin él «Cafetería» sale
como «CafeterÃ­a») y una primera línea `sep=;` (sin ella, un CSV de comas cae
entero en la primera columna en un Excel configurado en español). El precio es
que un lector que no entienda `sep=` verá esa línea como una fila más.

---

## Modelo de datos

Los mocks usan **`snake_case`**, igual que las columnas de una hoja de cálculo.
La conversión a `camelCase` la hace cada servicio en su función `normalizar`,
que es la frontera entre la forma de la API y la forma de la UI.

| Hoja / tabla   | Campos |
|---|---|
| `Cafeterias`   | `id` · `codigo` · `nombre` · `ubicacion` · `imagen` · `activa` |
| `MenuSemanal`  | `id` · `fecha` · `opciones[{id, nombre}]` |
| `Reservas`     | `id` · `nombre` · `telefono` · `cafeteria_id` · `fecha` · `menu_id` · `menu_nombre` · `medio` · `pago` · `estado` · `timestamp` · `historial[]` |

Las fechas viajan como `'YYYY-MM-DD'` en hora local. `utils/fechas.js` no usa
`toISOString()`: convierte a UTC y en Colombia (UTC−5) devolvería el día
anterior toda la mañana y la tarde.

### Sábados y domingos no hay servicio

La regla vive en **un solo sitio**, `utils/fechas.js`:

```js
export const DIAS_SIN_SERVICIO = [5, 6];   // 0 = lunes … 6 = domingo
export function esDiaDeServicio(fechaISO) { … }
```

Si algún día se abre los sábados, se quita el `5` de ahí y se acabó. Lo usan
las cuatro capas que tienen algo que decir al respecto:

- **`mock/menuSemanal.js`** no publica carta en fin de semana: sin servicio no
  hay nada que publicar, y una carta ahí haría creer que se puede reservar.
- **`mock/reservas.js`** no genera historial esos días — sembrar datos que la
  propia API rechazaría sería una trampa que se paga en la primera prueba.
- **`mockApi.js`** rechaza `reservas.crear` con `SIN_SERVICIO`, y rechaza
  publicar platos en un día sin servicio. Se comprueba en el servidor y no
  solo en la pantalla: el fin de semana tampoco hay carta, así que sin esta
  regla el rechazo llegaría como `MENU_INVALIDO` —«ese plato no está en la
  carta»—, que es cierto pero no explica nada a quien está en el mostrador.
- **`reserva.html`** deshabilita el botón y sustituye la tabla por una
  explicación. Sin eso quedaría un «Todavía no hay reservas para hoy · Usa
  Registrar reserva para anotar la primera» que invita a algo imposible.

En el editor de la carta, sábado y domingo aparecen apagados y **de solo
lectura**. Se dejan a la vista, y no ocultos, para que la semana se lea
completa y no parezca que falta un día por rellenar.

#### Probar en fin de semana

Hay un interruptor para poder validar el sistema un sábado o un domingo:
`PERMITIR_FIN_DE_SEMANA`, con una constante **en cada lado**.

| Dónde | Qué |
|---|---|
| `js/config.js` | `export const PERMITIR_FIN_DE_SEMANA = …` |
| `apps-script/Codigo.gs` | `const PERMITIR_FIN_DE_SEMANA = …` + **versión nueva** de la implementación |

Son dos porque la regla se aplica en los dos sitios a propósito: el frontend
avisa y **el backend decide**. Cambiar solo uno no sirve de nada.

Mientras está encendido, tres cosas lo recuerdan para que no se quede así:

- La pantalla de mostrador muestra una banda de aviso en cada carga.
- `node pruebas/contrato.mjs` **falla** y dice por qué, salvo que se le pase
  `--sin-regla-fin-de-semana` para reconocerlo a propósito.
- `pruebas/contrato.mjs` comprueba además que las dos constantes declaren lo
  mismo.

Si se queda encendido en producción, el personal podrá registrar reservas de
sábado y domingo que la cocina no va a ver nunca.

### La carta es del día, no de la cafetería

Las cuatro sedes sirven el mismo menú, así que `MenuSemanal` se indexa **solo
por fecha**. Antes había una columna `cafeteria_id` y una carta por sede; se
quitó porque una columna que repite el mismo valor cuatro veces no es un dato,
es una mentira que confunde a quien abra la hoja — y porque multiplicaba por
cuatro el trabajo de publicar la carta cada semana.

Si algún día las cartas vuelven a divergir por sede, esto es lo que hay que
deshacer: la columna vuelve a la hoja, las tres acciones `menu.*` vuelven a
recibir el id y `menuService.js` lo vuelve a pasar. **La interfaz no cambia**,
porque pide la carta al servicio y pinta lo que llegue.

Los móviles se guardan **normalizados a diez dígitos sin separadores**
(`'3001234567'`). `utils/telefono.js` acepta espacios, guiones y el prefijo
`+57` al escribir, y devuelve siempre esa forma: es lo que permite comparar dos
números para detectar una reserva duplicada. El formato bonito
(`300 123 4567`) es solo de presentación.

### Historial de cada reserva

Cada reserva lleva un `historial[]` de asientos, del más antiguo al más
reciente:

```jsonc
{
  "tipo": "creacion" | "modificacion" | "cancelacion",
  "timestamp": "2025-08-23T13:05:00.000Z",
  "cambios": [ { "campo": "menu", "antes": "Bandeja paisa", "despues": "Lasaña" } ]
}
```

Cuatro decisiones deliberadas:

- **Lo escribe el servidor, no el cliente.** El historial es el registro de lo
  que de verdad pasó, y el navegador no puede saberlo: dos personas editando la
  misma reserva verían cada una solo su propio cambio.
- **`cambios` guarda el valor visible, no el id.** `'Bandeja paisa'` se entiende
  dentro de un año; `'bandeja-paisa'` obliga a cruzar tablas.
- **La creación es el primer asiento.** Así el historial nunca está vacío y la
  fecha de alta no depende de un campo aparte.
- **Guardar sin cambiar nada devuelve `SIN_CAMBIOS`** en vez de escribir un
  asiento vacío, que es justo lo que un registro de cambios no debe tener.

En Google Sheets `historial` es una columna JSON, igual que `opciones` en
`MenuSemanal`: una hoja no tiene arreglos, así que se guarda serializada.

### Contrato de la API

Un único endpoint que recibe `{ accion, params }` y responde **siempre** con el
mismo sobre:

```jsonc
{ "ok": true,  "data": … }
{ "ok": false, "error": { "codigo": "RESERVA_DUPLICADA", "mensaje": "…" } }
```

Acciones implementadas en el mock (y que deberá implementar el backend):

| Acción | Params | Devuelve |
|---|---|---|
| `cafeterias.listar` | — | array de cafeterías |
| `cafeterias.obtener` | `id` | una cafetería |
| `menu.delDia` | `fecha` | `{fecha, opciones[]}` |
| `reservas.delDia` | `cafeteria_id`, `fecha` | array de reservas, en orden de llegada |
| `reservas.crear` | los campos de la reserva | la reserva creada |
| `reservas.actualizar` | `id`, `nombre`, `telefono`, `menu_id` | la reserva ya modificada, con el nuevo asiento en su historial |
| `reservas.cancelar` | `id` | la reserva ya cancelada |
| `reservas.buscar` | `desde`, `hasta`, `cafeteria_id?`, `estado?`, `texto?`, `limite?` | `{total, reservas[], resumen}` |
| `cafeterias.crear` | `nombre`, `ubicacion?` | la cafetería creada |
| `cafeterias.actualizar` | `id`, `nombre`, `ubicacion` | la cafetería modificada |
| `cafeterias.archivar` / `.reactivar` | `id` | la cafetería con su nuevo estado |
| `menu.semana` | `lunes` | los 7 días de esa semana |
| `menu.guardarSemana` | `lunes`, `dias[{fecha, platos[]}]` | la semana ya guardada |

`cafeterias.listar` acepta además `incluir_inactivas`: la pantalla de mostrador
no debe ofrecer una cafetería cerrada, pero el administrador tiene que verlas
todas o no podría consultar el histórico de una que ya cerró.

`reservas.actualizar` no recibe `cafeteria_id` ni `fecha`: no son editables, y
dejarlas fuera de la firma evita que una pantalla futura las cambie por
descuido.

Códigos de error de negocio ya manejados por la UI:
`CAFETERIA_NO_ENCONTRADA`, `CAFETERIA_DUPLICADA`, `RESERVA_NO_ENCONTRADA`,
`RESERVA_CANCELADA`, `DATOS_INCOMPLETOS`, `MENU_INVALIDO`, `MENU_DUPLICADO`,
`RESERVA_DUPLICADA`, `SIN_CAMBIOS`, `RANGO_INVALIDO`, `SIN_SERVICIO`.

### La cancelación es un borrado lógico

`reservas.cancelar` **no borra la fila**: le pone `estado: 'cancelada'` y le
añade un asiento de tipo `cancelacion`. La reserva desaparece de la pantalla
porque `reservas.delDia` filtra por estado, así que se ve igual que un borrado,
pero el registro sobrevive.

Borrar de verdad tiraría el historial justo del caso que más interesa auditar
—«esta persona reservó y luego se canceló»— y en una hoja de cálculo compartida
no habría forma de recuperarlo.

Dos consecuencias que el mock ya respeta:

- Una reserva cancelada **no bloquea** un duplicado: si alguien canceló por la
  mañana y vuelve al mostrador, puede reservar otra vez con el mismo móvil.
- Una reserva cancelada **no se puede editar**: devuelve `RESERVA_CANCELADA`.

El mock **valida duplicados, menú y cambios** a propósito: son reglas que el
backend tendrá que aplicar de todos modos, y tenerlas hoy obliga a que el
frontend ya sepa mostrar esos mensajes. Un duplicado es *el mismo móvil, la
misma cafetería y el mismo día*; al editar, la reserva se excluye a sí misma de
esa comprobación, o no se podría guardar sin cambiar de número.

---

## Migración al backend real

> **El contrato completo está en [CONTRATO.md](CONTRATO.md)**, con las formas
> exactas, las reglas de negocio y un esquema SQL de partida. Y es ejecutable:
>
> ```bash
> node pruebas/contrato.mjs                    # contra el mock
> node pruebas/contrato.mjs <URL>              # solo lectura: seguro en producción
> node pruebas/contrato.mjs <URL> --escribir   # incluye las de escritura
> ```
>
> Verde = ese backend sirve. Es la misma prueba que pasan el mock y Apps
> Script, así que no hay discusión sobre si «antes funcionaba».

El backend ya está escrito: **`apps-script/Codigo.gs`**. Implementa las mismas
14 acciones, con el mismo sobre y las mismas reglas de negocio.

### Puesta en marcha, paso a paso

1. Crea una hoja de cálculo nueva en Google Sheets.
2. **Extensiones → Apps Script**, y pega `apps-script/Codigo.gs` entero.
3. Ejecuta una vez la función **`configurarHojas`** desde el editor. Crea las
   tres pestañas con sus cabeceras exactas y siembra las cuatro cafeterías.
   Es idempotente: ejecutarla dos veces no duplica nada.
4. Ejecuta **`probarDesdeElEditor`** y mira el registro. Si algo está mal
   montado, sale ahí antes de desplegar.
5. **Implementar → Nueva implementación → Aplicación web**, con
   *Ejecutar como: Yo* y **Quién tiene acceso: cualquier usuario**.
6. En `js/config.js`: `FUENTE_DATOS = 'api'` y `API_BASE_URL = '<URL /exec>'`.

Eso es todo: **dos líneas en el frontend**. Borrar `js/mock/` y su `import` en
`api.js` es limpieza posterior, no un requisito para que funcione.

Lo primero que hay que hacer con el sistema en marcha es **publicar la carta
de la semana** desde Catálogo: sin carta no se puede registrar nada, y la hoja
empieza vacía.

### Tres cosas que muerden

- **Apps Script no responde al preflight de CORS.** Por eso `httpClient.js`
  manda `Content-Type: text/plain`: así la petición es «simple» y no lo
  dispara. `e.postData.contents` llega igual.
- **Si el despliegue no es «cualquier usuario»**, el `fetch` recibe el HTML de
  la pantalla de login de Google en vez de JSON. El síntoma es
  `RESPUESTA_INVALIDA`; la causa es esa.
- **Editar el script no basta: hay que crear una versión nueva** de la
  implementación. Guardar deja la URL `/exec` sirviendo la versión anterior, y
  parece que los cambios no hacen nada.

### Detalles que ya están resueltos en el script

- **Bloqueo solo en las escrituras.** Dos reservas simultáneas del mismo móvil
  podrían pasar las dos la comprobación de duplicado si cada una lee antes de
  que la otra escriba, así que toda acción que escriba toma el bloqueo de
  script. Las consultas no: dos lecturas no pueden pisarse, y tomarlo también
  para ellas ponía en cola a las cuatro cafeterías unas detrás de otras.
  Qué acción escribe está declarado en `ACCIONES_QUE_ESCRIBEN`; **una acción
  nueva que escriba y no se apunte ahí se queda sin bloqueo**.
  `TIMEOUT_HTTP_MS` está por encima de esa espera a propósito: si el cliente
  se rindiera antes, el trabajo seguiría en Google y quien atiende volvería a
  pulsar el botón.
- **Dos cachés, para no releer lo mismo.** Una dura una petición y evita que
  una acción lea dos veces la misma pestaña. La otra dura `VIDA_CACHE_S` (dos
  minutos) y se comparte entre peticiones, pero solo para `Cafeterias` y
  `MenuSemanal` —nunca `Reservas`, que cambia con cada registro— y nunca para
  la tabla que la acción va a escribir: los objetos llevan `_fila`, y escribir
  con un `_fila` caducado es escribir en la fila de al lado. Toda escritura
  invalida su tabla, así que un cambio hecho desde la aplicación se ve al
  instante. **Un cambio hecho a mano en la hoja puede tardar hasta dos minutos
  en verse**, porque editar una celda no puede avisar a nadie.
- **Fechas y móviles como texto.** Si la hoja los interpreta, `'2026-08-24'`
  vuelve como objeto `Date` —y `toISOString()` en Colombia resta un día toda
  la tarde— y el móvil pierde cualquier cero inicial. Además se normalizan al
  leer, por si alguien cambia el formato de una columna a mano.
- **`opciones` e `historial` van serializados** como JSON: una hoja no tiene
  arreglos.
- **Cualquier fallo inesperado sale como sobre**, no como el HTML de error de
  Apps Script, que el cliente interpretaría como respuesta inválida.

### Qué hay que tocar

| Archivo | Qué se hace |
|---|---|
| `js/config.js` | `FUENTE_DATOS = 'api'` y `API_BASE_URL = '<url del despliegue>'` |
| `js/services/api.js` | borrar el `import` de `mockApi.js` y el ternario |
| `js/mock/` | **borrar la carpeta entera** |

**Nada más.** Ni las páginas, ni `js/ui/`, ni `js/utils/`, ni el CSS.

`api.js` después de la migración:

```js
import { enviar } from './httpClient.js';
```

### Qué debe hacer el backend

Google Apps Script con un `doPost(e)` que lea `JSON.parse(e.postData.contents)`,
enrute por `accion` y devuelva el sobre `{ok, data}` / `{ok, error}` con
`ContentService.createTextOutput(...).setMimeType(ContentService.MimeType.JSON)`.

Tres detalles que muerden:

- **Apps Script no responde a preflight CORS.** Por eso `httpClient.js` manda
  `Content-Type: text/plain` en vez de `application/json`: así la petición es
  "simple" y no dispara el preflight. `e.postData.contents` llega igual.
- **Apps Script redirige** a `googleusercontent.com`, de ahí el
  `redirect: 'follow'` en el `fetch`.
- **El despliegue debe ser "cualquier usuario"**, o el `fetch` recibirá el HTML
  de la pantalla de inicio de sesión de Google en vez de JSON. `httpClient.js`
  ya lo detecta y devuelve `RESPUESTA_INVALIDA`.

Si más adelante se cambia Apps Script por Node/Express + base de datos, el
frontend no se entera mientras se respete el mismo contrato.

---

## Identidad visual

- **Títulos:** Segoe UI · **Textos:** Open Sans (Google Fonts).
  Ambas en `--fuente-titulo` y `--fuente-texto` (`css/base.css`).
  Segoe UI no está en Google Fonts y solo viene con Windows, así que las dos
  pilas llevan una cola explícita —`-apple-system`, `system-ui`,
  `Helvetica Neue`, `Arial`— para que macOS caiga en SF Pro y Linux no acabe
  en DejaVu Sans. Esa cola también cubre a `--fuente-texto` si Google Fonts
  no responde.
- **Acento:** verde institucional `--c-acento: #00693c`.
- Dirección minimalista: neutros fríos, mucho aire, esquinas redondeadas,
  sombras muy suaves.

Toda la escala de color, espaciado, tipografía, radios y sombras vive como
custom property en el `:root` de `css/base.css`. Ajustar la dirección visual es
cambiar valores ahí, no reescribir reglas.

---

## Estado actual y límites conocidos

- **No hay límite de aforo.** Al quitar los turnos se quitó también la
  capacidad: hoy cualquiera reserva siempre, sin tope por cafetería ni por día.
  Si se quiere recuperar, es un campo `capacidad_diaria` en `Cafeterias`, un
  contador en `reservas.crear` y un código `CUPO_AGOTADO`.
- **El historial no dice quién hizo cada cambio.** Guarda qué cambió y cuándo,
  pero no el autor: sin identidad de usuario no hay de dónde sacarlo. En una
  herramienta que comparten varios turnos de personal, ese «quién» es justo lo
  que se acaba necesitando. Añadirlo es un campo `autor` en cada asiento, y
  antes un inicio de sesión por sencillo que sea.
- **La clave de admin no es seguridad.** Es un pestillo de cliente y se salta
  con las herramientas de desarrollo; ver arriba. `reserva.html` no pide nada,
  así que cualquiera con la URL sigue viendo los móviles de contacto y puede
  editar reservas. Mientras el backend no valide la sesión, esto solo debería
  vivir en una red interna.
- **El histórico del prototipo es generado.** `mock/reservas.js` fabrica unas
  seis semanas de reservas con un generador **con semilla fija**: si usara
  `Math.random()`, los totales cambiarían en cada recarga y sería imposible
  saber si un número que cambió es un dato o un artefacto. Al migrar al backend
  real, esa carpeta se borra entera y los datos son los de verdad.
- **El segundo de Apps Script no se puede quitar.** Medido contra el
  despliegue real, una petición que no lee ni una celda tarda unos 1000 ms:
  es el peaje de la plataforma —la redirección a `googleusercontent`, el
  arranque del script— y no depende de lo que haga el código. Por eso la
  optimización va toda por el mismo sitio: **hacer menos viajes y no
  encadenarlos**. Registrar una reserva pasó de dos viajes en fila a uno, y
  abrir el formulario de uno a ninguno; por debajo de ahí no se baja sin
  cambiar de backend, y ese es el argumento de la migración.
- **La tabla de detalle se corta en 500 filas.** El total real siempre se
  muestra y la exportación las lleva todas, pero no hay paginación para
  recorrerlas en pantalla.
- **Las reservas creadas y las ediciones se pierden al recargar**: el mock vive
  en memoria. El historial también.
- Solo se reserva para **hoy**. El parámetro `fecha` ya está en todas las firmas
  de los servicios, así que permitir fechas futuras es dejar de usar el valor
  por defecto y añadir el selector.
- **Una cancelación no se puede deshacer desde la interfaz.** La reserva
  cancelada existe en los datos, pero ninguna pantalla la muestra, así que no
  hay forma de revertirla ni de consultar su historial. Sería una acción
  `reservas.reactivar` y algún filtro para ver las canceladas del día.
- No hay deshacer general: cada acción destructiva se confirma antes, pero una
  vez confirmada no se revierte desde la interfaz.
- Las cafeterías no tienen foto: la tarjeta muestra la inicial sobre un degradado.
  Poner una ruta en el campo `imagen` de `mock/cafeterias.js` la sustituye.
- El header oculta el logo si el archivo no existe (`ui/dom.js#prepararLogo`) y
  deja solo el wordmark de texto, para no mostrar un ícono de imagen rota.
