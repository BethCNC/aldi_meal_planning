import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', message: 'Aldi Meal Planner V2 API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
