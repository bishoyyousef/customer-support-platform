const { getDb } = require('../database/connection').default;

class MessageRepository {
  get collection() {
    return getDb().collection('messages');
  }

  async findByTicketId(ticketId, isCustomer = false) {
    const query = { ticketId };
    if (isCustomer) {
      query.isInternal = { $ne: true };
    }
    return await this.collection.find(query).sort({ timestamp: 1 }).toArray();
  }

  async findByAttachmentId(attachmentId) {
    return await this.collection.findOne({ 'attachment.id': attachmentId });
  }

  async create(message) {
    await this.collection.insertOne(message);
    return message;
  }

  async insertMany(messages) {
    if (!messages || messages.length === 0) return;
    return await this.collection.insertMany(messages);
  }
}

module.exports = new MessageRepository();
