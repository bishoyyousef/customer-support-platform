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
}

module.exports = new UserRepository();
