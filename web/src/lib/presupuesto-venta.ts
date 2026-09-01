/**
 * Vocabulario del presupuesto de VENTA — lo que se cotiza al cliente.
 *
 * No confundir con `presupuesto.ts`, que lee el Excel del presupuesto aprobado
 * para sacar el equipo previsto: eso es COSTE, lo que pagamos. Son dos cifras
 * distintas, con dos permisos distintos.
 */

export const ESTADOS_PRESUPUESTO_VENTA = {
  borrador: { label: "En preparación" },
  enviado: { label: "Enviado al cliente" },
  aprobado: { label: "Aprobado" },
  rechazado: { label: "Rechazado" },
} as const;

export type EstadoPresupuestoVenta = keyof typeof ESTADOS_PRESUPUESTO_VENTA;

export function etiquetaEstadoPresupuesto(estado: string) {
  return (
    ESTADOS_PRESUPUESTO_VENTA[estado as EstadoPresupuestoVenta]?.label ?? estado
  );
}
