/*
  Warnings:

  - You are about to drop the column `recebimentoTrabalhoId` on the `transacoes` table. All the data in the column will be lost.
  - Added the required column `contaId` to the `eventos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StatusInscricao" ADD VALUE 'REJEITADA';
ALTER TYPE "StatusInscricao" ADD VALUE 'EM_ANALISE';

-- DropForeignKey
ALTER TABLE "transacoes" DROP CONSTRAINT "transacoes_recebimentoTrabalhoId_fkey";

-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "contaId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "transacoes" DROP COLUMN "recebimentoTrabalhoId",
ADD COLUMN     "eventoId" INTEGER,
ADD COLUMN     "inscricaoId" INTEGER;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_inscricaoId_fkey" FOREIGN KEY ("inscricaoId") REFERENCES "inscricoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "contas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
