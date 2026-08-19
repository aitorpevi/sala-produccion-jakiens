/**
 * Las dos marcas de la casa.
 *
 * Jakiens y Ricorico comparten fisco, equipo, directorio de colaboradores y
 * gestoría: lo que cambia es la escala del proyecto y el discurso, no los
 * datos. Por eso la marca es un campo del proyecto y no una base separada.
 *
 * Sin `server-only` a propósito: los colores se usan también en componentes que
 * se renderizan en el navegador.
 */

export const MARCAS = {
  JAKIENS: {
    nombre: "Jakiens",
    logo: "/marca/jakiens.svg",
    // Negro tinta, el del propio logo. Es la identidad de la casa grande.
    color: "#111111",
    descripcion: "Spots y gran producción",
  },
  RICORICO: {
    nombre: "Ricorico",
    logo: "/marca/ricorico.svg",
    // Azul eléctrico del logo.
    color: "#344fff",
    descripcion: "Contenido, social y digital",
  },
} as const;

export type ClaveMarca = keyof typeof MARCAS;

export const CLAVES_MARCA = Object.keys(MARCAS) as ClaveMarca[];

export function marcaDe(brand: string | null | undefined) {
  return MARCAS[brand as ClaveMarca] ?? MARCAS.JAKIENS;
}
