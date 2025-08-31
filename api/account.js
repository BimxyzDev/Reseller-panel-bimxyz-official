// api/account.js
export const accounts = [
  { username: "admin", password: "admin089654" },
  { username: "rapz12", password: "rapz321" },
  { username: "tes", password: "123"}
];

export function validateLogin(username, password) {
  return accounts.some(acc => acc.username === username && acc.password === password);
}
