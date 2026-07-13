import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  out: "./introspected",
  dbCredentials: {
    url: process.env.DB_URL ?? "mysql://root:serfel@127.0.0.1:3307/serfel",
  },
});
