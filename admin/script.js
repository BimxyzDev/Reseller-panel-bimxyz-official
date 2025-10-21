const SUPABASE_URL = "https://sashqayrkigdndzuxrqq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhc2hxYXlya2lnZG5kenV4cnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzc1NDksImV4cCI6MjA3NjYxMzU0OX0.enllEu8g07833MZSxztXcEab4FewFpLBFkZkfVwbjr8";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== DOMAIN =====
async function loadDomains() {
  const { data } = await db.from("domain").select();
  const table = document.querySelector("#domainTable tbody");
  table.innerHTML = "";
  data.forEach(row => {
    table.innerHTML += `
      <tr>
        <td>${row.id}</td>
        <td>${row.domain}</td>
        <td>${row.apikey}</td>
        <td>
          <button class="btn btn-warning btn-sm" onclick="editDomain(${row.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteDomain(${row.id})">Hapus</button>
        </td>
      </tr>`;
  });
}

async function addDomain() {
  const domain = document.getElementById("domain").value;
  const apikey = document.getElementById("apikey").value;
  await db.from("domain").insert([{ domain, apikey }]);
  loadDomains();
}

// ===== USER =====
async function loadUsers() {
  const { data } = await db.from("account").select();
  const table = document.querySelector("#userTable tbody");
  table.innerHTML = "";
  data.forEach(row => {
    table.innerHTML += `
      <tr>
        <td>${row.id}</td>
        <td>${row.username}</td>
        <td>${row.password}</td>
        <td>
          <button class="btn btn-warning btn-sm" onclick="editUser(${row.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteUser(${row.id})">Hapus</button>
        </td>
      </tr>`;
  });
}

async function addUser() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  await db.from("account").insert([{ username, password }]);
  loadUsers();
}

// ===== DELETE =====
async function deleteDomain(id) {
  await db.from("domain").delete().eq("id", id);
  loadDomains();
}

async function deleteUser(id) {
  await db.from("account").delete().eq("id", id);
  loadUsers();
}

loadDomains();
loadUsers();
