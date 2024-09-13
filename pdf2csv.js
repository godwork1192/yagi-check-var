const fs = require('fs');
const pdf = require('pdf-parse');

// Get the input PDF and output CSV paths from the command-line arguments
const inputPdfPath = process.argv[2];
const outputCsvPath = process.argv[3];

// If either the input or output file paths are not provided, show an error and exit
if (!inputPdfPath || !outputCsvPath) {
    console.error('Please provide both the input PDF file path and the output CSV file path.');
    console.error('Usage: node script.js <inputPdfPath> <outputCsvPath>');
    process.exit(1);
}

// Read the PDF file into a buffer
const dataBuffer = fs.readFileSync(inputPdfPath);

// Process the content of the PDF file
pdf(dataBuffer).then(function(data) {
    const text = data.text;
    
    // Split the PDF text into lines based on line breaks
    const lines = text.split(/\r?\n/);

    // Create a writable stream for the CSV file
    const writer = fs.createWriteStream(outputCsvPath);
    // Write the header of the CSV file
    writer.write('TNX Date,Doc No,Credit,Transactions in detail\n');

    // Regular expressions for matching specific patterns:
    // 1. Date format (dd/mm/yyyy)
    const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
    // 2. Transaction code format (<number>.<number>)
    const transactionCodePattern = /^\d+\.\d+$/;
    // 3. Amount format (a space followed by a number with thousands separators)
    const amountPattern = /^ \d{1,3}(?:\.\d{3})*$/;

    // Variables for storing information for each record
    let currentDate = '';  // Stores the transaction date
    let transactionCode = '';  // Stores the transaction code
    let amount = '';  // Stores the transaction amount
    let details = '';  // Stores the transaction details
    let recordValid = false;  // Flag to track if the record is valid

    // Function to finalize the record and write it to the CSV file
    function finalizeRecord() {
        // Write the record to CSV only if it is valid and contains all necessary information
        if (recordValid && currentDate && transactionCode && amount && details) {
            writer.write(`${currentDate},${transactionCode},${amount},"${details.trim()}"\n`);
        }
        // Reset the variables for the next record
        currentDate = '';
        transactionCode = '';
        amount = '';
        details = '';
        recordValid = false;
    }

    // Loop through each line to extract the necessary information
    lines.forEach((line) => {
        const trimmedLine = line.trim();

        // Check if the line matches the date pattern
        if (datePattern.test(trimmedLine)) {
            finalizeRecord();  // Complete the previous record and start a new one
            currentDate = trimmedLine;  // Set the new transaction date
            recordValid = true;  // Mark the record as valid initially
        } else if (!transactionCode && transactionCodePattern.test(trimmedLine)) {
            // Check if the line matches the transaction code pattern and set the transaction code
            transactionCode = trimmedLine;
        } else if (!amount && amountPattern.test(line)) {
            // Check if the line matches the amount pattern and set the amount
            const parts = line.trim().split(' ');
            if (parts.length > 0) {
                amount = parts[0].replace(/\./g, '');  // Set the first part as the transaction amount
            } else {
                recordValid = false;  // If no valid amount, mark the record as invalid
            }
        } else if (transactionCode && amount) {
            // If both the transaction code and amount have been set, treat the line as transaction details
            details += trimmedLine + ' ';
        }
    });

    // Finalize and write the last record
    finalizeRecord();

    // Close the CSV file after writing all records
    writer.end();
    console.log(`CSV file has been successfully created at: ${outputCsvPath}`);
}).catch(function(error) {
    console.error('Error while processing the PDF:', error);
});
