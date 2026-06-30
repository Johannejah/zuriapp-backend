require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 5000;
const STORE_NAME = process.env.STORE_NAME || "My Store";

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Store: ${STORE_NAME}`);
});
