const express = require('express');
const { addCase , getCases, getcase, updateCase, deleteCase} = require('../controllers/caseController.js');
const { authMiddleware } = require('../middleware/auth');
const ChatMessage = require("../models/chatMessage");

const router = express.Router();

router.post('/add', addCase);

router.get('/', getCases);

router.get('/:id', getcase)


router.put('/:id', updateCase)


router.delete('/:id', deleteCase)


router.get('/:caseId/messages', async (req, res) => {
  const { caseId } = req.params;
  try {
    console.log('Fetching messages for case:', caseId);
    const messages = await ChatMessage.find({ caseId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to load messages' });
  }
});




module.exports = router;
