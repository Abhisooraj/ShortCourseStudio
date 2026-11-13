import {sqliteTable,text,integer,uniqueIndex} from "drizzle-orm/sqlite-core";
export const settings = sqliteTable("course_settings",{
 slug:text().primaryKey(), title:text(), blurb:text(), outcome:text(), days:text(), schedule:text().notNull().default(""), mode:text().notNull().default(""), batch:text().notNull().default("batch-1"), status:text().notNull().default("soon")
});
export const applications = sqliteTable("applications",{
 id:text().primaryKey(), tokenHash:text("token_hash").notNull(), slug:text().notNull(), batch:text().notNull(),
 name:text().notNull(), email:text().notNull(), college:text().notNull(),
 createdAt:text("created_at").notNull(), amount:integer().notNull(), orderId:text("order_id").unique(), paymentId:text("payment_id").unique(),
 reviewState:text("review_state").notNull().default("submitted"),
 paymentState:text("payment_state").notNull().default("unpaid"),
},t=>[uniqueIndex("applications_course_batch_email").on(t.slug,t.batch,t.email)]);
