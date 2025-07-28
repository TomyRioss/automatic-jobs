/**
 * Trunca el título de un trabajo a un máximo de caracteres y añade "..." si es necesario
 * @param title - El título del trabajo
 * @param maxLength - Longitud máxima del título (por defecto 30)
 * @returns El título truncado
 */
export function truncateJobTitle(
  title: string,
  maxLength: number = 30,
): string {
  if (!title || title === 'N/A') {
    return 'N/A';
  }

  const trimmedTitle = title.trim();

  if (trimmedTitle.length <= maxLength) {
    return trimmedTitle;
  }

  // Truncar y añadir "..."
  return trimmedTitle.substring(0, maxLength - 3) + '...';
}
