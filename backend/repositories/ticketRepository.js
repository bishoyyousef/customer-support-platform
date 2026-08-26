const { getDb } = require('../database/connection');

class TicketRepository {
  get collection() {
    return getDb().collection('tickets');
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ id: 1 }, { unique: true });
      await this.collection.createIndex({ customerId: 1, updatedAt: -1 });
      await this.collection.createIndex({ status: 1, category: 1, updatedAt: -1 });
      await this.collection.createIndex({ assignedTo: 1 });
    } catch (err) {
      console.warn('Index creation warning:', err.message);
    }
  }

  async findById(id) {
    return await this.collection.findOne({ id });
  }

  async findTickets(queryParams, user) {
    const query = {};

    // 1. RBAC Customer Scoping
    if (user.role === 'customer') {
      query.customerId = user.id;
    }

    // 2. Compute overall status counts for scoped user (before search/filter/pagination)
    const baseQuery = { ...query };
    const allScopedTickets = await this.collection.find(baseQuery).toArray();

    const activeCount = allScopedTickets.filter(t => t.status === 'requires_attention' || t.status === 'under_investigation').length;
    const pendingCount = allScopedTickets.filter(t => t.status === 'pending_customer').length;
    const resolvedCount = allScopedTickets.filter(t => t.status === 'resolved').length;

    // 3. Apply Filters
    // Queue filter
    const queue = queryParams.queue || 'all';
    if (queue === 'attention') {
      query.$or = [
        { assignedTo: null },
        { assignedTo: { $exists: false } },
        { status: 'requires_attention' }
      ];
    } else if (queue === 'mine') {
      query.assignedTo = user.id;
    }

    // Status filter
    if (queryParams.status) {
      const statuses = queryParams.status.split(',');
      query.status = { $in: statuses };
    }

    // Category filter
    if (queryParams.category && queryParams.category !== 'All') {
      query.category = queryParams.category;
    }

    // AssignedTo filter
    if (queryParams.assignedTo) {
      if (queryParams.assignedTo === 'unassigned') {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }]
        });
      } else {
        query.assignedTo = queryParams.assignedTo;
      }
    }

    // Search filter
    if (queryParams.search) {
      const q = queryParams.search.trim();
      const regex = new RegExp(q, 'i');
      const searchOr = [
        { id: regex },
        { title: regex },
        { description: regex },
        { customerName: regex }
      ];

      if (query.$or) {
        query.$and = query.$and || [];
        query.$and.push({ $or: query.$or });
        query.$and.push({ $or: searchOr });
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    // 4. Sort
    const sortField = queryParams.sort || 'updatedAt';
    const order = queryParams.order === 'asc' ? 1 : -1;
    let sortObj = {};

    if (sortField === 'urgency') {
      // In JS array sorting, High=3, Medium=2, Low=1.
      // We retrieve matching tickets and apply urgency sorting with tie-breaker
      const matchingTickets = await this.collection.find(query).toArray();
      const urgencyWeight = { High: 3, Medium: 2, Low: 1 };

      matchingTickets.sort((a, b) => {
        const wA = urgencyWeight[a.urgency] || 0;
        const wB = urgencyWeight[b.urgency] || 0;
        let diff = wA - wB;
        let resVal = order === -1 ? -diff : diff;
        if (resVal === 0) {
          resVal = new Date(b.updatedAt) - new Date(a.updatedAt);
        }
        return resVal;
      });

      const totalItems = matchingTickets.length;
      const isPaginationRequested = queryParams.page !== undefined || queryParams.limit !== undefined;
      const page = isPaginationRequested ? Math.max(1, parseInt(queryParams.page, 10) || 1) : 1;
      const limit = isPaginationRequested ? Math.max(1, Math.min(100, parseInt(queryParams.limit, 10) || 20)) : totalItems;
      const totalPages = Math.ceil(totalItems / limit) || 1;

      const startIdx = (page - 1) * limit;
      const sliced = matchingTickets.slice(startIdx, startIdx + limit).map(t => {
        const summary = { ...t };
        delete summary.messages;
        delete summary.activityTimeline;
        delete summary._id;
        return summary;
      });

      return {
        data: sliced,
        pagination: { page, limit, totalItems, totalPages, activeCount, pendingCount, resolvedCount }
      };
    }

    // Standard sorting by date or string field
    sortObj[sortField] = order;
    sortObj.updatedAt = -1; // tie-breaker

    const totalItems = await this.collection.countDocuments(query);
    const isPaginationRequested = queryParams.page !== undefined || queryParams.limit !== undefined;
    const page = isPaginationRequested ? Math.max(1, parseInt(queryParams.page, 10) || 1) : 1;
    const limit = isPaginationRequested ? Math.max(1, Math.min(100, parseInt(queryParams.limit, 10) || 20)) : totalItems;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    let cursor = this.collection.find(query).sort(sortObj);
    if (isPaginationRequested) {
      cursor = cursor.skip((page - 1) * limit).limit(limit);
    }

    const tickets = await cursor.toArray();
    const formattedTickets = tickets.map(t => {
      const summary = { ...t };
      delete summary.messages;
      delete summary.activityTimeline;
      delete summary._id;
      return summary;
    });

    return {
      data: formattedTickets,
      pagination: { page, limit, totalItems, totalPages, activeCount, pendingCount, resolvedCount }
    };
  }

  async create(ticket) {
    await this.collection.insertOne(ticket);
    const result = { ...ticket };
    delete result._id;
    return result;
  }

  async update(id, updateFields, timelineEvent = null) {
    const updateDoc = { $set: updateFields };
    if (timelineEvent) {
      updateDoc.$push = { activityTimeline: timelineEvent };
    }

    await this.collection.updateOne({ id }, updateDoc);
    return await this.findById(id);
  }

  async insertMany(tickets) {
    if (!tickets || tickets.length === 0) return;
    return await this.collection.insertMany(tickets);
  }

  async getManagerSummary(staffList = []) {
    const allTickets = await this.collection.find({}).toArray();

    const total = allTickets.length;
    const active = allTickets.filter(t => t.status === 'requires_attention' || t.status === 'under_investigation').length;
    const resolved = allTickets.filter(t => t.status === 'resolved').length;
    const pending = allTickets.filter(t => t.status === 'pending_customer').length;
    const unassigned = allTickets.filter(t => !t.assignedTo).length;
    const requiresAttention = allTickets.filter(t => t.status === 'requires_attention').length;

    const totals = {
      total,
      active,
      resolved,
      pending,
      unassigned,
      requiresAttention
    };

    const totalActiveAssigned = allTickets.filter(t => t.assignedTo && (t.status === 'requires_attention' || t.status === 'under_investigation')).length;

    const agentWorkloads = staffList.map(staff => {
      const activeCount = allTickets.filter(t => t.assignedTo === staff.id && (t.status === 'requires_attention' || t.status === 'under_investigation')).length;
      const resolvedCount = allTickets.filter(t => t.assignedTo === staff.id && t.status === 'resolved').length;
      const workloadPercent = totalActiveAssigned > 0 ? parseFloat(((activeCount / totalActiveAssigned) * 100).toFixed(2)) : 0;

      return {
        id: staff.id,
        name: staff.name,
        activeCount,
        resolvedCount,
        workloadPercent
      };
    });

    const urgencyBreakdown = {
      High: allTickets.filter(t => t.urgency === 'High').length,
      Medium: allTickets.filter(t => t.urgency === 'Medium').length,
      Low: allTickets.filter(t => t.urgency === 'Low').length
    };

    return {
      totals,
      agentWorkloads,
      urgencyBreakdown
    };
  }
}

module.exports = new TicketRepository();
