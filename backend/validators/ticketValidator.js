export function validateTicket(ticketData, isUpdate = false) {
  const errors = [];
  const categories = ['Billing', 'Technical', 'Account', 'Other'];
  const urgencies = ['Low', 'Medium', 'High'];
  const statuses = ['requires_attention', 'under_investigation', 'pending_customer', 'resolved'];

  if (!isUpdate) {
    if (!ticketData.title || typeof ticketData.title !== 'string' || ticketData.title.trim().length < 5 || ticketData.title.trim().length > 100) {
      errors.push('Title must be between 5 and 100 characters.');
    }
    if (!ticketData.description || typeof ticketData.description !== 'string' || ticketData.description.trim().length < 15 || ticketData.description.trim().length > 1000) {
      errors.push('Description must be between 15 and 1000 characters.');
    }
    if (!categories.includes(ticketData.category)) {
      errors.push('Category must be one of: ' + categories.join(', '));
    }
    if (!urgencies.includes(ticketData.urgency)) {
      errors.push('Urgency must be one of: ' + urgencies.join(', '));
    }
  } else {
    if (ticketData.title !== undefined && (typeof ticketData.title !== 'string' || ticketData.title.trim().length < 5 || ticketData.title.trim().length > 100)) {
      errors.push('Title must be between 5 and 100 characters.');
    }
    if (ticketData.description !== undefined && (typeof ticketData.description !== 'string' || ticketData.description.trim().length < 15 || ticketData.description.trim().length > 1000)) {
      errors.push('Description must be between 15 and 1000 characters.');
    }
    if (ticketData.category !== undefined && !categories.includes(ticketData.category)) {
      errors.push('Category must be one of: ' + categories.join(', '));
    }
    if (ticketData.urgency !== undefined && !urgencies.includes(ticketData.urgency)) {
      errors.push('Urgency must be one of: ' + urgencies.join(', '));
    }
    if (ticketData.status !== undefined && !statuses.includes(ticketData.status)) {
      errors.push('Status must be one of: ' + statuses.join(', '));
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
