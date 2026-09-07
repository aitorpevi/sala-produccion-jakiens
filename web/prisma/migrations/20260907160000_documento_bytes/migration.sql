-- Contenido del documento en la propia fila cuando no hay Vercel Blob, igual
-- que ya hace `Material`. Sin esto, subir un briefing en un entorno sin Blob
-- guardaba una fila sin archivo.
ALTER TABLE "Documento" ADD COLUMN "fileData" BYTEA;
