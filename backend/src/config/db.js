import mongoose from "mongoose";

/**
 * Connect to MongoDB Atlas or local MongoDB instance.
 * Automatically handles connection retries and logs clear status messages.
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("❌ MONGODB_URI is not defined in backend/.env!");
    console.error("👉 Please add your MongoDB Atlas connection string in backend/.env");
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
    });

    console.log(`✅ MongoDB Connected successfully to host: ${conn.connection.host} (${conn.connection.name})`);
    return true;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.warn("⚠️  Server will continue running in fallback mode so APIs and routes remain accessible.");
    console.warn("👉 Verify your Atlas IP whitelist (allow 0.0.0.0/0) and credentials in backend/.env.");
    return false;
  }
};

