import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Deal stages enum
export const dealStages = ["onboarding", "valuation", "buyer_matching", "due_diligence", "sold"] as const;

export const matchStages = [
  "new",
  "nda_sent",
  "nda_signed",
  "cim_sent",
  "cim_viewed",
  "intro_call",
  "diligence",
  "ioi",
  "loi",
  "under_contract",
  "won",
  "lost"
] as const;

export type DealStage = typeof dealStages[number];
export type MatchStage = typeof matchStages[number];

// Activity types
export const activityTypes = ["task", "email", "meeting", "document", "system", "note"] as const;
export type ActivityType = typeof activityTypes[number];

// Document status
export const documentStatuses = ["draft", "sent", "signed"] as const;
export type DocumentStatus = typeof documentStatuses[number];

// User type
export type User = {
  id: string;
  email: string;
};

// Deals table
export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  revenue: decimal("revenue", { precision: 15, scale: 2 }).notNull(),
  sde: decimal("sde", { precision: 15, scale: 2 }),
  valuationMin: decimal("valuation_min", { precision: 15, scale: 2 }),
  valuationMax: decimal("valuation_max", { precision: 15, scale: 2 }),
  sdeMultiple: decimal("sde_multiple", { precision: 5, scale: 2 }),
  revenueMultiple: decimal("revenue_multiple", { precision: 5, scale: 2 }),
  commission: decimal("commission", { precision: 5, scale: 2 }),
  stage: text("stage").notNull().$type<DealStage>(),
  priority: text("priority").notNull().default("medium"),
  description: text("description"),
  notes: text("notes"),
  nextStepDays: integer("next_step_days"),
  touches: integer("touches").notNull().default(0),
  ageInStage: integer("age_in_stage").notNull().default(0),
  healthScore: integer("health_score").notNull().default(85),
  ownerId: varchar("owner_id").notNull(),
  owner: text("owner").notNull(), // Owner email for display
  createdAt: timestamp("created_at").defaultNow(),
});

// Contacts table (for sellers and buyers)
// Note: entityId and entityType are computed fields, not stored in the contacts table
// For buying parties: linked via party_contacts junction table
// For deals: linked via companies_contacts junction table
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email"),
  phone: text("phone"),
});

// Buying Parties table
export const buyingParties = pgTable("buying_parties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  targetAcquisitionMin: integer("target_acquisition_min"),
  targetAcquisitionMax: integer("target_acquisition_max"),
  budgetMin: decimal("budget_min", { precision: 15, scale: 2 }),
  budgetMax: decimal("budget_max", { precision: 15, scale: 2 }),
  timeline: text("timeline"),
  status: text("status").notNull().default("evaluating"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Deal-Buyer matches (many-to-many)
export const dealBuyerMatches = pgTable("deal_buyer_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull(),
  buyingPartyId: varchar("buying_party_id").notNull(),
  targetAcquisition: integer("target_acquisition"),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  status: text("status").notNull().default("interested"),
  stage: text("stage", { enum: matchStages }).default("new"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activities/Timeline
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id"),
  buyingPartyId: varchar("buying_party_id"),
  type: text("type").notNull().$type<ActivityType>(),
  title: text("title").notNull(), 
  description: text("description"),
  status: text("status").notNull().default("pending"),
  assignedTo: text("assigned_to"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id"),
  buyingPartyId: varchar("buying_party_id"),
  name: text("name").notNull(),
  status: text("status").notNull().$type<DocumentStatus>().default("draft"),
  url: text("url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertDealSchema = createInsertSchema(deals).omit({ id: true, createdAt: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export const insertBuyingPartySchema = createInsertSchema(buyingParties).omit({ id: true, createdAt: true });
export const insertDealBuyerMatchSchema = createInsertSchema(dealBuyerMatches).omit({ id: true, createdAt: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });

// Types
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertBuyingParty = z.infer<typeof insertBuyingPartySchema>;
export type BuyingParty = typeof buyingParties.$inferSelect;
export type InsertDealBuyerMatch = z.infer<typeof insertDealBuyerMatchSchema>;
export type DealBuyerMatch = typeof dealBuyerMatches.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
