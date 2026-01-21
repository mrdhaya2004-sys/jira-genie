// Local storage key for AI-created tickets
const AI_TICKETS_KEY = 'ai_created_tickets';

interface AICreatedTicket {
  key: string;
  createdAt: string;
}

// Get AI-created ticket keys from local storage
export const getAICreatedTickets = (): AICreatedTicket[] => {
  try {
    const stored = localStorage.getItem(AI_TICKETS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Add AI-created ticket to local storage
export const addAICreatedTicket = (ticketKey: string): void => {
  const aiTickets = getAICreatedTickets();
  const exists = aiTickets.some(t => t.key === ticketKey);
  if (!exists) {
    aiTickets.push({ key: ticketKey, createdAt: new Date().toISOString() });
    localStorage.setItem(AI_TICKETS_KEY, JSON.stringify(aiTickets));
  }
};

// Check if a ticket was created via AI
export const isAICreatedTicket = (ticketKey: string): boolean => {
  const aiTickets = getAICreatedTickets();
  return aiTickets.some(t => t.key === ticketKey);
};

// Clear old AI-created tickets (optional, for cleanup)
export const clearOldAITickets = (daysOld: number = 30): void => {
  const aiTickets = getAICreatedTickets();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const filteredTickets = aiTickets.filter(t => {
    const ticketDate = new Date(t.createdAt);
    return ticketDate > cutoffDate;
  });
  
  localStorage.setItem(AI_TICKETS_KEY, JSON.stringify(filteredTickets));
};
