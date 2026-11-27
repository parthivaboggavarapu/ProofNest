const toSafeUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
});

module.exports = toSafeUser;
