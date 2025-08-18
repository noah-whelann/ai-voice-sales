import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function findCustomerByIdentity({
  email,
  phone,
  id,
}: {
  email?: string | null;
  phone?: string | null;
  id?: number | null;
}) {
  if (id) return prisma.customer.findUnique({ where: { id } });
  if (email || phone) {
    return prisma.customer.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          phone ? { phone } : undefined,
        ].filter(Boolean) as any,
      },
    });
  }
  return null;
}

export async function getCustomerMemory(customerId: string) {
  return prisma.customer.findUnique({
    where: { id: Number(customerId) },
  });
}

export async function upsertCustomer(lead: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  when_to_buy?: string | null;
  trade_in?: string | null;
  customer_notes?: string | null;
  car_preferences?: Record<string, any> | null;
}) {
  const { email, phone } = lead;

  const existing = await prisma.customer.findFirst({
    where: {
      OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter(
        Boolean,
      ) as any,
    },
  });

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: lead.name ?? undefined,
        email: lead.email ?? undefined,
        phone: lead.phone ?? undefined,
        when_to_buy: lead.when_to_buy ?? undefined,
        trade_in: lead.trade_in ?? undefined,
        customer_notes: lead.customer_notes ?? undefined,
        car_preferences: (lead.car_preferences ??
          undefined) as Prisma.InputJsonValue,
      },
    });
  }

  return prisma.customer.create({
    data: {
      name: lead.name ?? null,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      when_to_buy: lead.when_to_buy ?? null,
      trade_in: lead.trade_in ?? null,
      customer_notes: lead.customer_notes ?? null,
      car_preferences: (lead.car_preferences ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function saveCall({
  email,
  phone,
  transcript,
}: {
  email?: string | null;
  phone?: string | null;
  transcript: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  return prisma.call.create({
    data: {
      customer_email: email ?? null,
      customer_phone: phone ?? null,
      transcript: transcript as unknown as Prisma.InputJsonValue,
    },
  });
}
