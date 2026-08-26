const { getDb } = require('../database/connection');

class UserRepository {
  get collection() {
    return getDb().collection('users');
  }

  async findByUsername(username) {
    return await this.collection.findOne({ username });
  }

  async findById(id) {
    return await this.collection.findOne({ id });
  }

  async getAll() {
    return await this.collection.find({}).toArray();
  }

  async getAgentsAndManagers() {
    return await this.collection.find({
      role: { $in: ['agent', 'manager'] }
    }, {
      projection: { password: 0 }
    }).toArray();
  }

  async insertMany(users) {
    if (!users || users.length === 0) return;
    return await this.collection.insertMany(users);
  }

  async upsertUser(user) {
    return await this.collection.updateOne(
      { id: user.id },
      { $set: user },
      { upsert: true }
    );
  }

  async getSearchHistory(userId) {
    const user = await this.findById(userId);
    return user && user.searchHistory ? user.searchHistory : [];
  }

  async addSearchHistory(userId, query) {
    if (!query || !query.trim()) return await this.getSearchHistory(userId);
    const trimmed = query.trim();
    const current = await this.getSearchHistory(userId);
    const filtered = current.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, 5);
    await this.collection.updateOne(
      { id: userId },
      { $set: { searchHistory: updated } }
    );
    return updated;
  }

  async removeSearchHistory(userId, queryToRemove) {
    const current = await this.getSearchHistory(userId);
    const updated = current.filter(item => item !== queryToRemove);
    await this.collection.updateOne(
      { id: userId },
      { $set: { searchHistory: updated } }
    );
    return updated;
  }

  async clearSearchHistory(userId) {
    await this.collection.updateOne(
      { id: userId },
      { $set: { searchHistory: [] } }
    );
    return [];
  }
}

module.exports = new UserRepository();
