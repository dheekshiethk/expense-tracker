import { Router } from "express";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";

const router = Router();
const categories = ["Food", "Travel", "Shopping", "Bills", "Other", "Rent"];

function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

router.get("/", async (request, response) => {
  const { month } = request.query;
  if (month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    response.status(400).json({ error: "month must use YYYY-MM format." });
    return;
  }

  const filter = { userId: request.user._id };
  if (month) filter.date = new RegExp(`^${month}`);
  const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });
  response.json(transactions);
});

router.post("/", async (request, response) => {
  const { name, amount, type = "expense", category, date } = request.body || {};
  const parsedAmount = Number(amount);

  if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
    response.status(400).json({ error: "name is required and must be 80 characters or fewer." });
    return;
  }
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    response.status(400).json({ error: "amount must be a number greater than zero." });
    return;
  }
  if (!["expense", "income"].includes(type)) {
    response.status(400).json({ error: "type must be expense or income." });
    return;
  }
  if (type === "expense" && !categories.includes(category)) {
    response.status(400).json({ error: "A valid expense category is required." });
    return;
  }
  if (!isCalendarDate(date)) {
    response.status(400).json({ error: "date must be a valid YYYY-MM-DD date." });
    return;
  }

  const transaction = await Transaction.create({
    userId: request.user._id,
    name: name.trim(),
    amount: parsedAmount,
    type,
    category: type === "income" ? "Income" : category,
    date,
  });
  response.status(201).json(transaction);
});

router.put("/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(400).json({ error: "Invalid transaction id." });
    return;
  }

  const { name, amount, type = "expense", category, date } = request.body || {};
  const parsedAmount = Number(amount);

  if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
    response.status(400).json({ error: "name is required and must be 80 characters or fewer." });
    return;
  }
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    response.status(400).json({ error: "amount must be a number greater than zero." });
    return;
  }
  if (!["expense", "income"].includes(type)) {
    response.status(400).json({ error: "type must be expense or income." });
    return;
  }
  if (type === "expense" && !categories.includes(category)) {
    response.status(400).json({ error: "A valid expense category is required." });
    return;
  }
  if (!isCalendarDate(date)) {
    response.status(400).json({ error: "date must be a valid YYYY-MM-DD date." });
    return;
  }

  const transaction = await Transaction.findOne({ _id: request.params.id, userId: request.user._id });
  if (!transaction) {
    response.status(404).json({ error: "Transaction not found." });
    return;
  }

  transaction.name = name.trim();
  transaction.amount = parsedAmount;
  transaction.type = type;
  transaction.category = type === "income" ? "Income" : category;
  transaction.date = date;
  await transaction.save();
  response.json(transaction);
});

router.delete("/:id", async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(400).json({ error: "Invalid transaction id." });
    return;
  }

  const transaction = await Transaction.findOneAndDelete({ _id: request.params.id, userId: request.user._id });
  if (!transaction) {
    response.status(404).json({ error: "Transaction not found." });
    return;
  }
  response.status(204).end();
});

export default router;
