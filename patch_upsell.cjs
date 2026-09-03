const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// First, update analyze-passport to include gender
code = code.replace(
  '"dob": "YYYY-MM-DD"',
  '"dob": "YYYY-MM-DD",\\n  "gender": "Male or Female"'
);

// Second, update the Guests sheet headers in server.ts
code = code.replace(
  '["ID", "Timestamp", "Full Name", "Passport Number", "Nationality", "DOB", "Purpose", "Upsell", "Status", "Check-in Date", "Check-out Date", "Complex", "Unit", "Guests Count", "Photo (Base64)", "Contact Number", "Contact Email", "Booking ID", "Loyalty Status"]',
  '["ID", "Timestamp", "Full Name", "Passport Number", "Nationality", "DOB", "Gender", "Purpose", "Upsell", "Status", "Check-in Date", "Check-out Date", "Complex", "Unit", "Guests Count", "Photo (Base64)", "Contact Number", "Contact Email", "Booking ID", "Loyalty Status"]'
);

code = code.replace(
  /guest\.dob,/,
  `guest.dob,
              guest.gender || "",`
);

code = code.replace(
  /range: \`Guests!A:S\`/g,
  `range: \`Guests!A:T\``
);

// We need to fix the analyze-upsell prompt to return individual JSON map.
code = code.replace(
  /Return the upsell opportunities as a single short string, separated by commas if multiple. \(e.g. "Spa package, Early Check-in"\). Return plain text only./,
  `Return the upsell opportunities as a JSON object mapping each guest's fullName to a short string of 1-3 personalized upsell opportunities, strongly considering their gender, age, and answers. (e.g. { "John Doe": "Golf package, Premium Bar", "Jane Doe": "Spa day, High Tea" }). Return ONLY valid JSON, no markdown.`
);

code = code.replace(
  /res\.json\(\{ upsell: response\.text\?\.trim\(\) \|\| "" \}\);/,
  `const text = response.text || "";
      const cleaned = text.replace(/\\x60\\x60\\x60json/g, "").replace(/\\x60\\x60\\x60/g, "").trim();
      let result = {};
      try {
        result = JSON.parse(cleaned);
      } catch (e) {
        result = { "general": text };
      }
      res.json({ upsell: result });`
);

fs.writeFileSync('server.ts', code);
console.log("Server patched!");
