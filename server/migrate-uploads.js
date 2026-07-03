require("dotenv").config();
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const Ticket = mongoose.model(
  "Ticket",
  new mongoose.Schema({ _id: Number, attachments: [{ url: String, name: String, type: String }] }, { strict: false })
);

async function uploadToCloudinary(localPath) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(localPath, { folder: "boardio", resource_type: "auto" }, (error, result) =>
      error ? reject(error) : resolve(result)
    );
  });
}

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const tickets = await Ticket.find({ "attachments.0": { $exists: true } }).lean();
  console.log(`Found ${tickets.length} tickets with attachments`);

  let uploaded = 0, skipped = 0, failed = 0;

  for (const ticket of tickets) {
    let changed = false;

    for (const attachment of ticket.attachments) {
      if (!attachment.url || !attachment.url.startsWith("/uploads/")) continue;

      const filename = attachment.url.replace("/uploads/", "");
      const localPath = path.join(__dirname, "uploads", filename);

      if (!fs.existsSync(localPath)) {
        console.log(`  SKIP (not found locally): ${filename}`);
        skipped++;
        continue;
      }

      try {
        const result = await uploadToCloudinary(localPath);
        console.log(`  OK: ${filename} -> ${result.secure_url}`);
        attachment.url = result.secure_url;
        changed = true;
        uploaded++;
      } catch (err) {
        console.error(`  FAIL: ${filename} - ${err.message}`);
        failed++;
      }
    }

    if (changed) {
      await mongoose.connection.db.collection("tickets").updateOne(
        { _id: ticket._id },
        { $set: { attachments: ticket.attachments } }
      );
      console.log(`  Saved ticket ${ticket._id}`);
    }
  }

  console.log(`\nDone. Uploaded: ${uploaded}, Skipped: ${skipped}, Failed: ${failed}`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
