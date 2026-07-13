export interface SelectedWorkItem {
  code: string;
  evidenceStatus: string;
  handled: string;
  id: string;
  name: string;
  need: string;
  outcome: string;
  projectReference: string;
  technology: string;
}

/**
 * Development-safe Selected Work fixtures based only on documented projects.
 *
 * TODO(content): Replace every pending field and evidence frame with approved
 * case-study copy, screenshots, delivery scope, stack details, outcomes, and a
 * real destination once those source materials are available.
 */
export const SELECTED_WORK: SelectedWorkItem[] = [
  {
    id: "menely-group",
    code: "FIELD / 001",
    name: "Menely Group",
    projectReference: "menelygroup.com",
    need: "Approved problem statement pending.",
    handled: "Delivery scope confirmation pending.",
    technology: "Stack confirmation pending.",
    outcome: "Approved system outcome pending.",
    evidenceStatus: "Screenshot and case-study review pending",
  },
  {
    id: "233-digital",
    code: "FIELD / 002",
    name: "233 Digital",
    projectReference: "233digital.com",
    need: "Approved problem statement pending.",
    handled: "Delivery scope confirmation pending.",
    technology: "Stack confirmation pending.",
    outcome: "Approved system outcome pending.",
    evidenceStatus: "Screenshot and case-study review pending",
  },
  {
    id: "agents-233-digital",
    code: "FIELD / 003",
    name: "Agents by 233 Digital",
    projectReference: "agents.233digital.com",
    need: "Approved problem statement pending.",
    handled: "Delivery scope confirmation pending.",
    technology: "Stack confirmation pending.",
    outcome: "Approved system outcome pending.",
    evidenceStatus: "Screenshot and case-study review pending",
  },
];
