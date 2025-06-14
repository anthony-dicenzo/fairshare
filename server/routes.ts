import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth } from "./auth";
import { sql } from "drizzle-orm";
import { 
  insertGroupSchema, insertExpenseSchema, insertExpenseParticipantSchema, 
  insertPaymentSchema, insertActivityLogSchema, insertGroupInviteSchema, 
  insertGroupMemberSchema
} from "@shared/schema";
import { z } from "zod";
import { 
  getCachedExpenses, 
  setCachedExpenses, 
  getCachedBalances, 
  setCachedBalances,
  invalidateAllGroupData,
  invalidateExpenseCache 
} from "./cache.js";
import { scheduleBalanceUpdate } from "./queue.js";
import { updateBalancesOnExpenseCreate, updateBalancesOnExpenseDelete } from "./incremental-balance.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint (no authentication required)
  app.get("/api/health", async (req, res) => {
    try {
      const healthStatus = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: req.app.locals.dbConnected ? "connected" : "disconnected",
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        version: "1.0.0"
      };
      
      res.status(200).json(healthStatus);
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Set up authentication routes
  setupAuth(app);
  
  // Group routes
  app.post("/api/groups", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      console.log(`Creating group with data:`, JSON.stringify(req.body));
      console.log(`User ID:`, req.user.id);
      
      const validatedData = insertGroupSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });
      
      console.log(`Validated group data:`, JSON.stringify(validatedData));
      
      const group = await storage.createGroup(validatedData);
      console.log(`Created group with ID: ${group.id}`);
      
      try {
        // Log activity
        console.log(`Logging activity for new group ${group.id}`);
        await storage.logActivity({
          groupId: group.id,
          userId: req.user.id,
          actionType: "create_group"
        });
        console.log(`Activity logged successfully`);
      } catch (activityError) {
        console.error(`Error logging activity for group ${group.id}:`, activityError);
        // Continue anyway since the group was created
      }
      
      console.log(`Group creation completed successfully`);
      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating group:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      // Include more details in error response for debugging
      res.status(500).json({ 
        error: "Failed to create group", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  app.get("/api/groups", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      // Parse pagination parameters with defaults
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const aboveTheFold = req.query.aboveTheFold === 'true';
      const ultraFast = req.query.ultraFast === 'true';
      
      // Get total count for pagination
      const totalCount = await storage.getUserGroupsCount(req.user.id);
      
      // Get basic group data with pagination - this happens for both normal and above-the-fold
      const groups = await storage.getGroupsByUserId(req.user.id, limit, offset);
      
      // Optimize balance and member count fetching based on request type
      let enhancedGroups;
      
      if (aboveTheFold) {
        console.log(`Processing above-the-fold request for ${groups.length} groups`);
        
        // For above-the-fold requests, prioritize speed over completeness
        // Process in parallel with Promise.all
        const promises = groups.map(async (group) => {
          try {
            // 1. Get the cached balance from the cache table - very fast
            const userBalance = await storage.getUserCachedBalance(req.user.id, group.id);
            
            // 2. Get member count with a count(*) query - fast
            const memberCount = await storage.getGroupMemberCount(group.id);
            
            return {
              ...group,
              balance: userBalance ? parseFloat(userBalance.balanceAmount) : 0,
              memberCount
            };
          } catch (balanceError) {
            console.log(`Error getting cached balance for group ${group.id}:`, balanceError);
            return {
              ...group,
              balance: 0,
              memberCount: 0
            };
          }
        });
        
        // Wait for all promises to complete
        enhancedGroups = await Promise.all(promises);
      } else {
        console.log(`Processing full request for ${groups.length} groups`);
        
        // PERFORMANCE OPTIMIZED: Use cached balances instead of recalculating
        enhancedGroups = await Promise.all(groups.map(async (group) => {
          try {
            // Use cached balance lookup instead of full calculation
            const cachedBalance = await storage.getUserCachedBalance(req.user.id, group.id);
            const memberCount = await storage.getGroupMemberCount(group.id);
            
            return {
              id: group.id,
              name: group.name,
              icon: '💰', // Simplified for performance
              balance: cachedBalance ? parseFloat(cachedBalance.balanceAmount) : 0,
              memberCount
            };
          } catch (error) {
            console.log(`Error getting data for group ${group.id}:`, error);
            return {
              id: group.id,
              name: group.name,
              icon: '💰',
              balance: 0,
              memberCount: 0
            };
          }
        }));
      }
      
      // Always include a consistent response format
      console.log(`SERVER: Returning ${enhancedGroups.length} groups with balance data:`, 
        enhancedGroups.map(g => ({ id: g.id, name: g.name, balance: g.balance })));
      
      res.json({
        groups: enhancedGroups,
        totalCount: totalCount,
        hasMore: limit ? offset + groups.length < totalCount : false,
        page: limit ? Math.floor(offset / limit) : 0
      });
    } catch (error) {
      console.error("Error fetching groups with balances:", error);
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });
  
  app.get("/api/groups/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      // Add member count to the response
      res.json({
        ...group,
        memberCount: members.length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group" });
    }
  });
  
  // New endpoint for lightweight group summary (header + members + pre-cached balance)
  app.get("/api/groups/:id/summary", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      // CONSISTENCY FIX: Read from same transactional balance source
      const groupBalances = await storage.getGroupBalances(groupId);
      const userBalanceData = groupBalances.find(b => b.userId === req.user.id);
      const userBalance = userBalanceData ? { balanceAmount: userBalanceData.balance.toString() } : null;
      
      // Return a lightweight summary object
      res.json({
        id: group.id,
        name: group.name,
        createdAt: group.createdAt,
        createdBy: group.createdBy,
        members: members.map(member => ({
          userId: member.user.id,
          name: member.user.name
        })),
        memberCount: members.length,
        userBalance: userBalance ? parseFloat(userBalance.balanceAmount) : 0
      });
    } catch (error) {
      console.error("Error fetching group summary:", error);
      res.status(500).json({ error: "Failed to fetch group summary" });
    }
  });
  
  // Update group - For changing group name
  app.patch("/api/groups/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      
      // Check if user is the creator of this group
      if (group.createdBy !== req.user.id) {
        return res.status(403).json({ error: "Only the group creator can update group details" });
      }
      
      // Only allow updating specific fields like name for now
      const allowedUpdates: Partial<Group> = {};
      if (typeof req.body.name === 'string') {
        allowedUpdates.name = req.body.name;
      }

      if (Object.keys(allowedUpdates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const updatedGroup = await storage.updateGroup(groupId, allowedUpdates);
      
      // Log activity
      await storage.logActivity({
        groupId,
        userId: req.user.id,
        actionType: "update_group",
        metadata: JSON.stringify({ previousName: group.name, newName: allowedUpdates.name })
      });
      
      res.json(updatedGroup);
    } catch (error) {
      console.error("Error updating group:", error);
      res.status(500).json({ error: "Failed to update group" });
    }
  });
  
  // Delete group
  app.delete("/api/groups/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      
      // Check if user is the creator of this group
      if (group.createdBy !== req.user.id) {
        return res.status(403).json({ error: "Only the group creator can delete the group" });
      }
      
      // Check if any users have outstanding balances
      const members = await storage.getGroupMembers(groupId);
      
      for (const member of members) {
        const hasBalance = await storage.checkUserHasOutstandingBalances(groupId, member.userId);
        if (hasBalance) {
          return res.status(400).json({ 
            error: "Cannot delete group. There are outstanding balances between members. All debts must be settled first."
          });
        }
      }
      
      // Delete the group and all related data
      const deleted = await storage.deleteGroup(groupId);
      
      if (deleted) {
        res.json({ success: true, message: "Group has been deleted" });
      } else {
        res.status(500).json({ error: "Failed to delete group" });
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      res.status(500).json({ error: "Failed to delete group" });
    }
  });
  
  // Helper function to check if user is an admin
  const isAdmin = async (userId: number): Promise<boolean> => {
    const user = await storage.getUser(userId);
    if (!user) return false;
    
    // List of admin emails
    const adminEmails = ["adicenzo1@gmail.com"];
    return adminEmails.includes(user.email);
  };
  
  // Special admin route to force delete a group (bypass balance checks)
  app.delete("/api/admin/groups/:id/force-delete", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Check if user is an admin
      const isAdminUser = await isAdmin(userId);
      if (!isAdminUser) {
        console.log(`Unauthorized admin access attempt by user ${userId}`);
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }
      
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      
      console.log(`ADMIN ACTION: Force deleting group ${groupId} by admin user ${userId}`);
      
      // First, clear all balances for this group
      console.log(`Admin operation: Clearing all balances for group ${groupId}`);
      await storage.clearAllBalances(groupId);
      
      try {
        // Use a simpler approach with direct SQL queries
        await db.execute(sql`
          UPDATE activity_log
          SET payment_id = NULL
          WHERE payment_id IN (SELECT id FROM payments WHERE group_id = ${groupId})
        `);
        
        await db.execute(sql`
          UPDATE activity_log
          SET expense_id = NULL
          WHERE expense_id IN (SELECT id FROM expenses WHERE group_id = ${groupId})
        `);
        
        await db.execute(sql`
          DELETE FROM expense_participants
          WHERE expense_id IN (SELECT id FROM expenses WHERE group_id = ${groupId})
        `);
        
        await db.execute(sql`DELETE FROM expenses WHERE group_id = ${groupId}`);
        await db.execute(sql`DELETE FROM payments WHERE group_id = ${groupId}`);
        await db.execute(sql`DELETE FROM user_balances WHERE group_id = ${groupId}`);
        await db.execute(sql`DELETE FROM user_balances_between_users WHERE group_id = ${groupId}`);
        await db.execute(sql`DELETE FROM group_invites WHERE group_id = ${groupId}`);
        await db.execute(sql`DELETE FROM group_members WHERE group_id = ${groupId}`);
        await db.execute(sql`DELETE FROM activity_log WHERE group_id = ${groupId}`);
        await db.execute(sql`DELETE FROM groups WHERE id = ${groupId}`);
        
        console.log(`Successfully force deleted group ${groupId}`);
        res.json({ success: true, message: "Group has been force deleted" });
      } catch (dbError) {
        console.error(`Database error while deleting group ${groupId}:`, dbError);
        res.status(500).json({ error: "Failed to delete group due to database constraints" });
      }
    } catch (error) {
      console.error("Error force deleting group:", error);
      res.status(500).json({ error: "Failed to force delete group" });
    }
  });
  
  app.get("/api/groups/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.id);
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group members" });
    }
  });
  
  // Remove a user from a group
  app.delete("/api/groups/:groupId/members/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.groupId);
      const userIdToRemove = parseInt(req.params.userId);
      
      // Get the group to check if current user is the creator
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      
      // Check if current user is the group creator
      if (group.createdBy !== req.user.id) {
        return res.status(403).json({ error: "Only the group creator can remove members" });
      }
      
      // Check if the user being removed is the group creator
      if (userIdToRemove === group.createdBy) {
        return res.status(403).json({ error: "The group creator cannot be removed" });
      }
      
      // Remove the user from the group with the updated method that includes zero-balance enforcement
      // The method now handles balance checks, archiving instead of deleting, and activity logging
      const removed = await storage.removeUserFromGroup(groupId, userIdToRemove, req.user.id);
      
      if (removed) {
        // Activity logging is now handled inside the removeUserFromGroup method
        res.json({ success: true, message: "User has been removed from the group" });
      } else {
        res.status(404).json({ error: "User not found in this group" });
      }
    } catch (error) {
      console.error("Error removing user from group:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to remove user from group";
      res.status(500).json({ error: errorMessage });
    }
  });
  
  app.post("/api/groups/:id/invite", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      
      // Check if requester is a member
      const members = await storage.getGroupMembers(groupId);
      const isRequesterMember = members.some(member => member.userId === req.user.id);
      
      if (!isRequesterMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      if (req.body.email) {
        // Legacy email-based invitation (keeping for backward compatibility)
        // Find the user to invite by email
        let invitedUser = await storage.getUserByEmail(req.body.email);
        
        // If user doesn't exist, create a placeholder response
        // The frontend can handle showing a message that the user will be added when they register
        if (!invitedUser) {
          // Just return an appropriate message
          return res.status(200).json({ 
            message: "User not registered. They'll be automatically added to the group when they register with this email." 
          });
        }
        
        // Check if user is already a member
        const isAlreadyMember = members.some(member => member.userId === invitedUser!.id);
        
        if (isAlreadyMember) {
          return res.status(400).json({ error: "User is already a member of this group" });
        }
        
        // Add user to group
        const membership = await storage.addUserToGroup({
          groupId,
          userId: invitedUser.id
        });
        
        // Log activity
        await storage.logActivity({
          groupId,
          userId: req.user.id,
          actionType: "add_member"
        });
        
        res.status(201).json(membership);
      } else {
        try {
          console.log(`Handling invite request for group ${groupId}`);
          // Check for existing active invites first
          const existingInvites = await storage.getGroupInvitesByGroupId(groupId);
          console.log(`Found ${existingInvites.length} total invites for group ${groupId}`);
          
          // Filter to find active invites
          const activeInvites = existingInvites.filter(invite => {
            if (!invite.isActive) return false;
            if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return false;
            return true;
          });
          
          console.log(`Found ${activeInvites.length} active invites for group ${groupId}`);
          
          // If there's an active invite, use that
          if (activeInvites.length > 0) {
            console.log(`Returning existing invite: ${JSON.stringify(activeInvites[0])}`);
            res.status(200).json(activeInvites[0]);
            return;
          }
          
          console.log(`No active invites found, creating a new one for group ${groupId}`);
          // Otherwise create a new shareable invite link
          const invite = await storage.createGroupInvite({
            groupId,
            createdBy: req.user.id,
            isActive: true,
            // Set expiration if provided, otherwise leave it undefined
            expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined
          });
          
          console.log(`Created new invite: ${JSON.stringify(invite)}`);
          
          // Log activity
          await storage.logActivity({
            groupId,
            userId: req.user.id,
            actionType: "create_invite_link"
          });
          
          res.status(201).json(invite);
        } catch (error) {
          console.error("Error handling invite request:", error);
          res.status(500).json({ error: "Failed to process invite request" });
        }
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to invite user to group" });
    }
  });
  
  // Get all active invites for a group
  app.get("/api/groups/:id/invites", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.id);
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      const invites = await storage.getGroupInvitesByGroupId(groupId);
      
      // Filter out inactive invites and those that have expired
      const activeInvites = invites.filter(invite => {
        if (!invite.isActive) return false;
        if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return false;
        return true;
      });
      
      res.json(activeInvites);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group invites" });
    }
  });
  
  // Deactivate an invite
  app.post("/api/groups/invites/:inviteId/deactivate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const inviteId = parseInt(req.params.inviteId);
      const invite = await storage.getGroupInviteById(inviteId);
      
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(invite.groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      const success = await storage.deactivateGroupInvite(inviteId);
      if (success) {
        res.json({ message: "Invite deactivated successfully" });
      } else {
        res.status(500).json({ error: "Failed to deactivate invite" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to deactivate invite" });
    }
  });
  
  // Verify invite code without requiring authentication
  app.get("/api/invites/:inviteCode/verify", async (req, res) => {
    try {
      const inviteCode = req.params.inviteCode;
      const invite = await storage.getGroupInvite(inviteCode);
      
      if (!invite) {
        return res.status(404).json({ error: "Invalid invite code" });
      }
      
      if (!invite.isActive) {
        return res.status(400).json({ error: "This invite link is no longer active" });
      }
      
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ error: "This invite link has expired" });
      }
      
      // Get the group details to return to the client
      const group = await storage.getGroup(invite.groupId);
      
      // Get the creator details
      const creator = await storage.getUser(invite.createdBy);
      
      // Return limited information about the group and invite
      res.json({
        valid: true,
        group: {
          name: group?.name,
          memberCount: (await storage.getGroupMembers(invite.groupId)).length
        },
        invitedBy: creator ? {
          name: creator.name
        } : null
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify invite" });
    }
  });

  // Join a group via invite link
  app.post("/api/groups/join/:inviteCode", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const inviteCode = req.params.inviteCode;
      const invite = await storage.getGroupInvite(inviteCode);
      
      if (!invite) {
        return res.status(404).json({ error: "Invalid invite code" });
      }
      
      if (!invite.isActive) {
        return res.status(400).json({ error: "This invite link is no longer active" });
      }
      
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ error: "This invite link has expired" });
      }
      
      // Check if user is already a member
      const members = await storage.getGroupMembers(invite.groupId);
      const isAlreadyMember = members.some(member => member.userId === req.user.id);
      
      if (isAlreadyMember) {
        return res.status(400).json({ error: "You are already a member of this group" });
      }
      
      // Add user to group
      const membership = await storage.addUserToGroup({
        groupId: invite.groupId,
        userId: req.user.id
      });
      
      // Log activity
      await storage.logActivity({
        groupId: invite.groupId,
        userId: req.user.id,
        actionType: "join_via_invite"
      });
      
      // Get the group details to return to the client
      const group = await storage.getGroup(invite.groupId);
      
      res.status(200).json({
        message: "Successfully joined the group",
        group,
        membership
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to join group" });
    }
  });
  
  // Expense routes
  app.post("/api/expenses", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      console.log("Creating expense with data:", JSON.stringify(req.body));
      const expenseData = req.body;
      const groupId = expenseData.groupId;
      
      console.log(`Checking if user ${req.user.id} is a member of group ${groupId}`);
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        console.log(`User ${req.user.id} is not a member of group ${groupId}`);
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      // Validate expense data
      console.log("Validating expense data");
      const validatedExpense = insertExpenseSchema.parse(expenseData);
      
      // Prepare participants data
      const participants = req.body.participants || [];
      console.log(`Processing ${participants.length} participants`);
      
      const processedParticipants = participants.map(participant => ({
        userId: participant.userId,
        amountOwed: (participant.amount || participant.amountOwed || 0).toString()
      }));
      
      // Create expense with participants and update balances in single transaction
      console.log("Creating expense with transactional balance updates");
      const expense = await storage.createExpenseWithBalances(validatedExpense, processedParticipants);
      console.log(`Created expense with ID: ${expense.id} and updated balances atomically`);
      
      // Log activity (separate from transaction for logging resilience)
      try {
        await storage.logActivity({
          groupId,
          userId: req.user.id,
          actionType: "add_expense",
          expenseId: expense.id
        });
        console.log("Activity logged successfully");
      } catch (activityErr) {
        console.error("Failed to log activity, but expense was created:", activityErr);
      }
      
      // Invalidate cache for immediate UI updates
      await invalidateAllGroupData(groupId);
      
      console.log("Expense creation completed successfully");
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      // Include more details in error response for debugging
      res.status(500).json({ 
        error: "Failed to create expense", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  app.get("/api/groups/:id/expenses", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.id);
      
      // Parse pagination parameters
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      // Modified to support pagination
      const expenses = await storage.getExpensesByGroupId(groupId, limit, offset);
      
      // Always get the total count for consistent response format
      const totalCount = await storage.getExpensesCountByGroupId(groupId);
      
      // Always return a consistent response format with expenses array, totalCount, and hasMore flag
      res.json({
        expenses,
        totalCount,
        hasMore: limit ? offset + expenses.length < totalCount : false,
        page: limit ? Math.floor(offset / limit) : 0
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });
  
  app.get("/api/expenses/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const expenseId = parseInt(req.params.id);
      const expense = await storage.getExpenseById(expenseId);
      
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      
      // Check if user is a member of the expense's group
      const members = await storage.getGroupMembers(expense.groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You do not have access to this expense" });
      }
      
      // Get participants
      const participants = await storage.getExpenseParticipants(expenseId);
      
      res.json({
        ...expense,
        participants
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expense" });
    }
  });
  
  app.patch("/api/expenses/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const expenseId = parseInt(req.params.id);
      console.log(`Attempting to update expense ID: ${expenseId} with data:`, req.body);
      
      const expense = await storage.getExpenseById(expenseId);
      
      if (!expense) {
        console.log(`Expense with ID ${expenseId} not found`);
        return res.status(404).json({ error: "Expense not found" });
      }
      
      // Check if user is a member of the group
      const members = await storage.getGroupMembers(expense.groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        console.log(`User ${req.user.id} cannot edit expense ${expenseId} - not a member of group ${expense.groupId}`);
        return res.status(403).json({ error: "You do not have permission to edit this expense" });
      }
      
      // Allow any group member to edit, not just the creator
      
      // Prepare the update data - ensure proper types
      const updateData = {
        title: req.body.title,
        totalAmount: req.body.totalAmount.toString(), // Convert to string to match schema
        paidBy: parseInt(req.body.paidBy),
        date: req.body.date,
        notes: req.body.notes || ""
      };
      
      console.log(`Validated update data:`, updateData);
      
      // Update the expense
      const updatedExpense = await storage.updateExpense(expenseId, updateData);
      console.log(`Expense updated successfully:`, updatedExpense);
      
      // Handle expense participants
      if (Array.isArray(req.body.participants)) {
        // First, let's delete existing participants
        try {
          // This assumes there's a deleteExpenseParticipants method - we'll need to check this
          await storage.deleteExpenseParticipants(expenseId);
          console.log(`Deleted existing participants for expense ${expenseId}`);
        } catch (participantDeleteError) {
          console.error(`Error deleting expense participants:`, participantDeleteError);
          // Continue anyway to try adding the new participants
        }
        
        // Add new participants
        for (const participant of req.body.participants) {
          try {
            await storage.addExpenseParticipant({
              expenseId,
              userId: participant.userId,
              amountOwed: participant.amountOwed.toString() // Ensure amount is a string
            });
            console.log(`Added participant ${participant.userId} with amount ${participant.amountOwed} to expense ${expenseId}`);
          } catch (participantAddError) {
            console.error(`Error adding participant:`, participantAddError);
            // Continue with other participants
          }
        }
      }
      
      // Update cached balances
      await storage.updateAllBalancesInGroup(expense.groupId);
      
      res.json(updatedExpense);
    } catch (error) {
      console.error("Error updating expense:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update expense" });
    }
  });
  
  app.delete("/api/expenses/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const expenseId = parseInt(req.params.id);
      const expense = await storage.getExpenseById(expenseId);
      
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      
      // Check if user is a member of the group
      const members = await storage.getGroupMembers(expense.groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        console.log(`User ${req.user.id} cannot delete expense ${expenseId} - not a member of group ${expense.groupId}`);
        return res.status(403).json({ error: "You do not have permission to delete this expense" });
      }
      
      // Allow any group member to delete, not just the creator
      
      const groupId = expense.groupId;
      
      // Delete expense with transactional balance updates
      await storage.deleteExpenseWithBalances(expenseId);
      console.log("Expense deleted with transactional balance updates");
      
      // Invalidate cache for immediate UI updates
      await invalidateAllGroupData(groupId);
      
      res.status(200).json({ message: "Expense deleted successfully" });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });
  
  // Payment routes
  app.post("/api/payments", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const paymentData = req.body;
      const groupId = paymentData.groupId;
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      // Validate payment data
      const validatedPayment = insertPaymentSchema.parse(paymentData);
      
      // Create the payment
      const payment = await storage.createPayment(validatedPayment);
      
      // Log activity
      await storage.logActivity({
        groupId,
        userId: req.user.id,
        actionType: "record_payment",
        paymentId: payment.id
      });
      
      // Update cached balances
      await storage.updateAllBalancesInGroup(groupId);
      
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to record payment" });
    }
  });
  
  app.get("/api/groups/:id/payments", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.id);
      
      // Parse pagination parameters
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      // Implement lightweight pagination here in the API
      const allPayments = await storage.getPaymentsByGroupId(groupId);
      
      // Always apply pagination for consistency
      const pagedPayments = limit !== undefined 
        ? allPayments.slice(offset, offset + limit) 
        : allPayments;
      const totalCount = allPayments.length;
      
      // Return paginated result with metadata
      res.json({
        payments: pagedPayments,
        totalCount,
        hasMore: offset + pagedPayments.length < totalCount,
        page: limit !== undefined ? Math.floor(offset / limit) : 0
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });
  
  app.get("/api/payments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const paymentId = parseInt(req.params.id);
      const payment = await storage.getPaymentById(paymentId);
      
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      
      // Check if user is a member of the payment's group
      const members = await storage.getGroupMembers(payment.groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You do not have access to this payment" });
      }
      
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment" });
    }
  });
  
  app.patch("/api/payments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const paymentId = parseInt(req.params.id);
      console.log(`Attempting to update payment ID: ${paymentId} with data:`, req.body);
      
      const payment = await storage.getPaymentById(paymentId);
      
      if (!payment) {
        console.log(`Payment with ID ${paymentId} not found`);
        return res.status(404).json({ error: "Payment not found" });
      }
      
      // Check if user is involved in the payment
      if (payment.paidBy !== req.user.id && payment.paidTo !== req.user.id) {
        console.log(`User ${req.user.id} cannot edit payment ${paymentId}`);
        return res.status(403).json({ error: "You cannot edit this payment" });
      }
      
      // Prepare the update data - ensure proper types
      const updateData = {
        amount: typeof req.body.amount === 'number' ? req.body.amount.toString() : req.body.amount,
        paidBy: parseInt(req.body.paidBy),
        paidTo: parseInt(req.body.paidTo),
        date: req.body.date,
        note: req.body.note || ""
      };
      
      console.log(`Validated payment update data:`, updateData);
      
      // Update the payment
      const updatedPayment = await storage.updatePayment(paymentId, updateData);
      console.log(`Payment updated successfully:`, updatedPayment);
      
      // Update cached balances
      await storage.updateAllBalancesInGroup(payment.groupId);
      
      res.json(updatedPayment);
    } catch (error) {
      console.error("Error updating payment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update payment" });
    }
  });
  
  app.delete("/api/payments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const paymentId = parseInt(req.params.id);
      console.log(`Attempting to delete payment with id: ${paymentId}`);
      
      const payment = await storage.getPaymentById(paymentId);
      
      if (!payment) {
        console.log(`Payment with id ${paymentId} not found`);
        return res.status(404).json({ error: "Payment not found" });
      }
      
      console.log(`Payment found: ${JSON.stringify(payment)}`);
      console.log(`Current user id: ${req.user.id}, Payment paidBy: ${payment.paidBy}, paidTo: ${payment.paidTo}`);
      
      // Check if user is involved in the payment
      if (payment.paidBy !== req.user.id && payment.paidTo !== req.user.id) {
        console.log(`User ${req.user.id} is not authorized to delete payment ${paymentId}`);
        return res.status(403).json({ error: "You cannot delete this payment" });
      }
      
      const groupId = payment.groupId;
      
      // Delete the payment
      console.log(`Proceeding to delete payment ${paymentId}`);
      const result = await storage.deletePayment(paymentId);
      console.log(`Delete result: ${result}`);
      
      // Update cached balances
      await storage.updateAllBalancesInGroup(groupId);
      
      res.status(200).json({ message: "Payment deleted successfully" });
    } catch (error) {
      console.error("Error deleting payment:", error);
      res.status(500).json({ error: "Failed to delete payment" });
    }
  });
  
  // Activity routes
  app.get("/api/activity", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      console.log(`Fetching activity for user ${req.user.id}`);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const type = req.query.type as string | undefined;
      
      // Try/catch specifically around the activity fetch
      try {
        // Get all activities for the user
        const activities = await storage.getActivityByUserId(req.user.id, limit);
        
        console.log('API Activity Response:', {
          userId: req.user.id,
          activityCount: activities.length,
          sampleActivity: activities.length > 0 ? JSON.stringify(activities[0]) : null
        });
        
        // Filter activities by type if specified
        if (type === 'expenses') {
          const expenseActivities = activities.filter(a => a.actionType === 'add_expense');
          return res.json({
            activities: expenseActivities,
            totalCount: expenseActivities.length,
            hasMore: false
          });
        } else if (type === 'payments') {
          const paymentActivities = activities.filter(a => a.actionType === 'record_payment');
          return res.json({
            activities: paymentActivities,
            totalCount: paymentActivities.length,
            hasMore: false
          });
        }
        
        // Return all activities if no type specified
        res.json({
          activities: activities,
          totalCount: activities.length,
          hasMore: false
        });
      } catch (activityError) {
        console.error("Error fetching activities by user ID:", activityError);
        
        // Return an empty array instead of an error to not break the UI
        console.log("Returning empty activities array due to error");
        res.json({
          activities: [],
          totalCount: 0,
          hasMore: false,
          error: "There was an issue fetching activities, but you can still use the application"
        });
      }
    } catch (error) {
      console.error("Outer error in /api/activity:", error);
      res.status(500).json({ 
        error: "Failed to fetch activity",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.get("/api/groups/:id/activity", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.id);
      
      // Parse pagination parameters
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      // Apply offset in API layer since storage API doesn't support it
      const allActivities = await storage.getActivityByGroupId(groupId);
      
      // Apply pagination
      const paginatedActivities = limit !== undefined
        ? allActivities.slice(offset, offset + limit)
        : allActivities;
        
      const totalCount = allActivities.length;
      const hasMore = offset + paginatedActivities.length < totalCount;
      
      res.json({
        activities: paginatedActivities,
        hasMore,
        totalCount,
        page: limit !== undefined ? Math.floor(offset / limit) : 0
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group activity" });
    }
  });
  
  // Balance routes - CACHE DISABLED FOR TRANSACTIONAL TESTING
  app.get("/api/balances", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      console.log("Fetching balances from transactional balance table");
      
      // Use transactional balance data (updated by createExpenseWithBalances/deleteExpenseWithBalances)
      const balances = await storage.getUserCachedTotalBalance(req.user.id);
      res.json(balances);
    } catch (error) {
      console.error("Error fetching balances:", error);
      res.status(500).json({ error: "Failed to fetch balances" });
    }
  });
  
  app.get("/api/groups/:id/balances", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    // CRITICAL: Completely disable all caching for balance data
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    });
    
    // Remove ETag to prevent 304 responses
    res.removeHeader('ETag');
    res.removeHeader('Last-Modified');
    
    try {
      const groupId = parseInt(req.params.id);
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      // FORCE: Always read from transactional balance table, NO CACHE
      console.log(`Force fetching fresh balance data for group ${groupId}`);
      const balances = await storage.getGroupBalances(groupId);
      
      // Send raw balance data with timestamp
      res.json(balances);
    } catch (error) {
      console.error("Error fetching group balances:", error);
      res.status(500).json({ error: "Failed to fetch group balances" });
    }
  });
  
  // New endpoint to recalculate and update all cached balances
  app.post("/api/groups/:id/refresh-balances", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.id);
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      // Force recalculation of all balances
      const success = await storage.updateAllBalancesInGroup(groupId);
      
      if (success) {
        res.status(200).json({ message: "Balances refreshed successfully" });
      } else {
        res.status(500).json({ error: "Failed to refresh balances" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh balances" });
    }
  });

  const httpServer = createServer(app);
  
  // Optimize HTTP connections for sub-100ms performance
  httpServer.keepAliveTimeout = 5000; // 5 seconds
  httpServer.headersTimeout = 6000;   // 6 seconds (should be > keepAliveTimeout)
  httpServer.timeout = 10000;         // 10 seconds request timeout
  
  return httpServer;
}
