-- Un hito puede darse por hecho.
--
-- Solo añade dos columnas opcionales: los hitos existentes quedan como
-- pendientes, que es lo correcto —de ellos no consta que se entregaran— y no
-- requiere decidir nada por nadie.
ALTER TABLE "Hito"
  ADD COLUMN "completadoEn" TIMESTAMP(3),
  ADD COLUMN "completadoPorId" TEXT;

ALTER TABLE "Hito" ADD CONSTRAINT "Hito_completadoPorId_fkey"
  FOREIGN KEY ("completadoPorId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
