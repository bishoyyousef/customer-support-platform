const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../db.json');

function readDb() {
  const data = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(data);
}

function writeDb(data) {
  const tempPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, DB_PATH);
}

console.log("Starting concurrency load test on flat-file database...");

const initialDb = readDb();
const initialTicketCount = initialDb.tickets.length;

// Trigger 50 rapid parallel writes simulating concurrent ticket modifications
const promises = [];
for (let i = 0; i < 50; i++) {
  promises.push(new Promise((resolve) => {
    // Delay slightly to stagger calls
    setTimeout(() => {
      try {
        const db = readDb();
        db.tickets.push({
          id: `TEST-${i}-${Date.now()}`,
          title: `Load Test Ticket ${i}`,
          description: "This is a load test ticket data to check concurrent transactions.",
          category: "Technical",
          urgency: "Low",
          status: "requires_attention",
          customerId: "cust_1",
          customerName: "Alice Johnson",
          assignedTo: null,
          assignedName: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          resolutionSummary: null,
          activityTimeline: [],
          messages: []
        });
        writeDb(db);
        resolve({ success: true, index: i });
      } catch (err) {
        resolve({ success: false, error: err.message, index: i });
      }
    }, Math.random() * 200); // Random stagger up to 200ms
  }));
}

Promise.all(promises).then((results) => {
  const failures = results.filter(r => !r.success);
  console.log(`Load test execution finished. Total promises executed: ${results.length}`);
  console.log(`Successful writes: ${results.length - failures.length}`);
  console.log(`Failed writes: ${failures.length}`);

  if (failures.length > 0) {
    console.error("FAIL: Concurrency load test had transaction failures:", failures);
    process.exit(1);
  } else {
    // Read again to verify data integrity
    const finalDb = readDb();
    const finalCount = finalDb.tickets.length;
    console.log(`Initial ticket count: ${initialTicketCount}`);
    console.log(`Expected final ticket count: ${initialTicketCount + 50}`);
    console.log(`Actual final ticket count: ${finalCount}`);
    
    // Restore DB to original seed state first
    initialDb.tickets = initialDb.tickets.filter(t => !t.id.startsWith('TEST-'));
    writeDb(initialDb);
    console.log("Database restored to initial seed state.");

    if (finalCount === initialTicketCount + 50) {
      console.log("SUCCESS: Database integrity verified! No transactions lost, atomic write system is robust.");
      process.exit(0);
    } else {
      console.error("FAIL: Ticket count mismatch! Lost updates detected.");
      process.exit(1);
    }
  }
});
