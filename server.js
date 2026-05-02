const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();

// ============ MIDDLEWARE ============
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin === 'http://localhost:3000') return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ============ MONGODB ============
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hirehub')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB error:', err));

// ============ SCHEMAS ============

// User Schema (both recruiter and job seeker)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['seeker', 'recruiter'], required: true },
  // For seekers
  skills: [String],
  bio: String,
  resumeUrl: String,
  // For recruiters
  company: String,
  companyLogo: String,
  companyWebsite: String,
  createdAt: { type: Date, default: Date.now }
});

// Job Schema
const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, enum: ['Full-time', 'Part-time', 'Internship', 'Remote', 'Contract'], required: true },
  salary: String,
  description: { type: String, required: true },
  requirements: [String],
  skills: [String],
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

// Application Schema
const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coverLetter: String,
  resumeUrl: String,
  status: { type: String, enum: ['pending', 'reviewing', 'shortlisted', 'rejected', 'hired'], default: 'pending' },
  appliedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Job = mongoose.model('Job', jobSchema);
const Application = mongoose.model('Application', applicationSchema);

// ============ AUTH HELPERS ============
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'hirehub-secret', {
    expiresIn: '30d'
  });
};

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hirehub-secret');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role middleware
const requireRole = (role) => async (req, res, next) => {
  const user = await User.findById(req.userId);
  if (!user || user.role !== role) {
    return res.status(403).json({ error: `Access denied. ${role} only.` });
  }
  req.user = user;
  next();
};

// ============ AUTH ROUTES ============

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role, company } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (role === 'recruiter' && !company) {
      return res.status(400).json({ error: 'Company name is required for recruiters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role, company });
    await user.save();

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user._id);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, company: user.company }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ JOB ROUTES ============

// Get all jobs (public)
app.get('/api/jobs', async (req, res) => {
  try {
    const { search, type, location, page = 1 } = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;

    let query = { isActive: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    if (type) query.type = type;
    if (location) query.location = { $regex: location, $options: 'i' };

    const jobs = await Job.find(query)
      .populate('recruiter', 'name company companyLogo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Job.countDocuments(query);

    res.json({ jobs, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single job
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('recruiter', 'name company companyLogo companyWebsite');
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post a job (recruiter only)
app.post('/api/jobs', verifyToken, requireRole('recruiter'), async (req, res) => {
  try {
    const { title, location, type, salary, description, requirements, skills } = req.body;

    if (!title || !location || !type || !description) {
      return res.status(400).json({ error: 'Title, location, type and description are required' });
    }

    const job = new Job({
      title,
      company: req.user.company,
      location,
      type,
      salary,
      description,
      requirements: requirements || [],
      skills: skills || [],
      recruiter: req.userId
    });

    await job.save();
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update job (recruiter only)
app.put('/api/jobs/:id', verifyToken, requireRole('recruiter'), async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, recruiter: req.userId });
    if (!job) return res.status(404).json({ error: 'Job not found or unauthorized' });

    Object.assign(job, req.body);
    await job.save();
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete job (recruiter only)
app.delete('/api/jobs/:id', verifyToken, requireRole('recruiter'), async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, recruiter: req.userId });
    if (!job) return res.status(404).json({ error: 'Job not found or unauthorized' });
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recruiter's own jobs
app.get('/api/recruiter/jobs', verifyToken, requireRole('recruiter'), async (req, res) => {
  try {
    const jobs = await Job.find({ recruiter: req.userId }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ APPLICATION ROUTES ============

// Apply to job (seeker only)
app.post('/api/jobs/:id/apply', verifyToken, requireRole('seeker'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!job.isActive) return res.status(400).json({ error: 'Job is no longer active' });

    // Check if already applied
    const existing = await Application.findOne({ job: req.params.id, applicant: req.userId });
    if (existing) return res.status(400).json({ error: 'You have already applied to this job' });

    const { coverLetter, resumeUrl } = req.body;

    const application = new Application({
      job: req.params.id,
      applicant: req.userId,
      recruiter: job.recruiter,
      coverLetter,
      resumeUrl: resumeUrl || req.user?.resumeUrl
    });

    await application.save();

    // Add applicant to job
    job.applicants.push(req.userId);
    await job.save();

    res.status(201).json({ message: 'Application submitted successfully', application });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get seeker's applications
app.get('/api/applications/my', verifyToken, requireRole('seeker'), async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.userId })
      .populate('job', 'title company location type')
      .sort({ appliedAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get applications for a job (recruiter only)
app.get('/api/jobs/:id/applications', verifyToken, requireRole('recruiter'), async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, recruiter: req.userId });
    if (!job) return res.status(404).json({ error: 'Job not found or unauthorized' });

    const applications = await Application.find({ job: req.params.id })
      .populate('applicant', 'name email skills bio resumeUrl')
      .sort({ appliedAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update application status (recruiter only)
app.put('/api/applications/:id/status', verifyToken, requireRole('recruiter'), async (req, res) => {
  try {
    const { status } = req.body;
    const application = await Application.findOne({ _id: req.params.id, recruiter: req.userId });
    if (!application) return res.status(404).json({ error: 'Application not found' });

    application.status = status;
    await application.save();
    res.json({ message: 'Status updated', application });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PROFILE ROUTES ============

// Update profile
app.put('/api/profile', verifyToken, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password;
    delete updates.email;
    delete updates.role;

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STATS ROUTES ============

// Get platform stats (public)
app.get('/api/stats', async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments({ role: 'seeker' });
    const totalCompanies = await User.countDocuments({ role: 'recruiter' });
    const totalApplications = await Application.countDocuments();
    res.json({ totalJobs, totalUsers, totalCompanies, totalApplications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'HireHub API is running' });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`HireHub server running on port ${PORT}`);
});
