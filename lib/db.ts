// أساس اتصال MongoDB — يُستخدم عبر API routes.
import { MongoClient } from "mongodb";

const globalForMongo = globalThis as unknown as { _mongoClient?: Promise<MongoClient> };

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? "lawer_office";
  if (!uri) throw new Error("MONGODB_URI غير مضبوطة في متغيرات البيئة.");

  if (!globalForMongo._mongoClient) {
    globalForMongo._mongoClient = new MongoClient(uri).connect();
  }
  const client = await globalForMongo._mongoClient;
  return { client, db: client.db(dbName) };
}

export const toPlain = <T>(doc: { _id?: unknown } & T): T => {
  const { _id: _ignored, ...rest } = doc;
  return rest as T;
};