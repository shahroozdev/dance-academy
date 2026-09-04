# Malhaar Dance Company — Management System

Implementation plan for rebuilding the Stackby-based dance school management workflow as a
custom web application using **Next.js 14 (App Router) + TypeScript + PostgreSQL + Prisma**.

Source requirements: [`Malhaar_Dance_Company_System_Requirements.docx`](../Malhaar_Dance_Company_System_Requirements.docx)
(31 Aug 2026). The original document specifies a Stackby (no-code) build; this plan translates
the same business rules and acceptance criteria into a code-owned, testable, custom system per
the user's request.

## Reading order

1. [01-architecture-and-tech-stack.md](./01-architecture-and-tech-stack.md) — stack choices, hosting, cost model
2. [02-database-schema.md](./02-database-schema.md) — full Prisma schema, every table/field, relationships
3. [03-routes-and-pages.md](./03-routes-and-pages.md) — every page/route, what it shows, who can access it
4. [04-business-logic-billing-discounts.md](./04-business-logic-billing-discounts.md) — the billing engine, discount math, adjustments
5. [05-notifications-whatsapp.md](./05-notifications-whatsapp.md) — parent messaging, WhatsApp Cloud API integration, costs
6. [06-financial-reporting.md](./06-financial-reporting.md) — income/expense/profit dashboard logic
7. [07-implementation-roadmap.md](./07-implementation-roadmap.md) — phased delivery plan
8. [08-testing-and-acceptance.md](./08-testing-and-acceptance.md) — acceptance test suite mapped to the requirements doc

## One-paragraph summary

The system automates: **Registration → Family/Student → Enrollment → Class Monthly Fee →
Student Monthly Bill → Discounts/Adjustments → Parent Notification → Payment → Balance/Status →
Financial Dashboard.** ~50 students at peak, one admin user (studio owner), one public-facing
registration form. Every "who has to remember to do X" in the requirements doc is solved with
either a scheduled job or a one-click bulk action — never with a spreadsheet-style manual retype.
