/**
 * Datos simulados: cafeterías.
 *
 * La forma imita fila a fila la hoja 'Cafeterias' de Google Sheets, incluidos
 * los nombres de campo en snake_case. Lo que normaliza a camelCase para la UI
 * es la capa de servicios, no este archivo.
 *
 * Hoja equivalente:
 *   id | nombre | ubicacion | imagen | activa
 *
 * `activa` sostiene el borrado lógico: una cafetería que cierra deja de
 * aparecer en la página operativa, pero sus reservas históricas siguen
 * teniendo a qué apuntar en los reportes del administrador.
 *
 * Los `id` salen del nombre con la misma regla que aplica el catálogo al
 * crear una cafetería nueva (`utils/texto.js#aSlug`), para que no haya dos
 * criterios distintos según de dónde venga la fila.
 *
 * OJO: las `ubicacion` son marcadores de posición. Los nombres y las fotos
 * son los reales.
 */

export const CAFETERIAS = [
  {
    id: 'bienestar-pro',
    nombre: 'Bienestar Pro',
    ubicacion: 'Campus central',
    imagen: 'assets/img/bienestar-pro.jpg',
    activa: true,
  },
  {
    id: 'camilo-torres',
    nombre: 'Camilo Torres',
    ubicacion: 'Auditorio Camilo Torres',
    imagen: 'assets/img/camilo-torres.jpg',
    activa: true,
  },
  {
    id: 'bienestar-universitario',
    nombre: 'Bienestar Universitario',
    ubicacion: 'Edificio de Bienestar Universitario',
    // Ojo: esta es .jpeg, no .jpg. Por eso la ruta va escrita y no se deduce
    // del id — tampoco «administracion3», que no lleva guion.
    imagen: 'assets/img/bienestar-universitario.jpeg',
    activa: true,
  },
  {
    id: 'administracion-3',
    nombre: 'Administración 3',
    ubicacion: 'Edificio de Administración 3',
    imagen: 'assets/img/administracion3.jpg',
    activa: true,
  },
];
