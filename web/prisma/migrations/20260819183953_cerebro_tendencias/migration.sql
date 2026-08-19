-- CreateTable
CREATE TABLE "Senal" (
    "id" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "claveExterna" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT,
    "url" TEXT,
    "autor" TEXT,
    "idioma" TEXT,
    "metrica" DOUBLE PRECISION,
    "tema" TEXT,
    "vertical" TEXT,
    "publicadaEn" TIMESTAMP(3),
    "capturadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "crudo" JSONB,

    CONSTRAINT "Senal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemaSeguido" (
    "id" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "termino" TEXT NOT NULL,
    "etiqueta" TEXT,
    "vertical" TEXT,
    "idioma" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemaSeguido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasadaIngesta" (
    "id" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "nuevas" INTEGER NOT NULL DEFAULT 0,
    "revisadas" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "duracionMs" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasadaIngesta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Senal_fuente_publicadaEn_idx" ON "Senal"("fuente", "publicadaEn");

-- CreateIndex
CREATE INDEX "Senal_vertical_publicadaEn_idx" ON "Senal"("vertical", "publicadaEn");

-- CreateIndex
CREATE INDEX "Senal_tema_idx" ON "Senal"("tema");

-- CreateIndex
CREATE UNIQUE INDEX "Senal_fuente_claveExterna_key" ON "Senal"("fuente", "claveExterna");

-- CreateIndex
CREATE INDEX "TemaSeguido_fuente_activo_idx" ON "TemaSeguido"("fuente", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "TemaSeguido_fuente_termino_key" ON "TemaSeguido"("fuente", "termino");

-- CreateIndex
CREATE INDEX "PasadaIngesta_fuente_creadoEn_idx" ON "PasadaIngesta"("fuente", "creadoEn");
