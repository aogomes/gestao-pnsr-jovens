/*
  Warnings:

  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Parish` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Person` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Registration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Transaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('ADMIN', 'USUARIO');

-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('RECEITA', 'DESPESA', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "StatusEvento" AS ENUM ('ATIVO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusRifa" AS ENUM ('ATIVA', 'PAUSADA', 'FINALIZADA', 'SORTEADA');

-- CreateEnum
CREATE TYPE "StatusBilhete" AS ENUM ('LIVRE', 'RESERVADO', 'VENDIDO');

-- CreateEnum
CREATE TYPE "StatusInscricao" AS ENUM ('PENDENTE', 'CONFIRMADO', 'AGUARDANDO_VAGA');

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_parishId_fkey";

-- DropForeignKey
ALTER TABLE "Registration" DROP CONSTRAINT "Registration_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Registration" DROP CONSTRAINT "Registration_personId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_personId_fkey";

-- DropTable
DROP TABLE "Event";

-- DropTable
DROP TABLE "Parish";

-- DropTable
DROP TABLE "Person";

-- DropTable
DROP TABLE "Registration";

-- DropTable
DROP TABLE "Transaction";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "EventStatus";

-- DropEnum
DROP TYPE "Role";

-- DropEnum
DROP TYPE "TransactionType";

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "login" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL DEFAULT 'USUARIO',
    "pessoaId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pessoas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "documento" TEXT,
    "telefone" TEXT,
    "saldo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paroquiaId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pessoas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacoes" (
    "id" SERIAL NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "tipo" "TipoTransacao" NOT NULL,
    "descricao" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pessoaId" INTEGER,
    "contaId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paroquias" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "paroco" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paroquias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "paroquiaId" INTEGER NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "limiteInscricao" TIMESTAMP(3) NOT NULL,
    "status" "StatusEvento" NOT NULL DEFAULT 'ATIVO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricoes" (
    "id" SERIAL NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "eventoId" INTEGER NOT NULL,
    "status" "StatusInscricao" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inscricoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rifas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "titulo" TEXT,
    "descricao" TEXT,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "dataSorteio" TIMESTAMP(3) NOT NULL,
    "valorNumero" DOUBLE PRECISION NOT NULL,
    "numerosPorCartela" INTEGER NOT NULL DEFAULT 50,
    "totalNumeros" INTEGER NOT NULL,
    "status" "StatusRifa" NOT NULL DEFAULT 'ATIVA',
    "premioVendedor" TEXT,
    "percentualRateio" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "contaId" INTEGER,
    "chavePix" TEXT,
    "tipoChavePix" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rifas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "premios" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "posicao" INTEGER NOT NULL,
    "rifaId" INTEGER NOT NULL,

    CONSTRAINT "premios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alocacoes_rifa" (
    "id" SERIAL NOT NULL,
    "rifaId" INTEGER NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "inicioRange" INTEGER NOT NULL,
    "fimRange" INTEGER NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alocacoes_rifa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bilhetes" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "status" "StatusBilhete" NOT NULL DEFAULT 'LIVRE',
    "comprovante" TEXT,
    "rifaId" INTEGER NOT NULL,
    "vendedorId" INTEGER,
    "nomeCliente" TEXT,
    "foneCliente" TEXT,
    "dataVenda" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bilhetes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "saldo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paroquiaId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_login_key" ON "usuarios"("login");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_pessoaId_key" ON "usuarios"("pessoaId");

-- CreateIndex
CREATE UNIQUE INDEX "pessoas_email_key" ON "pessoas"("email");

-- CreateIndex
CREATE UNIQUE INDEX "inscricoes_pessoaId_eventoId_key" ON "inscricoes"("pessoaId", "eventoId");

-- CreateIndex
CREATE UNIQUE INDEX "bilhetes_rifaId_numero_key" ON "bilhetes"("rifaId", "numero");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "pessoas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_paroquiaId_fkey" FOREIGN KEY ("paroquiaId") REFERENCES "paroquias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "pessoas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_paroquiaId_fkey" FOREIGN KEY ("paroquiaId") REFERENCES "paroquias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "pessoas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rifas" ADD CONSTRAINT "rifas_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premios" ADD CONSTRAINT "premios_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "rifas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes_rifa" ADD CONSTRAINT "alocacoes_rifa_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "rifas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes_rifa" ADD CONSTRAINT "alocacoes_rifa_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "pessoas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bilhetes" ADD CONSTRAINT "bilhetes_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "rifas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bilhetes" ADD CONSTRAINT "bilhetes_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "pessoas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas" ADD CONSTRAINT "contas_paroquiaId_fkey" FOREIGN KEY ("paroquiaId") REFERENCES "paroquias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
