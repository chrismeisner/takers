const Airtable = require('airtable');

// Airtable configuration
const airtable = new Airtable({ apiKey: 'patEF71MOUuCcneoW.d376f6081b53aab6900219831e0be8dd200458fb28443db567254fcd268a6268' });
const base = airtable.base('app3n81ptFBce0myJ');

// Dummy data to insert
const dummyData = {
	"Number": "123-456-7890",  // Replace with dummy number
	"Message": "Hey fuck face"  // Replace with dummy message
};

// Function to add a record to the Inbox table
function addRecordToInbox() {
	console.log('Attempting to add a record to Airtable...');

	base('Inbox').create([
		{ "fields": dummyData }
	], function(err, records) {
		if (err) {
			console.error('Error adding record to Airtable:', err);
			return;
		}

		records.forEach(function(record) {
			console.log('Record added to Airtable:', record.getId());
		});

		console.log(`Total records added: ${records.length}`);
	});
}

// Run the function to add a record
console.log('Script started. Adding record to Airtable.');
addRecordToInbox();
