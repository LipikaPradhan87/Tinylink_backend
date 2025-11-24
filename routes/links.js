import express from "express";
import crypto from "crypto";
import pool from "../config/db.js";
import { isValidUrl, isValidCode } from "../utils/helpers.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Links
 *   description: URL shortener API
 */

/**
 * @swagger
 * /api/links/:
 *   get:
 *     summary: Dashboard home
 *     tags: [Links]
 *     responses:
 *       200:
 *         description: Dashboard loaded
 */
router.get("/", (req, res) => {
  res.send("TinyLink Dashboard");
});

/**
 * @swagger
 * /api/links/healthz:
 *   get:
 *     summary: Health check for Links API
 *     tags: [Links]
 *     responses:
 *       200:
 *         description: Returns health status
 */
router.get("/healthz", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

/**
 * @swagger
 * /api/links/{code}/preview:
 *   get:
 *     summary: Preview redirect target without actual redirect
 *     tags: [Links]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns target URL
 *       404:
 *         description: Code not found
 */
router.get("/:code/preview", async (req, res) => {
  const { code } = req.params;
  try {
    const result = await pool.query(
      "SELECT code, target, clicks, last_clicked FROM links WHERE LOWER(code) = LOWER($1)",
      [code]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


/**
 * @swagger
 * /api/links:
 *   post:
 *     summary: Create a new short link
 *     tags: [Links]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               target:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Link created
 *       400:
 *         description: Invalid input
 */
router.post("/", async (req, res) => {
  const { target, code } = req.body;
  if (!target || !isValidUrl(target)) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  let shortCode = code;

  if (shortCode) {
    if (!isValidCode(shortCode)) {
      return res.status(400).json({ error: "Invalid custom code format" });
    }
  } else {
    shortCode = crypto.randomBytes(3).toString("hex");
  }

  try {
    // Get current local time in IST
    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(now); // Convert to Date object for PostgreSQL

    const query = `INSERT INTO links (code, target, created_at) VALUES ($1, $2, $3) RETURNING *`;
    const result = await pool.query(query, [shortCode, target, istDate]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Custom code already exists" });
  }
});


/**
 * @swagger
 * /api/links/all:
 *   get:
 *     summary: Get all links
 *     tags: [Links]
 *     responses:
 *       200:
 *         description: List of links
 */
router.get("/all", async (req, res) => {
  const result = await pool.query("SELECT * FROM links ORDER BY created_at DESC");
  res.json(result.rows);
});

/**
 * @swagger
 * /api/links/{code}:
 *   get:
 *     summary: Get stats for a link
 *     tags: [Links]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Link details
 *       404:
 *         description: Link not found
 */
router.get("/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const result = await pool.query("SELECT * FROM links WHERE LOWER(code) = LOWER($1)", [code]);
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /api/links/{code}/click:
 *   post:
 *     summary: Redirect to the original URL
 *     tags: [Links]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to target URL
 *       404:
 *         description: Code not found
 */
// POST /api/links/:code/click
router.post("/:code/click", async (req, res) => {
  const { code } = req.params;
  try {
    const now = new Date(); // proper Date object for PostgreSQL
    const result = await pool.query(
      "UPDATE links SET clicks = clicks + 1, last_clicked = $2 WHERE LOWER(code) = LOWER($1) RETURNING *",
      [code, now]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /api/links/{code}/click:
 *   get:
 *     summary: Increment click count and get link stats
 *     tags: [Links]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Link details
 *       404:
 *         description: Link not found
 */
router.get("/:code/click", async (req, res) => {
  try {
    const { code } = req.params;
    const now = new Date(); // pass Date object
    const result = await pool.query(
      "UPDATE links SET clicks = clicks + 1, last_clicked = $2 WHERE LOWER(code) = LOWER($1) RETURNING *",
      [code, now]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


/**
 * @swagger
 * /api/links/{code}:
 *   delete:
 *     summary: Delete a link
 *     tags: [Links]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete("/:code", async (req, res) => {
  await pool.query("DELETE FROM links WHERE LOWER(code) = LOWER($1)", [req.params.code]);
  res.json({ success: true });
});

export default router;
