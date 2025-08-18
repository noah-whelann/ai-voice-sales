-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "car_preferences" JSONB,
    "when_to_buy" TEXT,
    "trade_in" TEXT,
    "customer_notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Call" (
    "id" SERIAL NOT NULL,
    "customer_email" TEXT,
    "customer_phone" TEXT,
    "transcript" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "public"."Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "public"."Customer"("phone");

-- AddForeignKey
ALTER TABLE "public"."Call" ADD CONSTRAINT "Call_customer_email_fkey" FOREIGN KEY ("customer_email") REFERENCES "public"."Customer"("email") ON DELETE SET NULL ON UPDATE CASCADE;
