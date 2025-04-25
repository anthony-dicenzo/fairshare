import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertGroupSchema, insertExpenseSchema, insertExpenseParticipantSchema, 
  insertPaymentSchema, insertActivityLogSchema 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Group routes
  app.post("/api/groups", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const validatedData = insertGroupSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });
      
      const group = await storage.createGroup(validatedData);
      
      // Log activity
      await storage.logActivity({
        groupId: group.id,
        userId: req.user.id,
        actionType: "create_group",
        referenceId: group.id
      });
      
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create group" });
    }
  });
  
  app.get("/api/groups", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groups = await storage.getGroupsByUserId(req.user.id);
      res.json(groups);
    } catch (error) {
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
      
      res.json(group);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group" });
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
      
      // Find or create the user to invite
      let invitedUser = await storage.getUserByEmail(req.body.email);
      
      if (!invitedUser) {
        return res.status(404).json({ error: "User not found" });
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
        actionType: "add_member",
        referenceId: invitedUser.id
      });
      
      res.status(201).json(membership);
    } catch (error) {
      res.status(500).json({ error: "Failed to invite user to group" });
    }
  });
  
  // Expense routes
  app.post("/api/expenses", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const expenseData = req.body;
      const groupId = expenseData.groupId;
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      // Validate expense data
      const validatedExpense = insertExpenseSchema.parse(expenseData);
      
      // Create the expense
      const expense = await storage.createExpense(validatedExpense);
      
      // Add participants
      const participants = req.body.participants || [];
      
      for (const participant of participants) {
        await storage.addExpenseParticipant({
          expenseId: expense.id,
          userId: participant.userId,
          amountOwed: participant.amountOwed
        });
      }
      
      // Log activity
      await storage.logActivity({
        groupId,
        userId: req.user.id,
        actionType: "add_expense",
        referenceId: expense.id
      });
      
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create expense" });
    }
  });
  
  app.get("/api/groups/:id/expenses", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.id);
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      const expenses = await storage.getExpensesByGroupId(groupId);
      res.json(expenses);
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
        referenceId: payment.id
      });
      
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
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      const payments = await storage.getPaymentsByGroupId(groupId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });
  
  // Activity routes
  app.get("/api/activity", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const activities = await storage.getActivityByUserId(req.user.id, limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });
  
  app.get("/api/groups/:id/activity", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.id);
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const activities = await storage.getActivityByGroupId(groupId, limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group activity" });
    }
  });
  
  // Balance routes
  app.get("/api/balances", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const balances = await storage.getUserTotalBalance(req.user.id);
      res.json(balances);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch balances" });
    }
  });
  
  app.get("/api/groups/:id/balances", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const groupId = parseInt(req.params.id);
      
      // Check if user is a member of this group
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
      
      const balances = await storage.getGroupBalances(groupId);
      res.json(balances);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group balances" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
