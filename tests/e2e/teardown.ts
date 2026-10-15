import { deleteTestUsers, hasAdmin } from "./support";

// Remove every throwaway e2e user (and, by cascade, their scores) even if a test crashed.
export default async function teardown() {
  if (!hasAdmin) return;
  const n = await deleteTestUsers();
  if (n) console.log(`\n[teardown] removed ${n} e2e test user(s) and their data`);
}
