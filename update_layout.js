const fs = require("node:fs");
let c = fs.readFileSync("apps/admin/app/(dashboard)/orders/[id]/page.tsx", "utf8");
c = c.replace("max-w-3xl", "max-w-7xl");

const startMarker = '<div className="grid grid-cols-1 md:grid-cols-2 gap-6">';
const endMarker = "      {/* Printable Receipt (only visible on print) */}";

const parts = c.split(startMarker);
if (parts.length < 2) {
  console.log("start marker not found");
  process.exit(1);
}

const endParts = parts[1].split(endMarker);
if (endParts.length < 2) {
  console.log("end marker not found");
  process.exit(1);
}

// Use regex to extract the cards.
const customerMatch = c.match(/\{\/\* Customer Info \*\/\}[\s\S]*?<\/Card>/);
const riderMatch = c.match(/\{\/\* Rider Info \*\/\}[\s\S]*?<\/Card>/);
const orderItemsMatch = c.match(/\{\/\* Order Items \*\/\}[\s\S]*?<\/Card>/);
const paymentMatch = c.match(/\{\/\* Payment Info \*\/\}[\s\S]*?<\/Card>/);
const locationMatch = c.match(/\{\/\* Delivery Location Map \*\/\}[\s\S]*?<\/Card>/);
const actionsMatch = c.match(/\{\/\* Actions \*\/\}[\s\S]*?<\/Card>/);

if (!customerMatch || !riderMatch || !orderItemsMatch || !paymentMatch || !locationMatch || !actionsMatch) {
  console.log("Could not find all cards");
  process.exit(1);
}

const newContent = `
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column (Wider) */}
          <div className="lg:col-span-2 space-y-6">
            ${orderItemsMatch[0]}
            ${locationMatch[0]}
          </div>

          {/* Right Column (Narrower) */}
          <div className="space-y-6">
            ${customerMatch[0]}
            ${riderMatch[0]}
            ${paymentMatch[0]}
            ${actionsMatch[0]}
          </div>
        </div>
      </div>

      ${endMarker}${endParts[1]}`;

fs.writeFileSync("apps/admin/app/(dashboard)/orders/[id]/page.tsx", parts[0] + newContent);
console.log("Layout updated successfully!");
