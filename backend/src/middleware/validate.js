export function validateIssueCard(req, res, next) {
  const { owner, balance } = req.body;
  if (!owner || typeof owner !== "string" || owner.trim() === "") {
    return res.status(400).json({ error: "owner is required and must be a non-empty string" });
  }
  if (balance === undefined || balance === null) {
    return res.status(400).json({ error: "balance is required" });
  }
  const bal = parseFloat(balance);
  if (isNaN(bal) || bal <= 0) {
    return res.status(400).json({ error: "balance must be a positive number" });
  }
  next();
}

export function validateSpend(req, res, next) {
  const { amount } = req.body;
  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: "amount is required" });
  }
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }
  next();
}

export function validatePayment(req, res, next) {
  const { amount } = req.body;
  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: "amount is required" });
  }
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }
  next();
}
