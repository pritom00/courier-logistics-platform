/**
 * verify-all.js
 * ------------------------------------------------------------------
 * One-command smoke test covering every mandatory requirement:
 * health, auth, RBAC (all 3 roles), CRUD, validation, error handling,
 * state machine, payments, Redis caching, audit logs, soft delete.
 *
 * Usage:
 *   node scripts/verify-all.js                 (tests localhost:5000)
 *   node scripts/verify-all.js --live           (tests the Render URL)
 *
 * Requires Node 18+ (uses built-in fetch). No dependencies needed.
 * ------------------------------------------------------------------
 */

const isLive = process.argv.includes("--live");
const BASE = isLive
  ? "https://courier-logistics-platform.onrender.com/api/v1"
  : "http://localhost:5000/api/v1";

let pass = 0;
let fail = 0;
const failures = [];

function check(label, condition, extra = "") {
  if (condition) {
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${label}`);
  } else {
    fail++;
    failures.push(label + (extra ? ` (${extra})` : ""));
    console.log(`  \x1b[31m✗\x1b[0m ${label}${extra ? " - " + extra : ""}`);
  }
}

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, json };
}

async function main() {
  console.log(`\nRunning full verification against: ${BASE}\n`);

  // ---------- Health ----------
  console.log("Health");
  {
    const res = await fetch(BASE.replace("/api/v1", "/health"));
    const json = await res.json();
    check("GET /health returns 200 + success:true", res.status === 200 && json.success === true);
  }

  // ---------- Auth ----------
  console.log("\nAuth");
  const badRegister = await req("POST", "/auth/register", {
    name: "Bad",
    email: "not-an-email",
    password: "Password@123",
  });
  check("Register with invalid email -> 422 structured error", badRegister.status === 422 && badRegister.json.success === false);

  const uniqueEmail = `verify-${Date.now()}@example.com`;
  const goodRegister = await req("POST", "/auth/register", {
    name: "Verify User",
    email: uniqueEmail,
    password: "Password@123",
    role: "CUSTOMER",
  });
  check("Register with valid data -> 201", goodRegister.status === 201 && goodRegister.json.success === true);

  const adminLogin = await req("POST", "/auth/login", { email: "admin@courierhub.com", password: "Admin@12345" });
  check("Login as admin -> 200 + accessToken", adminLogin.status === 200 && !!adminLogin.json.data?.accessToken);
  const adminToken = adminLogin.json.data?.accessToken;

  const customerLogin = await req("POST", "/auth/login", { email: "customer@courierhub.com", password: "Customer@123" });
  check("Login as customer -> 200 + accessToken", customerLogin.status === 200 && !!customerLogin.json.data?.accessToken);
  const customerToken = customerLogin.json.data?.accessToken;

  const courierLogin = await req("POST", "/auth/login", { email: "courier@courierhub.com", password: "Courier@123" });
  check("Login as courier -> 200 + accessToken", courierLogin.status === 200 && !!courierLogin.json.data?.accessToken);
  const courierToken = courierLogin.json.data?.accessToken;

  const wrongLogin = await req("POST", "/auth/login", { email: "admin@courierhub.com", password: "wrongpassword" });
  check("Login with wrong password -> 401", wrongLogin.status === 401);

  const noToken = await req("GET", "/users/me");
  check("GET /users/me with no token -> 401", noToken.status === 401);

  // ---------- RBAC ----------
  console.log("\nRBAC (all 3 roles)");
  const customerCreatesHub = await req("POST", "/hubs", { name: "X", city: "X", address: "X" }, customerToken);
  check("Customer creating a hub -> 403", customerCreatesHub.status === 403);

  const courierCreatesShipment = await req("POST", "/shipments", {
    pickupAddress: "X", deliveryAddress: "X", receiverName: "X", receiverPhone: "X", packageWeightKg: 1,
  }, courierToken);
  check("Courier creating a shipment -> 403", courierCreatesShipment.status === 403);

  const customerListsUsers = await req("GET", "/admin/users", null, customerToken);
  check("Customer accessing admin/users -> 403", customerListsUsers.status === 403);

  const adminListsUsers = await req("GET", "/admin/users", null, adminToken);
  check("Admin accessing admin/users -> 200", adminListsUsers.status === 200);

  // ---------- CRUD: Hubs ----------
  console.log("\nCRUD - Hubs");
  const createHub = await req("POST", "/hubs", { name: "Verify Hub", city: "Dhaka", address: "Test Address" }, adminToken);
  check("POST /hubs (admin) -> 201", createHub.status === 201);
  const hubId = createHub.json.data?.id;

  const getHub = await req("GET", `/hubs/${hubId}`, null, adminToken);
  check("GET /hubs/:id -> 200", getHub.status === 200);

  const updateHub = await req("PATCH", `/hubs/${hubId}`, { address: "Updated Address" }, adminToken);
  check("PATCH /hubs/:id -> 200", updateHub.status === 200 && updateHub.json.data?.address === "Updated Address");

  const listHubsBefore = await req("GET", "/hubs", null, adminToken);
  const countBefore = listHubsBefore.json.data?.meta?.total ?? -1;

  const deleteHub = await req("DELETE", `/hubs/${hubId}`, null, adminToken);
  check("DELETE /hubs/:id (soft) -> 200", deleteHub.status === 200);

  const listHubsAfter = await req("GET", "/hubs", null, adminToken);
  const countAfter = listHubsAfter.json.data?.meta?.total ?? -1;
  check("Soft-deleted hub excluded from list", countAfter === countBefore - 1, `before=${countBefore}, after=${countAfter}`);

  // ---------- 404 ----------
  console.log("\nError handling");
  const fake404 = await req("GET", "/shipments/00000000-0000-0000-0000-000000000099", null, adminToken);
  check("GET nonexistent shipment -> 404", fake404.status === 404);

  // ---------- CRUD + business logic: Shipments ----------
  console.log("\nCRUD & business logic - Shipments");
  const createShipment = await req("POST", "/shipments", {
    pickupAddress: "House 1, Dhaka",
    deliveryAddress: "House 2, Chattogram",
    receiverName: "Test Receiver",
    receiverPhone: "01700000000",
    packageWeightKg: 2,
  }, customerToken);
  check("POST /shipments (customer) -> 201", createShipment.status === 201);
  const shipmentId = createShipment.json.data?.id;
  const expectedPrice = 60 + 2 * 15;
  check("Price auto-calculated correctly", createShipment.json.data?.price === expectedPrice, `expected ${expectedPrice}, got ${createShipment.json.data?.price}`);

  const listShipments = await req("GET", "/shipments?page=1&limit=10&sortBy=createdAt&sortOrder=desc", null, adminToken);
  check("GET /shipments paginated+sorted -> 200", listShipments.status === 200 && !!listShipments.json.data?.meta);

  const searchShipments = await req("GET", "/shipments/search?q=CRX", null, adminToken);
  check("GET /shipments/search -> 200", searchShipments.status === 200);

  const couriers = await req("GET", "/admin/users?role=COURIER", null, adminToken);
  const courierId = couriers.json.data?.items?.[0]?.id;
  check("Fetched a courier ID for assignment", !!courierId);

  const assign = await req("POST", `/shipments/${shipmentId}/assign`, { courierId }, adminToken);
  check("POST /shipments/:id/assign -> 200", assign.status === 200 && assign.json.data?.status === "COURIER_ASSIGNED");

  const validTransition = await req("PATCH", `/shipments/${shipmentId}/status`, { status: "PICKED_UP" }, courierToken);
  check("Valid status transition (COURIER_ASSIGNED -> PICKED_UP) -> 200", validTransition.status === 200);

  const invalidTransition = await req("PATCH", `/shipments/${shipmentId}/status`, { status: "DELIVERED" }, courierToken);
  check("Invalid status transition (PICKED_UP -> DELIVERED) -> 400", invalidTransition.status === 400);

  // ---------- Payments ----------
  console.log("\nPayments");
  const initiatePayment = await req("POST", "/payments/initiate", { shipmentId }, customerToken);
  check("POST /payments/initiate -> 201 with clientSecret", initiatePayment.status === 201 && !!initiatePayment.json.data?.clientSecret);
  const paymentId = initiatePayment.json.data?.payment?.id;

  const getPayment = await req("GET", `/payments/${paymentId}`, null, customerToken);
  check("GET /payments/:id -> 200, status PENDING", getPayment.status === 200 && getPayment.json.data?.status === "PENDING");

  // ---------- Admin: caching + audit ----------
  console.log("\nAdmin - Redis caching & audit logs");
  const stats1 = await req("GET", "/admin/dashboard-stats", null, adminToken);
  const stats2 = await req("GET", "/admin/dashboard-stats", null, adminToken);
  check("Dashboard stats 1st call cached:false", stats1.json.data?.cached === false);
  check("Dashboard stats 2nd call cached:true (Redis)", stats2.json.data?.cached === true);

  const auditLogs = await req("GET", "/admin/audit-logs?limit=5", null, adminToken);
  check("GET /admin/audit-logs -> 200 with items", auditLogs.status === 200 && Array.isArray(auditLogs.json.data?.items));

  // ---------- Rate limiting (only run locally to avoid hammering prod) ----------
  if (!isLive) {
    console.log("\nRate limiting (20 req/15min on auth routes)");
    let sawRateLimit = false;
    for (let i = 0; i < 22; i++) {
      const r = await req("POST", "/auth/login", { email: "admin@courierhub.com", password: "wrong" });
      if (r.status === 429) sawRateLimit = true;
    }
    check("Rate limiter triggers 429 after threshold", sawRateLimit);
  } else {
    console.log("\nRate limiting: skipped in --live mode to avoid locking yourself out of prod login");
  }

  // ---------- Summary ----------
  console.log("\n" + "=".repeat(50));
  console.log(`RESULTS: ${pass} passed, ${fail} failed`);
  console.log("=".repeat(50));
  if (failures.length) {
    console.log("\nFailed checks:");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exitCode = 1;
  } else {
    console.log("\nAll checks passed. ✅");
  }
}

main().catch((err) => {
  console.error("\nScript crashed:", err.message);
  process.exit(1);
});
