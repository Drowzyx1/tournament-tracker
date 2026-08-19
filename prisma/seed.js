// Seeds a known test account (with a couple of sample trips) so you have
// something to log in with immediately, on any fresh database.
// Run with: npm run db:seed

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "password123";

// Builds a date-only value the same way the app itself does when you pick a
// date in the UI (a plain "YYYY-MM-DD" string), instead of a raw timestamp —
// otherwise the stored instant's UTC calendar day can differ from the
// intended local day depending on time zone and time of day.
function dateOnlyDaysFromNow(days) {
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const yyyy = local.getFullYear();
  const mm = String(local.getMonth() + 1).padStart(2, "0");
  const dd = String(local.getDate()).padStart(2, "0");
  return new Date(`${yyyy}-${mm}-${dd}`);
}

async function main() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: {},
    create: { email: TEST_EMAIL, name: "Test User", passwordHash },
  });

  const existingTrips = await prisma.trip.count({ where: { userId: user.id } });
  if (existingTrips === 0) {
    await prisma.trip.create({
      data: {
        name: "Regionals - Dallas",
        eventDate: dateOnlyDaysFromNow(14),
        userId: user.id,
        transactions: {
          create: [
            { type: "EXPENSE", desc: "Entry fee", amount: 40, date: new Date() },
            { type: "EXPENSE", desc: "Hotel (2 nights)", amount: 180, date: new Date() },
            { type: "EARNING", desc: "2nd place prize", amount: 120, date: new Date() },
          ],
        },
      },
    });
    await prisma.trip.create({
      data: {
        name: "Local Store Championship",
        userId: user.id,
        transactions: {
          create: [
            { type: "EXPENSE", desc: "Entry fee", amount: 15 },
            { type: "EARNING", desc: "1st place prize", amount: 60 },
          ],
        },
      },
    });
  }

  console.log("Seeded test account:");
  console.log(`  email:    ${TEST_EMAIL}`);
  console.log(`  password: ${TEST_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
