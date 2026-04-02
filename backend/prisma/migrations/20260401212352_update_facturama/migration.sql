/*
  Warnings:

  - You are about to drop the column `objetoImpuesto` on the `BillingConcept` table. All the data in the column will be lost.
  - You are about to drop the column `unidad` on the `BillingConcept` table. All the data in the column will be lost.
  - You are about to drop the column `logoUrl` on the `BillingEmisor` table. All the data in the column will be lost.
  - You are about to drop the column `descuento` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `exportacion` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `fechaEmision` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `fechaTimbrado` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `moneda` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `pdfUrl` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `serie` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalRetenciones` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalTraslados` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `uuidFacturama` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `xmlUrl` on the `Invoice` table. All the data in the column will be lost.
  - The `status` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `InvoiceItem` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[emisorId,rfc]` on the table `BillingReceptor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[satUuid]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - Made the column `emisorId` on table `BillingConcept` required. This step will fail if there are existing NULL values in that column.
  - Made the column `emisorId` on table `BillingReceptor` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `satUuid` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BillingConcept" DROP CONSTRAINT "BillingConcept_emisorId_fkey";

-- DropForeignKey
ALTER TABLE "BillingReceptor" DROP CONSTRAINT "BillingReceptor_emisorId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "InvoiceItem_invoiceId_fkey";

-- DropIndex
DROP INDEX "BillingReceptor_rfc_key";

-- DropIndex
DROP INDEX "Invoice_uuidFacturama_key";

-- AlterTable
ALTER TABLE "BillingConcept" DROP COLUMN "objetoImpuesto",
DROP COLUMN "unidad",
ALTER COLUMN "claveUnidad" DROP DEFAULT,
ALTER COLUMN "impuestoTrasladado" DROP DEFAULT,
ALTER COLUMN "emisorId" SET NOT NULL;

-- AlterTable
ALTER TABLE "BillingEmisor" DROP COLUMN "logoUrl";

-- AlterTable
ALTER TABLE "BillingReceptor" ALTER COLUMN "emisorId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "descuento",
DROP COLUMN "exportacion",
DROP COLUMN "fechaEmision",
DROP COLUMN "fechaTimbrado",
DROP COLUMN "moneda",
DROP COLUMN "pdfUrl",
DROP COLUMN "serie",
DROP COLUMN "totalRetenciones",
DROP COLUMN "totalTraslados",
DROP COLUMN "uuidFacturama",
DROP COLUMN "xmlUrl",
ADD COLUMN     "facturamaId" TEXT,
ADD COLUMN     "satUuid" TEXT NOT NULL,
ALTER COLUMN "metodoPago" DROP NOT NULL,
ALTER COLUMN "formaPago" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'TIMBRADA';

-- DropTable
DROP TABLE "InvoiceItem";

-- CreateTable
CREATE TABLE "PaymentComplement" (
    "id" TEXT NOT NULL,
    "invoiceOrigenId" TEXT NOT NULL,
    "cfdiPagoUuid" TEXT NOT NULL,
    "montoPagado" DECIMAL(10,2) NOT NULL,
    "parcialidad" INTEGER NOT NULL DEFAULT 1,
    "saldoAnterior" DECIMAL(10,2) NOT NULL,
    "saldoInsoluto" DECIMAL(10,2) NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentComplement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentComplement_cfdiPagoUuid_key" ON "PaymentComplement"("cfdiPagoUuid");

-- CreateIndex
CREATE UNIQUE INDEX "BillingReceptor_emisorId_rfc_key" ON "BillingReceptor"("emisorId", "rfc");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_satUuid_key" ON "Invoice"("satUuid");

-- AddForeignKey
ALTER TABLE "BillingReceptor" ADD CONSTRAINT "BillingReceptor_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "BillingEmisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingConcept" ADD CONSTRAINT "BillingConcept_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "BillingEmisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentComplement" ADD CONSTRAINT "PaymentComplement_invoiceOrigenId_fkey" FOREIGN KEY ("invoiceOrigenId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
