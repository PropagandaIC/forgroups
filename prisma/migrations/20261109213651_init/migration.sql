-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ORGANIZER', 'RESTAURANT', 'AGENT');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'PENDING', 'DISABLED');

-- CreateEnum
CREATE TYPE "OrgKind" AS ENUM ('RESTAURANT', 'ORGANIZER');

-- CreateEnum
CREATE TYPE "OrganizerType" AS ENUM ('TOUR_OPERATOR', 'AGENZIA', 'AZIENDA', 'GUIDA', 'SCUOLA', 'UNIVERSITA', 'PARROCCHIA', 'ASSOCIAZIONE', 'WEDDING_PLANNER', 'EVENTI', 'PRIVATO');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('ONLINE_FULL', 'ONLINE_DEPOSIT', 'ON_SITE', 'INVOICE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentRecordStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InquiryStage" AS ENUM ('NEW', 'QUALIFIED', 'QUOTED', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "locale" TEXT NOT NULL DEFAULT 'it',
    "organizationId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "agentShare" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "kind" "OrgKind" NOT NULL,
    "organizerType" "OrganizerType",
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "citySlug" TEXT,
    "province" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IT',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "billingName" TEXT,
    "vatNumber" TEXT,
    "fiscalCode" TEXT,
    "sdiCode" TEXT,
    "pec" TEXT,
    "iban" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "descriptionEn" TEXT,
    "coverImage" TEXT,
    "images" TEXT,
    "cuisine" TEXT,
    "tags" TEXT,
    "openingHours" TEXT,
    "maxCapacity" INTEGER,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "commissionRate" INTEGER NOT NULL DEFAULT 1000,
    "agentId" TEXT,
    "contractDate" TIMESTAMP(3),
    "contractNotes" TEXT,
    "stripeAccountId" TEXT,
    "stripeTransfersActive" BOOLEAN NOT NULL DEFAULT false,
    "stripeCheckedAt" TIMESTAMP(3),
    "acceptsOnlinePayment" BOOLEAN NOT NULL DEFAULT true,
    "defaultPaymentMode" "PaymentMode" NOT NULL DEFAULT 'ONLINE_FULL',
    "defaultDepositPercent" INTEGER NOT NULL DEFAULT 30,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "organizerId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("organizerId","restaurantId")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSlot" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "weekdays" TEXT NOT NULL DEFAULT '1234567',
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "leadTimeHours" INTEGER NOT NULL DEFAULT 24,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "courses" TEXT,
    "priceCents" INTEGER NOT NULL,
    "minPax" INTEGER NOT NULL DEFAULT 10,
    "maxPax" INTEGER NOT NULL DEFAULT 100,
    "freeEvery" INTEGER,
    "audience" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuService" (
    "menuId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "MenuService_pkey" PRIMARY KEY ("menuId","serviceId")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "restaurantId" TEXT NOT NULL,
    "organizerId" TEXT,
    "createdById" TEXT,
    "inquiryId" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "groupName" TEXT,
    "groupType" TEXT,
    "groupLeader" TEXT,
    "groupLeaderPhone" TEXT,
    "language" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "serviceId" TEXT,
    "roomId" TEXT,
    "menuId" TEXT,
    "menuChoices" TEXT,
    "pax" INTEGER NOT NULL,
    "freePax" INTEGER NOT NULL DEFAULT 0,
    "dietaryNotes" TEXT,
    "priceCents" INTEGER NOT NULL,
    "extrasCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "commissionRate" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'ONLINE_FULL',
    "depositPercent" INTEGER,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paidCents" INTEGER NOT NULL DEFAULT 0,
    "paymentDueAt" TIMESTAMP(3),
    "notes" TEXT,
    "internalNotes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'platform',
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'stripe',
    "amountCents" INTEGER NOT NULL,
    "applicationFeeCents" INTEGER NOT NULL DEFAULT 0,
    "status" "PaymentRecordStatus" NOT NULL DEFAULT 'PENDING',
    "stripeCheckoutId" TEXT,
    "stripePaymentIntent" TEXT,
    "checkoutUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "stage" "InquiryStage" NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'website',
    "organizerId" TEXT,
    "contactName" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "language" TEXT,
    "city" TEXT,
    "date" TIMESTAMP(3),
    "time" TEXT,
    "pax" INTEGER,
    "groupType" TEXT,
    "serviceKind" TEXT,
    "budgetCents" INTEGER,
    "message" TEXT,
    "restaurantId" TEXT,
    "assigneeId" TEXT,
    "lostReason" TEXT,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteOption" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "menuId" TEXT,
    "priceCents" INTEGER NOT NULL,
    "note" TEXT,
    "chosen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "inquiryId" TEXT,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "data" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentPayout" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "revenueCents" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Counter" (
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeAccountId_key" ON "Organization"("stripeAccountId");

-- CreateIndex
CREATE INDEX "Organization_kind_status_idx" ON "Organization"("kind", "status");

-- CreateIndex
CREATE INDEX "Organization_citySlug_idx" ON "Organization"("citySlug");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_code_key" ON "Booking"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_inquiryId_key" ON "Booking"("inquiryId");

-- CreateIndex
CREATE INDEX "Booking_date_idx" ON "Booking"("date");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_restaurantId_date_idx" ON "Booking"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "Booking_organizerId_date_idx" ON "Booking"("organizerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeCheckoutId_key" ON "Payment"("stripeCheckoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_code_key" ON "Inquiry"("code");

-- CreateIndex
CREATE INDEX "Inquiry_stage_idx" ON "Inquiry"("stage");

-- CreateIndex
CREATE INDEX "Message_bookingId_idx" ON "Message"("bookingId");

-- CreateIndex
CREATE INDEX "Message_inquiryId_idx" ON "Message"("inquiryId");

-- CreateIndex
CREATE INDEX "Event_entityType_entityId_idx" ON "Event"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentPayout_agentId_period_key" ON "AgentPayout"("agentId", "period");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSlot" ADD CONSTRAINT "ServiceSlot_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSlot" ADD CONSTRAINT "ServiceSlot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuService" ADD CONSTRAINT "MenuService_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuService" ADD CONSTRAINT "MenuService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteOption" ADD CONSTRAINT "QuoteOption_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteOption" ADD CONSTRAINT "QuoteOption_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteOption" ADD CONSTRAINT "QuoteOption_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPayout" ADD CONSTRAINT "AgentPayout_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
