-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DRIVER', 'ADMIN', 'SUPER_ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'DRIVER';
