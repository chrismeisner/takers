// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

// Initialize Express and configure body-parser
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Twilio credentials (replace with your own)
const accountSid = 'AC0d824dda4621c3814c0385424f6d2197';
const authToken = '6e131a7f711015ac69447e4bae4486b2';

// Initialize Twilio client
const client = twilio(accountSid, authToken);

// Log every request to the server
app.use((req, res, next) => {
	console.log(`Incoming request: ${req.method} ${req.url}`);
	console.log(`Request body: `, req.body);
	next();
});

// Endpoint to handle incoming SMS messages
app.post('/receive-sms', (req, res) => {
	const incomingMsg = req.body.Body;
	const sender = req.body.From;

	console.log(`New message from ${sender}: ${incomingMsg}`);

	// Add error handling for potential issues
	try {
		// Respond to the message
		const twiml = new twilio.twiml.MessagingResponse();
		twiml.message('Message received. Thank you!');

		res.writeHead(200, {'Content-Type': 'text/xml'});
		res.end(twiml.toString());
	} catch (error) {
		console.error('Error responding to message:', error);
	}
});

// Start the server
const port = 3000;
app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
