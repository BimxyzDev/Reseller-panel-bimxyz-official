const express = require("express");
const fetch = require("node-fetch");
const { google } = require("googleapis");

const app = express();
app.use(express.json());

// === KONFIG GOOGLE SHEET ===
const SHEET_ID = "1YZOdM-Jq9pd4FRa8akZBmJ57KbGG8ROJqllcSn99Mas";
const RANGE_DOMAIN = "B2"; // domain
const RANGE_APIKEY = "B3"; // apikey
const RANGE_USERS = "A9:B"; // username & password mulai baris 9

async function getSheetData(range) {
  const sheets = google.sheets({ version: "v4", auth: process.env.GOOGLE_API_KEY });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  });
  return res.data.values || [];
}

// === API ENDPOINT ===
app.get("/api/server", async (req, res) => {
  try {
    const [domainData, apikeyData] = await Promise.all([
      getSheetData(RANGE_DOMAIN),
      getSheetData(RANGE_APIKEY),
    ]);

    if (!domainData[0] || !apikeyData[0]) {
      return res.json({ success: false, message: "Domain atau API key tidak ditemukan" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error" });
  }
});

app.post("/api/server", async (req, res) => {
  const { action, username, password, name, ram, serverId } = req.body;

  try {
    const [domainData, apikeyData, userData] = await Promise.all([
      getSheetData(RANGE_DOMAIN),
      getSheetData(RANGE_APIKEY),
      getSheetData(RANGE_USERS),
    ]);

    const domain = domainData[0][0];
    const apiKey = apikeyData[0][0];

    if (!domain || !apiKey) {
      return res.json({ success: false, message: "Config tidak ditemukan di sheet" });
    }

    // === LOGIN ===
    if (action === "login") {
      const found = userData.find(
        (u) => u[0] === username && u[1] === password
      );
      if (found) return res.json({ success: true });
      else return res.json({ success: false, message: "Username atau password salah" });
    }

    // === CREATE SERVER ===
    if (action === "create") {
      const url = `${domain}/api/client`;
      const body = {
        name,
        ram,
        egg: 15,
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (response.ok) {
        return res.json({
          success: true,
          panel: domain,
          username: data.username || "autogen",
          email: data.email || "autogen@example.com",
          password: data.password || "autogenpass",
          ram,
          serverId: data.id || "123",
        });
      } else {
        return res.json({ success: false, message: data.errors?.[0]?.detail || "Gagal membuat server" });
      }
    }

    // === DELETE SERVER ===
    if (action === "delete") {
      const url = `${domain}/api/client/servers/${serverId}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${apiKey}` },
      });

      if (response.ok) {
        return res.json({ success: true });
      } else {
        return res.json({ success: false, message: "Gagal hapus server" });
      }
    }

    return res.json({ success: false, message: "Action tidak valid" });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error: " + err.message });
  }
});

// === JALANKAN SERVER ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
