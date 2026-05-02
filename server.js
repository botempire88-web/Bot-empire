const express = require('express');
const path = require('path');
require('dotenv').config();
const Sentry = require('@sentry/node');

const stripeWebhookRouter = require('./routes/stripeWebhook');
const apiRouter = require('./routes/api');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

const app = express();

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN', // Replace with your Sentry DSN
});

app.use(Sentry.Handlers.requestHandler());
app.use(requestLogger);
app.use(stripeWebhookRouter);
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', apiRouter);
app.use(errorHandler);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
