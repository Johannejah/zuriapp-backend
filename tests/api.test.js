const request = require("supertest");
const app = require("../app");

describe("GET /api/health", () => {
  it("returns 200 and status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("zuriapp-backend");
  });
});

describe("GET /api/products", () => {
  it("returns all products", async () => {
    const res = await request(app).get("/api/products");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("filters by category", async () => {
    const res = await request(app).get("/api/products?category=apparel");
    expect(res.statusCode).toBe(200);
    res.body.forEach((p) => expect(p.category).toBe("apparel"));
  });

  it("returns 404 for unknown product id", async () => {
    const res = await request(app).get("/api/products/9999");
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/store", () => {
  it("returns store name and product count", async () => {
    const res = await request(app).get("/api/store");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("name");
    expect(res.body).toHaveProperty("totalProducts");
  });
});

describe("404 handler", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/api/unknown");
    expect(res.statusCode).toBe(404);
  });
});
