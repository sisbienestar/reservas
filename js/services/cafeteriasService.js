/**
 * Servicio de cafeterías.
 *
 * Aquí vive la traducción entre la forma de la API (snake_case, tal como la
 * escupe una hoja de cálculo) y la forma que consume la UI (camelCase). Esa
 * frontera es deliberada: si mañana el backend renombra una columna, se
 * arregla en `normalizar` y ni una vista se entera.
 */

import { pedir } from './api.js';

/**
 * @typedef {Object} Cafeteria
 * @property {string} id
 * @property {string} nombre
 * @property {string} ubicacion
 * @property {string} imagen
 * @property {boolean} activa
 */

/** @returns {Cafeteria} */
function normalizar(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    ubicacion: fila.ubicacion ?? '',
    imagen: fila.imagen ?? '',
    // Una fila de la hoja sin la columna todavía se da por activa.
    activa: fila.activa !== false,
  };
}

/**
 * Cafeterías en servicio. Con `incluirInactivas` devuelve también las
 * cerradas, que es lo que necesita la pantalla de administración.
 *
 * @param {{incluirInactivas?: boolean}} opciones
 * @returns {Promise<Cafeteria[]>}
 */
export async function getCafeterias({ incluirInactivas = false } = {}) {
  const filas = await pedir('cafeterias.listar', { incluir_inactivas: incluirInactivas });
  return filas.map(normalizar);
}

/**
 * Crea una cafetería. El id sale del nombre, así que dos cafeterías con el
 * mismo nombre chocan: devuelve CAFETERIA_DUPLICADA.
 *
 * @param {{nombre: string, ubicacion?: string}} datos
 * @returns {Promise<Cafeteria>}
 */
export async function crearCafeteria(datos) {
  return normalizar(await pedir('cafeterias.crear', datos));
}

/**
 * Modifica el nombre y la ubicación. El `id` no es editable: es la
 * clave con la que las reservas históricas apuntan a esta cafetería.
 *
 * @returns {Promise<Cafeteria>}
 */
export async function actualizarCafeteria(id, datos) {
  return normalizar(await pedir('cafeterias.actualizar', { id, ...datos }));
}

/** Cierra una cafetería: deja de ofrecerse, pero sus reservas siguen intactas. */
export async function archivarCafeteria(id) {
  return normalizar(await pedir('cafeterias.archivar', { id }));
}

/** Vuelve a poner en servicio una cafetería cerrada. */
export async function reactivarCafeteria(id) {
  return normalizar(await pedir('cafeterias.reactivar', { id }));
}

/** Una cafetería por id. Lanza ErrorServicio si no existe. @returns {Promise<Cafeteria>} */
export async function getCafeteria(id) {
  const fila = await pedir('cafeterias.obtener', { id });
  return normalizar(fila);
}
