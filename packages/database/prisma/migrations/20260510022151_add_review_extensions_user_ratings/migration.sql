-- CreateEnum
CREATE TYPE "ReviewDirection" AS ENUM ('BUYER_REVIEWS_SELLER', 'SELLER_REVIEWS_BUYER');

-- DropIndex
DROP INDEX "Review_targetId_isHidden_idx";

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "direction" "ReviewDirection" NOT NULL,
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "title" VARCHAR(150);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "buyerRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalReviews" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Review_targetId_direction_isHidden_idx" ON "Review"("targetId", "direction", "isHidden");

