// api/create-server.js
import { json } from '@vercel/node';
import fetch from 'node-fetch';

// === Konfigurasi Admin ===
const ADMIN_API_KEY = "ptla_3KPJd57IqYW3akbO91rnQxLy4a1BVcWxSPoYohWxQE1";
const ADMIN_CAP_KEY = "ptlc_mWOfRBILmMgCehlEXgT87x4WsxBZCUoxISR7TboLQcJ";
const PANEL_DOMAIN = "https://adpsianjayserver.privatserver.my.id";

// Contoh login sederhana untuk web (username/password statis)
const USERS = [
  { username: "1", password: "123" },
  { username: "reseller2", password: "pass456" }
];

export default async function handler(req, res) {
  if(req.method !== 'POST') return res.status(405).json({ success:false, message:"Method not allowed" });

  const { action, username, password, name, ram } = req.body;

  // --- LOGIN ---
  if(action === "login"){
    const user = USERS.find(u => u.username === username && u.password === password);
    if(user) return res.json({ success:true });
    return res.json({ success:false, message:"Username atau password salah" });
  }

  // --- CREATE SERVER ---
  if(action === "create"){
    if(!name || !ram) return res.json({ success:false, message:"Nama server & RAM harus diisi" });

    try{
      // Buat user baru di panel admin
      const email = `${name}@bimxyz.com`;
      const passwordUser = name + "1234";

      const userRes = await fetch(`${PANEL_DOMAIN}/api/application/users`, {
        method:"POST",
        headers:{
          Accept:"application/json",
          "Content-Type":"application/json",
          Authorization: `Bearer ${ADMIN_API_KEY}`
        },
        body: JSON.stringify({
          email,
          username: name,
          first_name: name,
          last_name: "User",
          language:"en",
          password: passwordUser
        })
      });

      const userData = await userRes.json();
      if(userData.errors) return res.json({ success:false, message: JSON.stringify(userData.errors) });

      const userId = userData.attributes.id;

      // Buat server di user baru
      const egg = 1;   // contoh egg id, sesuaikan
      const loc = 1;   // contoh location id, sesuaikan
      const spc = 'npm start';

      const serverRes = await fetch(`${PANEL_DOMAIN}/api/application/servers`, {
        method:"POST",
        headers:{
          Accept:"application/json",
          "Content-Type":"application/json",
          Authorization: `Bearer ${ADMIN_API_KEY}`
        },
        body: JSON.stringify({
          name,
          description:"",
          user: userId,
          egg: egg,
          docker_image:"ghcr.io/parkervcp/yolks:nodejs_18",
          startup: spc,
          environment:{ CMD_RUN: "npm start" },
          limits:{
            memory: parseInt(ram),
            swap:0,
            disk: parseInt(ram),
            io:500,
            cpu:30
          },
          feature_limits:{ databases:5, backups:5, allocations:1 },
          deploy:{ locations:[loc], dedicated_ip:false, port_range:[] }
        })
      });

      const serverData = await serverRes.json();
      if(serverData.errors) return res.json({ success:false, message: JSON.stringify(serverData.errors) });

      return res.json({
        success:true,
        username: name,
        email,
        password: passwordUser,
        ram: ram,
        panelUrl: PANEL_DOMAIN
      });

    }catch(err){
      return res.json({ success:false, message: err.message });
    }
  }

  return res.status(400).json({ success:false, message:"Action tidak dikenali" });
                                  }
