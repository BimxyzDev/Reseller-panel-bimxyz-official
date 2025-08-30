// api/list-servers.js
export default async function handler(req, res) {
  // =========================
  const PANEL_URL = "https://panel.example.com"; // ganti
  const API_KEY   = "API_KEY_ADMIN";            // ganti
  // =========================

  try {
    const serverRes = await fetch(`${PANEL_URL}/api/application/servers`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Accept": "application/json"
      }
    });

    const serverData = await serverRes.json();
    if (!serverRes.ok) {
      return res.json({ success: false, message: JSON.stringify(serverData) });
    }

    return res.json({
      success: true,
      count: serverData.meta.pagination.total
    });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
}
