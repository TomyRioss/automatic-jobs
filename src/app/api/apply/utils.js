/**
 * Trunca el título de un trabajo a un máximo de caracteres y añade "..." si es necesario
 * @param title - El título del trabajo
 * @param maxLength - Longitud máxima del título (por defecto 30)
 * @returns El título truncado
 */
export function truncateJobTitle(title, maxLength = 100) {
  if (typeof title !== "string") {
    return "Título no disponible";
  }
  if (title.length <= maxLength) {
    return title;
  }
  return title.slice(0, maxLength) + "...";
}
