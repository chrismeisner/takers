const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const Airtable = require('airtable');

const app = express();
app.use(express.urlencoded({ extended: true }));

const airtableBase = new Airtable({ apiKey: 'patEF71MOUuCcneoW.d376f6081b53aab6900219831e0be8dd200458fb28443db567254fcd268a6268' }).base('app3n81ptFBce0myJ');

app.post('/receive-sms', (req, res) => {
	const incomingMsg = req.body.Body;
	const sender = req.body.From;

	// Add record to Airtable
	airtableBase('Inbox').create([
		{ "fields": { "Number": sender, "Message": incomingMsg } }
	], function(err) {
		if (err) {
			console.error('Error adding record to Airtable:', err);
			// Send an error response back to sender
			const twiml = new MessagingResponse();
			twiml.message('Failed to process your message.');
			res.writeHead(200, {'Content-Type': 'text/xml'});
			res.end(twiml.toString());
			return;
		}

		console.log(`Message from ${sender}: ${incomingMsg} added to Airtable`);
		
		// Send a success response back to sender
		const twiml = new MessagingResponse();
		twiml.message('Message received. Thank you!');
		res.writeHead(200, {'Content-Type': 'text/xml'});
		res.end(twiml.toString());
	});
});

const port = 3000;
app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
