const { ethers } = require("ethers");

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);

// In-memory storage for shopping carts (for simplicity)
let carts = {};

// Handle adding items to the cart
async function handle_advance(data) {
  console.log("Received advance request data " + JSON.stringify(data));
  
  const action = data.action;

  if (action === "add_item") {
    const user = data.user;
    const item = data.item;

    if (!carts[user]) {
      carts[user] = [];
    }

    carts[user].push(item);
    console.log(`Item ${item} added to user ${user}'s cart`);
    return "accept";
  }

  return "reject";
}

// Handle inspecting the cart's state
async function handle_inspect(data) {
  console.log("Received inspect request data " + JSON.stringify(data));
  
  const user = data.user;
  
  if (carts[user]) {
    return JSON.stringify({ status: "accept", cart: carts[user] });
  } else {
    return JSON.stringify({ status: "accept", cart: [] });
  }
}

var handlers = {
  advance_state: handle_advance,
  inspect_state: handle_inspect,
};

var finish = { status: "accept" };

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      var handler = handlers[rollup_req["request_type"]];
      finish["status"] = await handler(rollup_req["data"]);
    }
  }
})();
