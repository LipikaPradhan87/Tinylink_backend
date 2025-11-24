import express from "express";
import dotenv from "dotenv";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import linksRouter from "./routes/links.js";
import cors from "cors";
import pool from "./config/db.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({
  origin: "*",
  methods: ["GET","POST","DELETE","PUT","OPTIONS"],
}));

/* -------------------------------
    SWAGGER CONFIG
-------------------------------- */
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "TinyLink API",
      version: "1.0.0",
    },
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* -------------------------------
    API ROUTES
-------------------------------- */
app.use("/api/links", linksRouter);

/* -------------------------------
    REDIRECT ROUTE (catch-all)
-------------------------------- */
app.get("/r/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const result = await pool.query(
      "SELECT code, target, clicks, last_clicked FROM links WHERE code=$1",
      [code]
    );
    if (!result.rows.length) return res.status(404).send("Short URL not found");
    return res.redirect(302, result.rows[0].target);
  } catch (err) {
    return res.status(500).send("Server error");
  }
});

/* -------------------------------
    HOME PAGE
-------------------------------- */
app.get("/", (req, res) => {
  res.send("TinyLink API running...");
});

/* -------------------------------
    SERVER
-------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running: ${PORT}`);
  console.log(`API Docs → http://localhost:${PORT}/api-docs`);
});
