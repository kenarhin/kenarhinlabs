import { and, asc, eq, isNull } from "drizzle-orm";

import type { NodeDatabase } from "../client/node.js";
import { clients, contacts, projects } from "../schema/crm.js";

/** Loads an active client and its contacts/projects for CRM detail views. */
export async function getClientWorkspace(db: NodeDatabase, clientId: string) {
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
    .limit(1);

  if (!client) return null;

  const [clientContacts, clientProjects] = await Promise.all([
    db.select().from(contacts).where(eq(contacts.clientId, clientId)).orderBy(asc(contacts.name)),
    db.select().from(projects).where(eq(projects.clientId, clientId)).orderBy(asc(projects.name)),
  ]);

  return { client, contacts: clientContacts, projects: clientProjects };
}
