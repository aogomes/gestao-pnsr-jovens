-- CreateTable
CREATE TABLE "pagamentos_inscricao" (
    "id" SERIAL NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo" TEXT,
    "observacao" TEXT,
    "inscricaoId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_inscricao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pagamentos_inscricao" ADD CONSTRAINT "pagamentos_inscricao_inscricaoId_fkey" FOREIGN KEY ("inscricaoId") REFERENCES "inscricoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
