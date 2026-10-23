/* =========================================================================
 * data.js — Static reference data and sample (seed) data for the demo.
 * Sample leave requests are generated RELATIVE TO TODAY so the demo always
 * shows a realistic mix of past, current and upcoming leave.
 * ========================================================================= */
(function (global) {
  'use strict';

  /** Leave types and their yearly allowance (in working days). null = unlimited. */
  const LEAVE_TYPES = [
    { id: 'annual',   name: 'Annual Leave',   allowance: 20,   color: '#4f46e5', icon: '🏖️' },
    { id: 'sick',     name: 'Sick Leave',     allowance: 10,   color: '#e11d48', icon: '🤒' },
    { id: 'casual',   name: 'Casual Leave',   allowance: 6,    color: '#0891b2', icon: '☕' },
    { id: 'parental', name: 'Parental Leave', allowance: 30,   color: '#d97706', icon: '👶' },
    { id: 'unpaid',   name: 'Unpaid Leave',   allowance: null, color: '#64748b', icon: '📄' }
  ];

  const STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

  const MANAGER = { id: 'MGR-01', name: 'Priya Sharma', role: 'HR & Operations Manager' };

  const EMPLOYEES = [
    { id: 'EMP-101', name: 'Alex Johnson',   role: 'Senior Frontend Developer', department: 'Engineering', email: 'alex.johnson@example.com',   color: '#4f46e5' },
    { id: 'EMP-102', name: 'Maria Garcia',   role: 'UX Designer',               department: 'Design',      email: 'maria.garcia@example.com',   color: '#db2777' },
    { id: 'EMP-103', name: 'David Chen',     role: 'Backend Engineer',          department: 'Engineering', email: 'david.chen@example.com',     color: '#059669' },
    { id: 'EMP-104', name: 'Aisha Patel',    role: 'Marketing Specialist',      department: 'Marketing',   email: 'aisha.patel@example.com',    color: '#d97706' },
    { id: 'EMP-105', name: 'James Wilson',   role: 'Sales Executive',           department: 'Sales',       email: 'james.wilson@example.com',   color: '#0891b2' },
    { id: 'EMP-106', name: 'Sofia Rossi',    role: 'HR Generalist',             department: 'Human Resources', email: 'sofia.rossi@example.com', color: '#7c3aed' },
    { id: 'EMP-107', name: 'Liam O\'Brien',  role: 'QA Engineer',               department: 'Engineering', email: 'liam.obrien@example.com',    color: '#16a34a' },
    { id: 'EMP-108', name: 'Yuki Tanaka',    role: 'Product Manager',           department: 'Product',     email: 'yuki.tanaka@example.com',    color: '#ea580c' }
  ];

  /** Fixed-date public holidays (MM-DD). Excluded from working-day counts. */
  const HOLIDAYS = [
    { md: '01-01', name: "New Year's Day" },
    { md: '05-01', name: 'Labour Day' },
    { md: '12-25', name: 'Christmas Day' },
    { md: '12-26', name: 'Boxing Day' }
  ];

  /**
   * Seed request templates. Offsets are in calendar days relative to today;
   * start dates that fall on weekends are moved to the next Monday.
   * span = number of WORKING days (the end date is calculated).
   */
  const SEED_TEMPLATES = [
    // ---- Pending (awaiting manager action) ----
    { emp: 'EMP-101', type: 'annual',   start: 12,  span: 5, status: 'Pending',  applied: -2, reason: 'Family trip to the mountains.' },
    { emp: 'EMP-102', type: 'casual',   start: 4,   span: 1, status: 'Pending',  applied: -1, reason: 'Moving to a new apartment.' },
    { emp: 'EMP-104', type: 'annual',   start: 21,  span: 3, status: 'Pending',  applied: -3, reason: 'Attending a friend\'s wedding.' },
    { emp: 'EMP-105', type: 'sick',     start: 1,   span: 2, status: 'Pending',  applied: 0,  reason: 'Doctor-advised rest after minor surgery.' },
    { emp: 'EMP-108', type: 'annual',   start: 30,  span: 4, status: 'Pending',  applied: -1, reason: 'Year-end vacation with family.' },
    { emp: 'EMP-107', type: 'casual',   start: 7,   span: 1, status: 'Pending',  applied: 0,  reason: 'Personal errands — bank and visa paperwork.', halfDay: true },

    // ---- Approved (past, current and upcoming) ----
    { emp: 'EMP-101', type: 'annual',   start: -120, span: 5, status: 'Approved', applied: -140, reason: 'Summer holiday.', note: 'Enjoy your break!' },
    { emp: 'EMP-101', type: 'sick',     start: -45,  span: 2, status: 'Approved', applied: -45,  reason: 'Flu.', note: 'Get well soon.' },
    { emp: 'EMP-102', type: 'annual',   start: -60,  span: 8, status: 'Approved', applied: -90,  reason: 'Vacation in Spain.', note: 'Approved — handover done.' },
    { emp: 'EMP-103', type: 'annual',   start: -1,   span: 4, status: 'Approved', applied: -20,  reason: 'Short getaway.', note: 'Approved.' },
    { emp: 'EMP-103', type: 'casual',   start: -150, span: 1, status: 'Approved', applied: -155, reason: 'Home maintenance appointment.', note: '' },
    { emp: 'EMP-104', type: 'sick',     start: -30,  span: 3, status: 'Approved', applied: -30,  reason: 'Migraine and recovery.', note: 'Take care.' },
    { emp: 'EMP-105', type: 'annual',   start: 9,    span: 3, status: 'Approved', applied: -15,  reason: 'Long weekend trip.', note: 'Approved, please update your CRM tasks.' },
    { emp: 'EMP-106', type: 'parental', start: -10,  span: 15, status: 'Approved', applied: -50, reason: 'Paternity leave for newborn.', note: 'Congratulations!' },
    { emp: 'EMP-107', type: 'annual',   start: -80,  span: 6, status: 'Approved', applied: -100, reason: 'Family visit abroad.', note: 'Approved.' },
    { emp: 'EMP-108', type: 'casual',   start: -25,  span: 1, status: 'Approved', applied: -27,  reason: 'Child\'s school event.', note: '' },
    { emp: 'EMP-108', type: 'annual',   start: -200, span: 10, status: 'Approved', applied: -230, reason: 'Spring vacation.', note: 'Approved.' },
    { emp: 'EMP-102', type: 'unpaid',   start: -170, span: 3, status: 'Approved', applied: -185, reason: 'Extended personal travel.', note: 'Approved as unpaid leave.' },

    // ---- Rejected ----
    { emp: 'EMP-101', type: 'casual',   start: -70,  span: 2, status: 'Rejected', applied: -75,  reason: 'Personal time off.', note: 'Release week — please choose different dates.' },
    { emp: 'EMP-104', type: 'annual',   start: -5,   span: 5, status: 'Rejected', applied: -12,  reason: 'Vacation.', note: 'Campaign launch week, team coverage too low.' },
    { emp: 'EMP-105', type: 'annual',   start: -95,  span: 7, status: 'Rejected', applied: -100, reason: 'Travel.', note: 'Quarter-end sales close.' },

    // ---- Cancelled by employee ----
    { emp: 'EMP-103', type: 'annual',   start: 40,   span: 2, status: 'Cancelled', applied: -6,  reason: 'Concert trip (plans changed).' },
    { emp: 'EMP-107', type: 'sick',     start: -55,  span: 1, status: 'Cancelled', applied: -56, reason: 'Dental appointment (rescheduled).' }
  ];

  global.LeaveData = Object.freeze({ LEAVE_TYPES, STATUSES, MANAGER, EMPLOYEES, HOLIDAYS, SEED_TEMPLATES });
})(window);
