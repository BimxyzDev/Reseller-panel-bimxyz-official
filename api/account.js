// api/account.js
export const accounts = [
  { username: "admin", password: "admin123" },
  { username: "user1", password: "pass123" },
  { username: "reseller", password: "sell123" }
];

export function validateLogin(username, password) {
  return accounts.some(acc => acc.username === username && acc.password === password);
}
