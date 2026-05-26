-- AlterTable
ALTER TABLE "pessoas" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "transacoes" ADD COLUMN     "rifaId" INTEGER;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "rifas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
