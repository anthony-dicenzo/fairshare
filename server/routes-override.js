// This file adds an override for the balance refresh endpoint specifically for House of Anthica
// Import this after setting up all other routes

export function registerBalanceOverride(app) {
  // Add a route to handle the special case for House of Anthica
  app.post("/api/groups/2/refresh-balances", async (req, res) => {
    console.log("⚠️ Using override for House of Anthica (Group ID: 2)");
    
    try {
      // Instead of recalculating, we'll use the manually fixed values
      res.json({ message: "House of Anthica balances are maintained manually" });
    } catch (error) {
      console.error("Error in balance override:", error);
      res.status(500).json({ error: "Failed to process balance refresh" });
    }
  });
}