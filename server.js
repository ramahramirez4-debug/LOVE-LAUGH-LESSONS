const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const SHORTCODE = process.env.MPESA_SHORTCODE;
const PASSKEY = process.env.MPESA_PASSKEY;

// Homepage / test
app.get("/", (req, res) => {
  res.send("Love Laugh Lessons M-Pesa server is running.");
});

// Get M-Pesa access token
async function getAccessToken() {
  const credentials = Buffer.from(
    `${CONSUMER_KEY}:${CONSUMER_SECRET}`
  ).toString("base64");

  const response = await fetch(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${credentials}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data.access_token;
}

// Start STK Push
app.post("/stkpush", async (req, res) => {
  try {
    const { phone, amount } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({
        error: "Phone number and amount are required."
      });
    }

    const token = await getAccessToken();

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);

    const password = Buffer.from(
      `${SHORTCODE}${PASSKEY}${timestamp}`
    ).toString("base64");

    const callbackUrl =
      `${process.env.RENDER_EXTERNAL_URL}/mpesa/callback`;

    const response = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          BusinessShortCode: SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Number(amount),
          PartyA: phone,
          PartyB: SHORTCODE,
          PhoneNumber: phone,
          CallBackURL: callbackUrl,
          AccountReference: "Love Laugh Lessons",
          TransactionDesc: "Love Laugh Lessons payment"
        })
      }
    );

    const data = await response.json();

    res.status(response.ok ? 200 : 400).json(data);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "M-Pesa request failed."
    });
  }
});

// Receive M-Pesa callback
app.post("/mpesa/callback", (req, res) => {
  console.log("M-Pesa callback received:");
  console.log(JSON.stringify(req.body, null, 2));

  res.json({
    ResultCode: 0,
    ResultDesc: "Callback received successfully"
  });
});

app.listen(PORT, () => {
  console.log(`Love Laugh Lessons server running on port ${PORT}`);
});
