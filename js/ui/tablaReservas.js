/**
 * Tabla de reservas del día.
 *
 * Columnas: Nombre · Menú del día · Móvil · acción de editar.
 *
 * La función expone los tres estados por separado (cargando, error, datos)
 * porque la vista los necesita en momentos distintos y no queremos que
 * paginaReserva.js sepa cómo se dibuja ninguno.
 */

import { crear, pintar, bloqueEstado } from './dom.js';
import { formatearTelefono } from '../utils/telefono.js';

export function mostrarCargando(contenedor) {
  pintar(contenedor, bloqueEstado({
    tipo: 'cargando',
    titulo: 'Cargando reservas…',
  }));
}

/** Día sin servicio: no es una tabla vacía, es que hoy no se abre. */
export function mostrarSinServicio(contenedor) {
  pintar(contenedor, bloqueEstado({
    tipo: 'vacio',
    titulo: 'Hoy no hay servicio de almuerzo',
    detalle: 'Los sábados y domingos las cafeterías no prestan servicio, así que no se registran reservas.',
  }));
}

export function mostrarError(contenedor, mensaje, alReintentar) {
  pintar(contenedor, bloqueEstado({
    tipo: 'error',
    titulo: 'No se pudieron cargar las reservas',
    detalle: mensaje,
    accion: alReintentar ? { texto: 'Reintentar', alPulsar: alReintentar } : null,
  }));
}

/**
 * Botón de acción de una fila.
 *
 * Con solo «Editar» repetido diez veces, un lector de pantalla que recorra los
 * botones fuera de contexto no distingue una fila de otra: de ahí el
 * aria-label con el nombre.
 */
function botonFila(texto, etiqueta, alPulsar) {
  const boton = crear('button', {
    clase: 'boton boton--secundario boton--sm',
    texto,
    attrs: { type: 'button', 'aria-label': etiqueta },
  });
  boton.addEventListener('click', alPulsar);
  return boton;
}

/**
 * @param {HTMLElement} contenedor
 * @param {import('../services/reservasService.js').Reserva[]} reservas
 * @param {{idDestacado?: string, alEditar?: (reserva: any) => void}} opciones
 *        idDestacado: la reserva recién creada o modificada, para señalarla.
 *
 * La fila solo ofrece «Editar». Cancelar vive dentro de ese modal: es una
 * acción destructiva y no debe estar a un clic de distancia en una lista de
 * veinte filas, donde se pulsa la de al lado sin querer.
 */
export function mostrarReservas(contenedor, reservas, { idDestacado, alEditar } = {}) {
  if (reservas.length === 0) {
    pintar(contenedor, bloqueEstado({
      tipo: 'vacio',
      titulo: 'Todavía no hay reservas para hoy',
      detalle: 'Usa «Registrar reserva» para anotar la primera.',
    }));
    return;
  }

  const cabecera = crear('thead', {
    hijos: [
      crear('tr', {
        hijos: [
          crear('th', { clase: 'tabla__numero-reserva', texto: 'N.º', attrs: { scope: 'col' } }),
          crear('th', { texto: 'Nombre', attrs: { scope: 'col' } }),
          crear('th', { texto: 'Menú del día', attrs: { scope: 'col' } }),
          crear('th', { texto: 'Móvil', attrs: { scope: 'col' } }),
          // La columna de acciones no lleva rótulo visible, pero sí uno para
          // lectores de pantalla: una cabecera vacía deja la columna sin nombre.
          crear('th', {
            clase: 'tabla__acciones',
            attrs: { scope: 'col' },
            hijos: [crear('span', { clase: 'visualmente-oculto', texto: 'Acciones' })],
          }),
        ],
      }),
    ],
  });

  const cuerpo = crear('tbody', {
    hijos: reservas.map((reserva) =>
      crear('tr', {
        clase: reserva.id === idDestacado ? 'tabla__fila tabla__fila--nueva' : 'tabla__fila',
        hijos: [
          // Solo el consecutivo: dentro de la tabla del día, la cafetería y
          // la fecha son las mismas en todas las filas y repetirlas sería ruido.
          crear('td', { clase: 'tabla__numero-reserva', texto: reserva.numero || '—' }),
          crear('td', { clase: 'tabla__nombre', texto: reserva.nombre }),
          crear('td', { clase: 'tabla__menu', texto: reserva.menuNombre }),
          crear('td', {
            clase: 'tabla__telefono',
            texto: formatearTelefono(reserva.telefono),
          }),
          crear('td', {
            clase: 'tabla__acciones',
            hijos: [
              alEditar
                ? botonFila('Editar', `Editar la reserva de ${reserva.nombre}`, () =>
                    alEditar(reserva),
                  )
                : null,
            ],
          }),
        ],
      }),
    ),
  });

  const total = reservas.length;
  const tabla = crear('table', {
    clase: 'tabla',
    hijos: [
      crear('caption', {
        clase: 'tabla__caption',
        texto: `${total} ${total === 1 ? 'reserva' : 'reservas'} para hoy`,
      }),
      cabecera,
      cuerpo,
    ],
  });

  pintar(contenedor, tabla);
}
