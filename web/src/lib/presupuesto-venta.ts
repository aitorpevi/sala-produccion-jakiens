/**
 * Vocabulario del presupuesto de VENTA — lo que se cotiza al cliente.
 *
 * No confundir con `presupuesto.ts`, que lee el Excel del presupuesto aprobado
 * para sacar el equipo previsto: eso es COSTE, lo que pagamos. Son dos cifras
 * distintas, con dos permisos distintos.
 */

/**
 * El recorrido del PPTO: alguien lo prepara, Javier lo revisa, sale al cliente.
 *
 * No hay "aprobado" ni "rechazado": eso le pasa al PROYECTO, no al documento, y
 * se refleja en la etapa (pasa a preproducción) o en el estado (perdido).
 * Tenerlo en los dos sitios garantizaba que un día dijeran cosas distintas.
 */
export const ESTADOS_PRESUPUESTO_VENTA = {
  en_preparacion: { label: "En preparación" },
  revisado_jakie: { label: "Revisado por Javier" },
  enviado_cliente: { label: "Enviado a cliente" },
} as const;

export type EstadoPresupuestoVenta = keyof typeof ESTADOS_PRESUPUESTO_VENTA;

export function etiquetaEstadoPresupuesto(estado: string) {
  return (
    ESTADOS_PRESUPUESTO_VENTA[estado as EstadoPresupuestoVenta]?.label ?? estado
  );
}
