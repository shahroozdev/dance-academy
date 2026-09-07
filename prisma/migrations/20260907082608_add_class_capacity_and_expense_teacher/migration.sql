-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "capacity" INTEGER;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "teacherId" TEXT;

-- CreateIndex
CREATE INDEX "Expense_teacherId_idx" ON "Expense"("teacherId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
