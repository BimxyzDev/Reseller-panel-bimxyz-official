export const accounts = [
  { username: "admin", password: "admin089654" },
];

export function validateLogin(username, password) {
  return accounts.some(acc => acc.username === username && acc.password === password);
}
