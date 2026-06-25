/**
 * EduTrack — Data Layer
 * Handles all localStorage CRUD operations for students, staff, and attendance
 */

const DB = {
  // ── Keys ────────────────────────────────────────────
  KEYS: {
    USERS:      'edutrack_users',
    ATTENDANCE: 'edutrack_attendance',
    SESSION:    'edutrack_session',
  },

  // ── Read raw store ───────────────────────────────────
  _get(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  },
  _set(key, data) { localStorage.setItem(key, JSON.stringify(data)); },

  // ── Generate ID ──────────────────────────────────────
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },

  // ═══════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════
  getUsers()    { return this._get(this.KEYS.USERS); },
  saveUsers(u)  { this._set(this.KEYS.USERS, u); },

  getUserByUsername(username) {
    return this.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
  },

  getUserById(id) { return this.getUsers().find(u => u.id === id); },

  getStudents() { return this.getUsers().filter(u => u.type === 'student'); },
  getStaff()    { return this.getUsers().filter(u => u.type === 'staff'); },

  /**
   * Register new user
   * @returns {object} { success, error, user }
   */
  registerUser(data) {
    const users = this.getUsers();
    // Check duplicate username
    if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
      return { success: false, error: 'Username already exists.' };
    }
    // Check duplicate register number (students only)
    if (data.type === 'student' && data.regNo &&
        users.some(u => u.type === 'student' && u.regNo && u.regNo.toLowerCase() === data.regNo.toLowerCase())) {
      return { success: false, error: 'Register number already exists.' };
    }
    const user = { id: this.uid(), ...data, createdAt: new Date().toISOString() };
    users.push(user);
    this.saveUsers(users);
    return { success: true, user };
  },

  /**
   * Verify login credentials
   * @returns {object|null} user object or null
   */
  loginUser(username, password, type) {
    const user = this.getUserByUsername(username);
    if (!user) return null;
    if (user.password !== password) return null;
    if (user.type !== type) return null;
    return user;
  },

  // ═══════════════════════════════════════════════════
  // SESSION
  // ═══════════════════════════════════════════════════
  setSession(user) {
    // Store a simple token (userId + type)
    const session = { userId: user.id, type: user.type, loginAt: new Date().toISOString() };
    sessionStorage.setItem(this.KEYS.SESSION, JSON.stringify(session));
  },

  getSession() {
    try { return JSON.parse(sessionStorage.getItem(this.KEYS.SESSION) || 'null'); }
    catch { return null; }
  },

  clearSession() { sessionStorage.removeItem(this.KEYS.SESSION); },

  getCurrentUser() {
    const session = this.getSession();
    if (!session) return null;
    return this.getUserById(session.userId) || null;
  },

  // ═══════════════════════════════════════════════════
  // ATTENDANCE
  // ═══════════════════════════════════════════════════
  getAttendance()   { return this._get(this.KEYS.ATTENDANCE); },
  saveAttendance(a) { this._set(this.KEYS.ATTENDANCE, a); },

  /**
   * Mark attendance for a student
   * @returns {object} { success, error, record }
   */
  markAttendance({ studentId, subject, date, status, markedBy }) {
    const records = this.getAttendance();
    const existing = records.find(r =>
      r.studentId === studentId && r.subject === subject && r.date === date
    );
    if (existing) {
      return { success: false, error: 'Attendance already marked for today.' };
    }
    const student = this.getUserById(studentId);
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const record = {
      id: this.uid(),
      studentId,
      studentName: student ? student.name : 'Unknown',
      regNo: student ? student.regNo : '',
      dept: student ? student.dept : '',
      year: student ? student.year : '',
      subject, date, time, status, markedBy,
      createdAt: new Date().toISOString(),
    };
    records.push(record);
    this.saveAttendance(records);
    return { success: true, record };
  },

  /**
   * Update an existing attendance record
   */
  updateAttendance(id, newStatus) {
    const records = this.getAttendance();
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return { success: false, error: 'Record not found.' };
    records[idx].status = newStatus;
    records[idx].updatedAt = new Date().toISOString();
    this.saveAttendance(records);
    return { success: true, record: records[idx] };
  },

  /**
   * Delete attendance record
   */
  deleteAttendance(id) {
    const records = this.getAttendance().filter(r => r.id !== id);
    this.saveAttendance(records);
    return { success: true };
  },

  /**
   * Get attendance for a specific student
   */
  getStudentAttendance(studentId) {
    return this.getAttendance().filter(r => r.studentId === studentId);
  },

  /**
   * Compute attendance stats for a student
   * Returns { overall, bySubject }
   */
  computeStats(studentId) {
    const records = this.getStudentAttendance(studentId);
    if (records.length === 0) return { overall: { pct: 0, present: 0, absent: 0, total: 0 }, bySubject: {} };

    const bySubject = {};
    records.forEach(r => {
      if (!bySubject[r.subject]) bySubject[r.subject] = { present: 0, absent: 0, total: 0 };
      bySubject[r.subject].total++;
      if (r.status === 'present') bySubject[r.subject].present++;
      else bySubject[r.subject].absent++;
    });
    Object.values(bySubject).forEach(s => {
      s.pct = s.total ? Math.round((s.present / s.total) * 100) : 0;
    });

    const present = records.filter(r => r.status === 'present').length;
    const absent  = records.length - present;
    const overall = {
      total: records.length, present, absent,
      pct: Math.round((present / records.length) * 100),
    };

    return { overall, bySubject };
  },

  /**
   * Get attendance by date and subject (for staff view)
   */
  getAttendanceByDateSubject(date, subject) {
    return this.getAttendance().filter(r => r.date === date && r.subject === subject);
  },

  /**
   * Check if attendance was already marked
   */
  isMarked(studentId, subject, date) {
    return this.getAttendance().some(r =>
      r.studentId === studentId && r.subject === subject && r.date === date
    );
  },

  // ═══════════════════════════════════════════════════
  // SEED DATA (demo accounts)
  // ═══════════════════════════════════════════════════
  seed() {
    if (this.getUsers().length > 0) return; // already seeded
    const demoUsers = [
      // Demo staff
      { id: 'staff001', type: 'staff', name: 'Prof. Ramesh Kumar', username: 'staff', password: 'staff123',
        staffId: 'ST001', dept: 'Computer Science', subjects: ['Data Structures', 'Algorithms', 'DBMS', 'Operating Systems', 'Computer Networks'], createdAt: new Date().toISOString() },
      { id: 'staff002', type: 'staff', name: 'Dr. Priya Menon', username: 'priya', password: 'priya123',
        staffId: 'ST002', dept: 'Electronics', subjects: ['Digital Circuits', 'Microprocessors', 'VLSI Design'], createdAt: new Date().toISOString() },
      // Demo students
      { id: 'stu001', type: 'student', name: 'Arjun Sharma', username: 'student', password: 'student123',
        regNo: 'CS21001', dept: 'Computer Science', year: '3rd Year', createdAt: new Date().toISOString() },
      { id: 'stu002', type: 'student', name: 'Priya Nair', username: 'priya_s', password: 'priya123',
        regNo: 'CS21002', dept: 'Computer Science', year: '3rd Year', createdAt: new Date().toISOString() },
      { id: 'stu003', type: 'student', name: 'Ravi Krishnan', username: 'ravi', password: 'ravi123',
        regNo: 'CS21003', dept: 'Computer Science', year: '3rd Year', createdAt: new Date().toISOString() },
      { id: 'stu004', type: 'student', name: 'Meena Pillai', username: 'meena', password: 'meena123',
        regNo: 'CS21004', dept: 'Computer Science', year: '3rd Year', createdAt: new Date().toISOString() },
      { id: 'stu005', type: 'student', name: 'Karthik Reddy', username: 'karthik', password: 'karthik123',
        regNo: 'CS21005', dept: 'Computer Science', year: '3rd Year', createdAt: new Date().toISOString() },
      { id: 'stu006', type: 'student', name: 'Anjali Gupta', username: 'anjali', password: 'anjali123',
        regNo: 'EC21001', dept: 'Electronics', year: '2nd Year', createdAt: new Date().toISOString() },
    ];
    this.saveUsers(demoUsers);

    // Seed some past attendance for demo student
    const subjects = ['Data Structures', 'Algorithms', 'DBMS', 'Operating Systems', 'Computer Networks'];
    const records = [];
    const today = new Date();
    for (let d = 30; d >= 1; d--) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      if (date.getDay() === 0 || date.getDay() === 6) continue; // skip weekends
      const dateStr = date.toISOString().split('T')[0];
      subjects.forEach(subject => {
        const studentIds = ['stu001', 'stu002', 'stu003', 'stu004', 'stu005'];
        studentIds.forEach(studentId => {
          // Vary attendance: stu001 gets ~82%, others get random
          let present;
          if (studentId === 'stu001') present = Math.random() > 0.18;
          else if (studentId === 'stu004') present = Math.random() > 0.35; // low attendance
          else present = Math.random() > 0.15;
          const student = demoUsers.find(u => u.id === studentId);
          records.push({
            id: DB.uid(), studentId,
            studentName: student.name, regNo: student.regNo, dept: student.dept, year: student.year,
            subject, date: dateStr, time: '09:00 AM', status: present ? 'present' : 'absent',
            markedBy: 'staff001', createdAt: new Date().toISOString(),
          });
        });
      });
    }
    this.saveAttendance(records);
  },
};

// Auto-seed on load
DB.seed();
