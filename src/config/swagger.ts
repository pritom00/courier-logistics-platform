// OpenAPI 3.0 specification for the Courier & Logistics Management Platform API.
// Served via swagger-ui-express at /api-docs (see src/app.ts).
// Written as a static spec (rather than JSDoc-comment scanning) so it stays
// accurate and easy to review in one place across all 28 endpoints.

export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Courier & Logistics Management Platform API",
    version: "1.0.0",
    description:
      "Backend REST API for a courier/logistics platform. Three roles (CUSTOMER, COURIER, ADMIN) with strict RBAC. All responses follow a consistent { success, message, data|errors } shape.",
  },
  servers: [
    { url: "https://courier-logistics-platform.onrender.com/api/v1", description: "Production (Render)" },
    { url: "http://localhost:5000/api/v1", description: "Local development" },
  ],
  tags: [
    { name: "Auth" },
    { name: "Users" },
    { name: "Hubs" },
    { name: "Shipments" },
    { name: "Payments" },
    { name: "Admin" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operation successful" },
          data: { type: "object" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Something went wrong" },
          errors: { type: "array", items: { type: "object" } },
        },
      },
      RegisterInput: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Jane Doe" },
          email: { type: "string", format: "email", example: "jane@example.com" },
          password: { type: "string", minLength: 6, example: "Password@123" },
          phone: { type: "string" },
          role: { type: "string", enum: ["CUSTOMER", "COURIER"] },
        },
      },
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      CreateShipmentInput: {
        type: "object",
        required: ["pickupAddress", "deliveryAddress", "receiverName", "receiverPhone", "packageWeightKg"],
        properties: {
          pickupAddress: { type: "string" },
          deliveryAddress: { type: "string" },
          receiverName: { type: "string" },
          receiverPhone: { type: "string" },
          packageWeightKg: { type: "number", example: 2.5 },
          packageDesc: { type: "string" },
          isFragile: { type: "boolean" },
          originHubId: { type: "string", format: "uuid" },
          destinationHubId: { type: "string", format: "uuid" },
        },
      },
      UpdateStatusInput: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: [
              "PENDING", "PICKUP_SCHEDULED", "COURIER_ASSIGNED", "PICKED_UP",
              "AT_ORIGIN_HUB", "IN_TRANSIT", "AT_DESTINATION_HUB", "OUT_FOR_DELIVERY",
              "DELIVERED", "FAILED_DELIVERY", "RETURNED", "CANCELLED",
            ],
          },
          note: { type: "string" },
        },
      },
      CreateHubInput: {
        type: "object",
        required: ["name", "city", "address"],
        properties: {
          name: { type: "string" },
          city: { type: "string" },
          address: { type: "string" },
          managerId: { type: "string", format: "uuid" },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user (CUSTOMER or COURIER)",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterInput" } } } },
        responses: {
          "201": { description: "User registered", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
          "409": { description: "Email already exists", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "422": { description: "Validation failed", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login with email and password",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginInput" } } } },
        responses: {
          "200": { description: "Login successful, returns access/refresh tokens" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/auth/google": {
      post: {
        tags: ["Auth"],
        summary: "Login/register via Google ID token (GCP social login)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["idToken"], properties: { idToken: { type: "string" } } } } },
        },
        responses: { "200": { description: "Google login successful" } },
      },
    },
    "/auth/refresh-token": {
      post: {
        tags: ["Auth"],
        summary: "Exchange a refresh token for a new access token",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } } } },
        },
        responses: { "200": { description: "New access token issued" }, "401": { description: "Invalid/expired refresh token" } },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout (invalidates stored refresh token)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Logged out" }, "401": { description: "Unauthorized" } },
      },
    },
    "/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get my profile",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Profile fetched" }, "401": { description: "Unauthorized" } },
      },
      patch: {
        tags: ["Users"],
        summary: "Update my profile",
        security: [{ bearerAuth: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, phone: { type: "string" } } } } } },
        responses: { "200": { description: "Profile updated" } },
      },
    },
    "/hubs": {
      get: {
        tags: ["Hubs"],
        summary: "List hubs (paginated, filter by city)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "city", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Hubs fetched" } },
      },
      post: {
        tags: ["Hubs"],
        summary: "Create a hub (ADMIN only)",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateHubInput" } } } },
        responses: { "201": { description: "Hub created" }, "403": { description: "Forbidden - not an admin" } },
      },
    },
    "/hubs/{id}": {
      get: {
        tags: ["Hubs"], summary: "Get hub by ID", security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Hub fetched" }, "404": { description: "Not found" } },
      },
      patch: {
        tags: ["Hubs"], summary: "Update hub (ADMIN only)", security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Hub updated" }, "403": { description: "Forbidden" } },
      },
      delete: {
        tags: ["Hubs"], summary: "Soft-delete hub (ADMIN only)", security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Hub deleted (soft)" }, "403": { description: "Forbidden" } },
      },
    },
    "/shipments": {
      get: {
        tags: ["Shipments"],
        summary: "List shipments (paginated, filter by status, sortable)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["createdAt", "price", "status"] } },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
        ],
        responses: { "200": { description: "Shipments fetched (scoped by role: customers see own, couriers see assigned, admin sees all)" } },
      },
      post: {
        tags: ["Shipments"],
        summary: "Create a shipment (CUSTOMER only)",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateShipmentInput" } } } },
        responses: { "201": { description: "Shipment created, price auto-calculated" }, "403": { description: "Forbidden - not a customer" } },
      },
    },
    "/shipments/search": {
      get: {
        tags: ["Shipments"], summary: "Search shipments by tracking code, receiver, or address",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Search results" } },
      },
    },
    "/shipments/my-assigned": {
      get: {
        tags: ["Shipments"], summary: "List shipments assigned to me (COURIER only)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Assigned shipments fetched" }, "403": { description: "Forbidden" } },
      },
    },
    "/shipments/{id}": {
      get: {
        tags: ["Shipments"], summary: "Get shipment by ID with full tracking timeline",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Shipment fetched" }, "404": { description: "Not found" }, "403": { description: "Forbidden - not owner/assignee/admin" } },
      },
      patch: {
        tags: ["Shipments"], summary: "Update shipment details (owner/admin, not finalized)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Shipment updated" } },
      },
      delete: {
        tags: ["Shipments"], summary: "Soft-delete shipment (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Shipment deleted (soft)" }, "403": { description: "Forbidden" } },
      },
    },
    "/shipments/{id}/assign": {
      post: {
        tags: ["Shipments"], summary: "Assign a courier to a shipment (ADMIN only, transaction-safe)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["courierId"], properties: { courierId: { type: "string", format: "uuid" } } } } } },
        responses: { "200": { description: "Courier assigned, status -> COURIER_ASSIGNED" }, "409": { description: "Already has a courier assigned" }, "403": { description: "Forbidden" } },
      },
    },
    "/shipments/{id}/status": {
      patch: {
        tags: ["Shipments"], summary: "Update shipment status (ADMIN/COURIER, enforced by state machine)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateStatusInput" } } } },
        responses: { "200": { description: "Status updated" }, "400": { description: "Invalid status transition" }, "403": { description: "Forbidden" } },
      },
    },
    "/shipments/{id}/cancel": {
      post: {
        tags: ["Shipments"], summary: "Cancel a shipment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Shipment cancelled" }, "400": { description: "Cannot cancel a finalized shipment" } },
      },
    },
    "/payments/initiate": {
      post: {
        tags: ["Payments"], summary: "Initiate payment for a shipment (creates real Stripe PaymentIntent)",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["shipmentId"], properties: { shipmentId: { type: "string", format: "uuid" } } } } } },
        responses: { "201": { description: "Payment session created, returns clientSecret" }, "409": { description: "Already paid" } },
      },
    },
    "/payments/webhook": {
      post: {
        tags: ["Payments"], summary: "Stripe webhook (signature-verified, source of truth for payment status)",
        description: "Called directly by Stripe, not by API clients. Verifies the Stripe-Signature header against STRIPE_WEBHOOK_SECRET.",
        responses: { "200": { description: "Webhook processed" }, "400": { description: "Invalid signature" } },
      },
    },
    "/payments/{id}": {
      get: {
        tags: ["Payments"], summary: "Get payment status by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Payment fetched" }, "404": { description: "Not found" } },
      },
    },
    "/admin/dashboard-stats": {
      get: {
        tags: ["Admin"], summary: "Aggregate dashboard stats (ADMIN only, Redis-cached 60s)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Stats fetched (response includes `cached: true|false`)" }, "403": { description: "Forbidden" } },
      },
    },
    "/admin/audit-logs": {
      get: {
        tags: ["Admin"], summary: "List audit logs (ADMIN only, paginated)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "entityType", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Audit logs fetched" }, "403": { description: "Forbidden" } },
      },
    },
    "/admin/users": {
      get: {
        tags: ["Admin"], summary: "List users (ADMIN only, paginated, filter by role, search)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "role", in: "query", schema: { type: "string", enum: ["CUSTOMER", "COURIER", "ADMIN"] } },
          { name: "q", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Users fetched" }, "403": { description: "Forbidden" } },
      },
    },
    "/admin/users/{id}/role": {
      patch: {
        tags: ["Admin"], summary: "Update a user's role (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["role"], properties: { role: { type: "string", enum: ["CUSTOMER", "COURIER", "ADMIN"] } } } } } },
        responses: { "200": { description: "Role updated" }, "403": { description: "Forbidden" } },
      },
    },
  },
};
