# kenora-workshop-registration-system
A full-stack workshop registration management system featuring role-based access control (RBAC), real-time capacity management, and registration history tracking.

## System Assumptions
- **Audit Logs Access**: Audit log viewing (`GET /api/audit-logs`) is restricted to administrators (`role:admin`) as the brief's role-permission matrix does not delegate audit history inspection to managers or staff.
- **Registration Audit Exclusion**: Attendee registrations and cancellations are not duplicated in `audit_logs` because the append-only `registrations` table already provides the complete, authoritative historical record.
