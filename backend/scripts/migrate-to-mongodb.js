const fs = require('fs');
const path = require('path');
const { connectDb, closeDb } = require('../database/connection');
const userRepository = require('../repositories/userRepository');
const ticketRepository = require('../repositories/ticketRepository');
const messageRepository = require('../repositories/messageRepository');

const DB_JSON_PATH = path.join(__dirname, '../db.json');

async function runMigration(force = false) {
  console.log(`Starting MongoDB Migration & Seeding process (force=${force})...`);

  if (!fs.existsSync(DB_JSON_PATH)) {
    console.error(`Error: Source ${DB_JSON_PATH} does not exist.`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DB_JSON_PATH, 'utf8');
  const dbData = JSON.parse(rawData);

  await connectDb();

  if (force) {
    console.log('Force re-seeding enabled. Clearing existing collection documents...');
    await userRepository.collection.deleteMany({});
    await ticketRepository.collection.deleteMany({});
    await messageRepository.collection.deleteMany({});
  }

  // 1. Create Indexes
  await ticketRepository.createIndexes();

  // 2. Migrate Users
  const existingUsersCount = await userRepository.collection.countDocuments();
  if (existingUsersCount === 0 && dbData.users && dbData.users.length > 0) {
    console.log(`Migrating ${dbData.users.length} users...`);
    await userRepository.insertMany(dbData.users);
    console.log('Users migration complete.');
  } else {
    console.log(`Users collection already has ${existingUsersCount} documents. Skipping insertion.`);
  }

  // 3. Migrate Tickets & Messages
  const existingTicketsCount = await ticketRepository.collection.countDocuments();
  if (existingTicketsCount === 0 && dbData.tickets && dbData.tickets.length > 0) {
    console.log(`Migrating ${dbData.tickets.length} tickets and their messages...`);

    const ticketsToInsert = [];
    const messagesToInsert = [];

    for (const ticket of dbData.tickets) {
      const ticketCopy = { ...ticket };
      const messages = ticketCopy.messages || [];

      messages.forEach(msg => {
        messagesToInsert.push({
          ...msg,
          ticketId: ticket.id
        });
      });

      delete ticketCopy.messages;
      ticketsToInsert.push(ticketCopy);
    }

    if (ticketsToInsert.length > 0) {
      await ticketRepository.insertMany(ticketsToInsert);
    }

    if (messagesToInsert.length > 0) {
      await messageRepository.insertMany(messagesToInsert);
    }

    console.log(`Successfully migrated ${ticketsToInsert.length} tickets and ${messagesToInsert.length} messages.`);
  } else {
    console.log(`Tickets collection already contains documents. Skipping insertion.`);
  }

  console.log('MongoDB Migration completed successfully!');
}

if (require.main === module) {
  runMigration()
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      closeDb().then(() => process.exit(1));
    });
}

module.exports = { runMigration };
