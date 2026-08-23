/**
 * Entrada de reserva.html.
 *
 * Página única para las cuatro cafeterías: todo lo específico sale del
 * parámetro ?cafeteria=<id> de la URL. Orquesta servicios y UI; no conoce el
 * mock ni dibuja nada por su cuenta.
 */

import { getCafeteria } from './services/cafeteriasService.js';
import { getMenuDelDia } from './services/menuService.js';
import {
  getReservasDelDia,
  crearReserva,
  actualizarReserva,
  cancelarReserva,
} from './services/reservasService.js';

import { qs, pintar, bloqueEstado, prepararLogo } from './ui/dom.js';
import { crearModalReserva } from './ui/modalReserva.js';
import { montarModalReserva } from './ui/marcadoModalReserva.js';
import { montarConfirmacion } from './ui/modalConfirmacion.js';
import * as tabla from './ui/tablaReservas.js';

import { PERMITIR_FIN_DE_SEMANA } from './config.js';
import { paramUrl } from './utils/url.js';
import { hoyISO, formatearFechaLarga, esDiaDeServicio } from './utils/fechas.js';

const cafeteriaId = paramUrl('cafeteria');

const vista = {
  contenido: qs('#contenido'),
  nombre: qs('#nombre-cafeteria'),
  ubicacion: qs('#ubicacion-cafeteria'),
  fecha: qs('#fecha-hoy'),
  tabla: qs('#contenedor-tabla'),
  botonReservar: qs('#boton-reservar'),
  aviso: qs('#aviso'),
  // El marcado del modal no está en el HTML: lo monta un módulo compartido
  // con la página de administración, para que el formulario exista una sola
  // vez en el proyecto.
  dialogo: montarModalReserva(),
};

/** Estado de la página. Un objeto plano basta para dos vistas. */
const estado = {
  cafeteria: null,
  ultimaReservaId: null,
};

const modal = crearModalReserva({
  dialogo: vista.dialogo,
  alCrear: confirmarReserva,
  alEditar: guardarCambios,
  alCancelar: pedirCancelacion,
});

const { confirmar } = montarConfirmacion();

/* ── Arranque ─────────────────────────────────────────────────────────── */

async function iniciar() {
  prepararLogo();
  vista.fecha.textContent = formatearFechaLarga(hoyISO());

  if (!cafeteriaId) {
    mostrarFalloDePagina(
      'Falta indicar la cafetería',
      'Vuelve al inicio y elige una de las cuatro cafeterías.',
    );
    return;
  }

  try {
    estado.cafeteria = await getCafeteria(cafeteriaId);
  } catch (error) {
    mostrarFalloDePagina('No se encontró esa cafetería', error.message);
    return;
  }

  document.title = `${estado.cafeteria.nombre} · Reservas UIS`;
  vista.nombre.textContent = estado.cafeteria.nombre;
  vista.ubicacion.textContent = estado.cafeteria.ubicacion;

  // El interruptor de pruebas se anuncia en pantalla, y no solo en un
  // comentario del código: si se queda encendido, el personal registraría
  // reservas de fin de semana que la cocina no va a ver nunca.
  if (PERMITIR_FIN_DE_SEMANA) {
    mostrarAviso(
      'aviso',
      'MODO PRUEBAS: la regla de fin de semana está desactivada. ' +
        'Apaga PERMITIR_FIN_DE_SEMANA en js/config.js antes de usarlo de verdad.',
    );
  }

  // Fin de semana: el botón se queda deshabilitado y la tabla se sustituye
  // por una explicación. Sin esto quedaría un «Todavía no hay reservas para
  // hoy · Usa Registrar reserva para anotar la primera», que invita a hacer
  // algo que la API va a rechazar.
  if (!esDiaDeServicio(hoyISO())) {
    mostrarAviso(
      'aviso',
      'Los sábados y domingos no hay servicio de almuerzo: hoy no se registran reservas.',
    );
    tabla.mostrarSinServicio(vista.tabla);
    return;
  }

  vista.botonReservar.disabled = false;
  vista.botonReservar.addEventListener('click', () => abrirFormulario(null));

  await refrescarTabla();
}

/* ── Tabla ────────────────────────────────────────────────────────────── */

async function refrescarTabla() {
  tabla.mostrarCargando(vista.tabla);
  try {
    const reservas = await getReservasDelDia(estado.cafeteria.id);
    tabla.mostrarReservas(vista.tabla, reservas, {
      idDestacado: estado.ultimaReservaId,
      alEditar: (reserva) => abrirFormulario(reserva),
    });
  } catch (error) {
    tabla.mostrarError(vista.tabla, error.message, refrescarTabla);
  }
}

/* ── Modal ────────────────────────────────────────────────────────────── */

/**
 * Abre el formulario. Con `reserva` en null crea una nueva; con una reserva
 * la edita. El menú se pide en ambos casos: es el que manda sobre lo que se
 * puede elegir hoy, también al corregir una reserva de esta mañana.
 *
 * @param {import('./services/reservasService.js').Reserva|null} reserva
 */
async function abrirFormulario(reserva) {
  ocultarAviso();
  vista.botonReservar.disabled = true;

  try {
    // La carta es la del día y es la misma en todo el campus: no se pasa la
    // cafetería porque el menú ya no depende de ella.
    const menu = await getMenuDelDia();

    if (menu.length === 0) {
      mostrarAviso(
        'aviso',
        'Hoy no hay carta publicada, así que todavía no se pueden registrar reservas.',
      );
      return;
    }

    modal.abrir({ menu, reserva });
  } catch (error) {
    mostrarAviso('error', `No se pudo abrir el formulario: ${error.message}`);
  } finally {
    vista.botonReservar.disabled = false;
  }
}

/**
 * Se pasa al modal como callback. Si lanza, el modal se queda abierto y
 * muestra el mensaje; si resuelve, el modal se cierra solo.
 */
async function confirmarReserva(datos) {
  const reserva = await crearReserva({
    nombre: datos.nombre,
    telefono: datos.telefono,
    cafeteriaId: estado.cafeteria.id,
    menuId: datos.menuId,
  });

  estado.ultimaReservaId = reserva.id;
  mostrarAviso('exito', `Reserva registrada · ${reserva.nombre} · ${reserva.menuNombre}.`);
  await refrescarTabla();
}

/** Igual que la anterior, pero para una reserva que ya existía. */
async function guardarCambios(id, datos) {
  const reserva = await actualizarReserva(id, {
    nombre: datos.nombre,
    telefono: datos.telefono,
    menuId: datos.menuId,
  });

  estado.ultimaReservaId = reserva.id;
  const cambios = reserva.historial[reserva.historial.length - 1].cambios.length;
  mostrarAviso(
    'exito',
    `Reserva de ${reserva.nombre} actualizada · ` +
      `${cambios} ${cambios === 1 ? 'cambio registrado' : 'cambios registrados'}.`,
  );

  // Se recarga desde el servicio en vez de tocar la fila a mano: así la tabla
  // siempre refleja el servidor, no lo que el cliente cree que pasó.
  await refrescarTabla();
}

/* ── Cancelación ──────────────────────────────────────────────────────── */

/**
 * Se llama desde dentro del modal de edición, que es donde vive «Cancelar
 * reserva». Pide confirmación aparte porque es la única acción de la página
 * que destruye algo.
 *
 * Devuelve `true` si la reserva se canceló y `false` si se echó atrás: el
 * modal usa ese valor para saber si cerrarse o volver a la edición. Si el
 * servicio falla, deja que el error suba — el modal lo enseña en su sitio,
 * junto al formulario, y no en un aviso que quedaría tapado por él.
 *
 * @param {import('./services/reservasService.js').Reserva} reserva
 * @returns {Promise<boolean>}
 */
async function pedirCancelacion(reserva) {
  const confirmado = await confirmar({
    titulo: 'Cancelar reserva',
    mensaje:
      `La reserva de ${reserva.nombre} dejará de aparecer en la tabla de hoy. ` +
      'El registro y su historial se conservan.',
    textoConfirmar: 'Sí, cancelar la reserva',
    peligro: true,
  });
  if (!confirmado) return false;

  await cancelarReserva(reserva.id);
  // La cancelada ya no sale en la tabla, así que destacar su fila no tendría
  // a qué agarrarse: se limpia para no señalar a la vecina de al lado.
  estado.ultimaReservaId = null;
  await refrescarTabla();
  mostrarAviso('aviso', `Reserva de ${reserva.nombre} cancelada.`);
  return true;
}

/* ── Avisos y fallos ──────────────────────────────────────────────────── */

function mostrarAviso(tipo, mensaje) {
  vista.aviso.className = `aviso aviso--${tipo}`;
  vista.aviso.textContent = mensaje;
  vista.aviso.hidden = false;
}

function ocultarAviso() {
  vista.aviso.hidden = true;
  vista.aviso.textContent = '';
}

/** Fallo del que la página no puede recuperarse: se reemplaza todo. */
function mostrarFalloDePagina(titulo, detalle) {
  const bloque = bloqueEstado({ tipo: 'error', titulo, detalle });
  const volver = document.createElement('a');
  volver.className = 'boton boton--secundario boton--sm';
  volver.href = 'index.html';
  volver.textContent = 'Volver al inicio';
  bloque.appendChild(volver);
  pintar(vista.contenido, bloque);
}

iniciar();
