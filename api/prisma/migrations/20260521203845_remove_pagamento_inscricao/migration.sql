/*
  Warnings:

  - You are about to drop the `pagamentos_inscricao` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "pagamentos_inscricao" DROP CONSTRAINT "pagamentos_inscricao_inscricaoId_fkey";

-- DropForeignKey
ALTER TABLE "pagamentos_inscricao" DROP CONSTRAINT "pagamentos_inscricao_transacaoId_fkey";

-- DropTable
DROP TABLE "pagamentos_inscricao";
