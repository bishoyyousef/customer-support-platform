const userRepository = require('../repositories/userRepository');
const ticketRepository = require('../repositories/ticketRepository');

async function getManagerSummary(req, res, next) {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Forbidden: Only managers can view manager summary analytics' });
    }

    const staffList = await userRepository.getAgentsAndManagers();
    const summary = await ticketRepository.getManagerSummary(staffList);

    return res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}

module.exports = { getManagerSummary };
