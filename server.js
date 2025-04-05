
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
require('dotenv').config();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  wallet: { type: Number, default: 0 },
  plans: [
    {
      amount: Number,
      dailyReturn: Number,
      daysRemaining: Number
    }
  ]
}));

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existing = await User.findOne({ username });
    if (existing) return res.json({ success: false, message: 'Username already taken' });
    const user = new User({ username, password, wallet: 0, plans: [] });
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Registration failed' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    res.json({ success: true, wallet: user.wallet });
  } else {
    res.json({ success: false, message: 'Invalid credentials' });
  }
});

app.post('/buy-plan', async (req, res) => {
  const { username, amount, dailyReturn } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.json({ success: false });

  if (user.wallet >= amount) {
    user.wallet -= amount;
    user.plans.push({ amount, dailyReturn, daysRemaining: 10 });
    await user.save();
    res.json({ success: true, wallet: user.wallet });
  } else {
    res.json({ success: false, message: 'Insufficient balance' });
  }
});

app.post('/withdraw', async (req, res) => {
  const { username, amount } = req.body;
  const user = await User.findOne({ username });
  if (!user || user.wallet < amount) return res.json({ success: false });

  user.wallet -= amount;
  await user.save();
  res.json({ success: true, wallet: user.wallet });
});

app.post('/daily-update', async (req, res) => {
  const users = await User.find();
  for (const user of users) {
    for (const plan of user.plans) {
      if (plan.daysRemaining > 0) {
        user.wallet += plan.dailyReturn;
        plan.daysRemaining -= 1;
      }
    }
    await user.save();
  }
  res.json({ success: true });
});

app.get('/admin/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

app.listen(5000, () => console.log('Server running on port 5000'));
