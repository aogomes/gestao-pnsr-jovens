/*
  Warnings:

  - You are about to drop the column `saldo` on the `pessoas` table. All the data in the column will be lost.
  - You are about to drop the column `nome` on the `usuarios` table. All the data in the column will be lost.
  - Made the column `pessoaId` on table `usuarios` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "OrigemTransacao" AS ENUM ('RIFA', 'DEPOSITO', 'TRABALHO', 'PAGAMENTO');

-- CreateEnum
CREATE TYPE "TipoTrabalho" AS ENUM ('INDIVIDUAL', 'GRUPO');

-- CreateEnum
CREATE TYPE "StatusTrabalho" AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusRecebimentoTrabalho" AS ENUM ('PAGO', 'PENDENTE');

-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_pessoaId_fkey";

-- AlterTable
ALTER TABLE "pessoas" DROP COLUMN "saldo";

-- AlterTable
ALTER TABLE "transacoes" ADD COLUMN     "loteRateioId" INTEGER,
ADD COLUMN     "origem" "OrigemTransacao",
ADD COLUMN     "recebimentoTrabalhoId" INTEGER;

-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "nome",
ALTER COLUMN "pessoaId" SET NOT NULL;

-- CreateTable
CREATE TABLE "trabalhos" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataTrabalho" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoTrabalho" NOT NULL,
    "status" "StatusTrabalho" NOT NULL DEFAULT 'ABERTO',
    "proporcao" DOUBLE PRECISION NOT NULL,
    "contaId" INTEGER NOT NULL,
    "pessoaId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trabalhos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membros_trabalho" (
    "id" SERIAL NOT NULL,
    "trabalhoId" INTEGER NOT NULL,
    "pessoaId" INTEGER NOT NULL,

    CONSTRAINT "membros_trabalho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recebimentos_trabalho" (
    "id" SERIAL NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT,
    "metodo" TEXT,
    "dataRecebimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusRecebimentoTrabalho" NOT NULL DEFAULT 'PENDENTE',
    "trabalhoId" INTEGER NOT NULL,
    "pessoaId" INTEGER,
    "loteRateioId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recebimentos_trabalho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas_trabalho" (
    "id" SERIAL NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT NOT NULL,
    "trabalhoId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "despesas_trabalho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes_rateio" (
    "id" SERIAL NOT NULL,
    "trabalhoId" INTEGER NOT NULL,
    "valorArrecadado" DOUBLE PRECISION NOT NULL,
    "valorDespesas" DOUBLE PRECISION NOT NULL,
    "valorLiquido" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lotes_rateio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membros_trabalho_trabalhoId_pessoaId_key" ON "membros_trabalho"("trabalhoId", "pessoaId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "pessoas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_recebimentoTrabalhoId_fkey" FOREIGN KEY ("recebimentoTrabalhoId") REFERENCES "recebimentos_trabalho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_loteRateioId_fkey" FOREIGN KEY ("loteRateioId") REFERENCES "lotes_rateio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_inscricao" ADD CONSTRAINT "pagamentos_inscricao_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "transacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trabalhos" ADD CONSTRAINT "trabalhos_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "contas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trabalhos" ADD CONSTRAINT "trabalhos_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "pessoas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_trabalho" ADD CONSTRAINT "membros_trabalho_trabalhoId_fkey" FOREIGN KEY ("trabalhoId") REFERENCES "trabalhos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_trabalho" ADD CONSTRAINT "membros_trabalho_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "pessoas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos_trabalho" ADD CONSTRAINT "recebimentos_trabalho_trabalhoId_fkey" FOREIGN KEY ("trabalhoId") REFERENCES "trabalhos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos_trabalho" ADD CONSTRAINT "recebimentos_trabalho_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "pessoas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos_trabalho" ADD CONSTRAINT "recebimentos_trabalho_loteRateioId_fkey" FOREIGN KEY ("loteRateioId") REFERENCES "lotes_rateio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas_trabalho" ADD CONSTRAINT "despesas_trabalho_trabalhoId_fkey" FOREIGN KEY ("trabalhoId") REFERENCES "trabalhos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_rateio" ADD CONSTRAINT "lotes_rateio_trabalhoId_fkey" FOREIGN KEY ("trabalhoId") REFERENCES "trabalhos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
