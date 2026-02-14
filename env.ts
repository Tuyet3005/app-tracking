import { config } from "dotenv";
try {
  config({ path: "./.env.local" });
} catch (e) {
  // dotenv is optional in environments where env vars are provided externally
}
