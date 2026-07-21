import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

const sampleTest2 = {
  nameT2: "Sample Event Test 2",
  venueT2: "Rio",
  dateT2: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  totalSeatsT2: 500,
  imageUrlT2:
    "https://images.unsplash.com/photo-1626568941852-70bc179e493e?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
};

const sampleTest1 = {
  nameT1: "Sample Event Test 1",
  venueT1: "Rio",
  dateT1: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  totalSeatsT1: 1,
  imageUrlT1:
    "https://images.unsplash.com/photo-1626568941852-70bc179e493e?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
};

const sampleTest3 = {
  nameT3: "Sample Event Test 3",
  venueT3: "Rio",
  dateT3: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  totalSeatsT3: 100,
  imageUrlT3:
    "https://images.unsplash.com/photo-1626568941852-70bc179e493e?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
};

async function main() {
  console.log("Creating testing events...");
  const { nameT1, venueT1, dateT1, totalSeatsT1, imageUrlT1 } = sampleTest1;
  const { nameT2, venueT2, dateT2, totalSeatsT2, imageUrlT2 } = sampleTest2;
  const { nameT3, venueT3, dateT3, totalSeatsT3, imageUrlT3 } = sampleTest3;

  const eventT1 = await prisma.event.create({
    data: {
      name: nameT1,
      venue: venueT1,
      date: new Date(dateT1),
      totalSeats: totalSeatsT1,
      imageUrl: imageUrlT1,
      seats: {
        create: Array.from({ length: totalSeatsT1 }, (_, i) => ({
          seatNumber: `A${i + 1}`,
        })),
      },
    },
    include: { _count: { select: { seats: true } } },
  });

  const eventT2 = await prisma.event.create({
    data: {
      name: nameT2,
      venue: venueT2,
      date: new Date(dateT2),
      totalSeats: totalSeatsT2,
      imageUrl: imageUrlT2,
      seats: {
        create: Array.from({ length: totalSeatsT2 }, (_, i) => ({
          seatNumber: `A${i + 1}`,
        })),
      },
    },
    include: { _count: { select: { seats: true } } },
  });

  const eventT3 = await prisma.event.create({
    data: {
      name: nameT3,
      venue: venueT3,
      date: new Date(dateT3),
      totalSeats: totalSeatsT3,
      imageUrl: imageUrlT3,
      seats: {
        create: Array.from({ length: totalSeatsT3 }, (_, i) => ({
          seatNumber: `A${i + 1}`,
        })),
      },
    },
    include: { _count: { select: { seats: true } } },
  });

  console.log(`Database successfull! Event are seeded for Tests.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
