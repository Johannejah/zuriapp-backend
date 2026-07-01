require("dotenv").config();
const express = require("express");
const cors = require("cors");
const products = require("./data/products");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const app = express();

// Load secrets from AWS Secrets Manager in production
// Fall back to .env values in local development
async function loadSecrets() {
  if (process.env.NODE_ENV !== "production") {
    return {
      API_SECRET_KEY: process.env.API_SECRET_KEY,
      STORE_NAME: process.env.STORE_NAME || "Zuri Market",
    };
  }

  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: "zuriapp/production",
    })
  );

  return JSON.parse(response.SecretString);
}

let secrets = {};

// Load secrets before starting the server
loadSecrets()
  .then((loaded) => {
    secrets = loaded;
    console.log("Secrets loaded successfully");
  })
  .catch((err) => {
    console.error("Failed to load secrets:", err.message);
    console.log("Falling back to environment variables");
    secrets = {
      API_SECRET_KEY: process.env.API_SECRET_KEY,
      STORE_NAME: process.env.STORE_NAME || "Zuri Market",
    };
  });

app.use(cors());
app.use(express.json());

const validateApiKey = (req, res, next) => {
  const key = req.headers["x-api-key"];
  if (!key || key !== secrets.API_SECRET_KEY) {
    return res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
  }
  next();
};

// GET /api/health — Kubernetes liveness and readiness probe
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "zuriapp-backend",
    timestamp: new Date().toISOString(),
  });
});

// GET /api/store — store info
app.get("/api/store", (req, res) => {
  res.json({ name: secrets.STORE_NAME || "Zuri Market", totalProducts: products.length });
});

// GET /api/products — all products (optional ?category= filter)
app.get("/api/products", (req, res) => {
  const { category } = req.query;
  const result = category
    ? products.filter((p) => p.category === category)
    : products;
  res.json(result);
});

// GET /api/products/:id — single product
app.get("/api/products/:id", (req, res) => {
  const product = products.find((p) => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// POST /api/cart/validate — validate cart items (protected)
app.post("/api/cart/validate", validateApiKey, (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: "Invalid cart payload" });
  }
  const validated = items.map((item) => {
    const product = products.find((p) => p.id === item.id);
    if (!product) return { id: item.id, valid: false, reason: "Product not found" };
    if (product.stock < item.quantity)
      return { id: item.id, valid: false, reason: "Insufficient stock" };
    return {
      id: item.id,
      valid: true,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      subtotal: product.price * item.quantity,
    };
  });
  const total = validated
    .filter((i) => i.valid)
    .reduce((sum, i) => sum + i.subtotal, 0);
  res.json({ items: validated, total });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

module.exports = app;
