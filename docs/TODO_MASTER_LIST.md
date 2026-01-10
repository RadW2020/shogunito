# Shogunito - Master TODO List

## 📊 Current Status

**Architecture:** Image-centric production management (no video/shots)

**Completed Refactor:**
- ✅ Removed Shot entity and video processing logic
- ✅ Consolidated migrations into single initial schema
- ✅ Removed test infrastructure (simplified codebase)
- ✅ Integer user IDs (not UUID)
- ✅ Status as UUID foreign key relations
- ✅ Project permissions table for access control
- ✅ Simplified user roles (admin, director, artist, member)

---

## ✅ Core Features (Implemented)

### Security & Authentication
- ✅ JWT authentication with refresh tokens
- ✅ Role-Based Access Control (RBAC)
- ✅ Project-level permissions (owner, contributor, viewer)
- ✅ Rate limiting (global and per-endpoint)
- ✅ Input sanitization (XSS/SQL injection prevention)
- ✅ Audit logging system
- ✅ Password recovery flow

### API Features
- ✅ RESTful CRUD for all entities
- ✅ Full-text search with PostgreSQL tsvector
- ✅ Pagination with metadata
- ✅ File uploads with MinIO integration
- ✅ Image optimization service
- ✅ Notifications system
- ✅ Health checks endpoints

### Web Application
- ✅ Dark/Light mode with persistence
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Keyboard shortcuts
- ✅ Data tables with filtering and sorting
- ✅ Modal system for CRUD operations
- ✅ Real-time status updates

---

## 🎯 Pending Features (Priority Order)

### High Priority

1. **Data Export/Import** (~5 hours)
   - `GET /projects/:id/export` → Full project JSON
   - `POST /projects/import` ← Project JSON
   - CSV reports for sequences, assets, versions

2. **Bulk Operations API** (~4 hours)
   - `PATCH /versions/bulk-update`
   - `DELETE /versions/bulk-delete`
   - `POST /versions/bulk-approve`
   - Transactional (all or nothing)

### Medium Priority

3. **WebSockets (Real-time)** (~8 hours)
   - Status change notifications
   - Active users presence
   - Processing progress updates

4. **Enhanced Comments System** (~6 hours)
   - Threading support
   - @mentions with notifications
   - Markdown support
   - Edit history

5. **API Versioning** (~3 hours)
   - Base path: `/api/v1/`
   - Deprecation warnings
   - Separate Swagger docs

### Low Priority (UX Improvements)

6. **Advanced Filters** (~8 hours)
   - Multiple criteria filters
   - Save favorite filters
   - Date range filtering

7. **Metrics Dashboard** (~12 hours)
   - Active projects widget
   - Pending approvals
   - Version statistics
   - Activity feed

8. **Onboarding Tours** (~8 hours)
   - Welcome tour for new users
   - Feature highlights
   - Contextual tooltips

---

## 📈 Progress Summary

| Category | Status |
|----------|--------|
| Core API | ✅ Complete |
| Authentication | ✅ Complete |
| Web UI | ✅ Complete |
| Shot/Video Removal | ✅ Complete |
| Export/Import | ⏳ Pending |
| Real-time | ⏳ Pending |

---

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] Configure environment variables
- [ ] Set `synchronize: false` in production
- [ ] Run migrations: `npm run migration:run`
- [ ] Configure CORS for production domains
- [ ] Enable HTTPS
- [ ] Configure backup schedule

### Post-deployment
- [ ] Verify health checks: `/health`
- [ ] Review audit logs
- [ ] Performance testing

---

## 📝 Quick Reference

### Commands

```bash
# Development
npm run dev           # Watch mode (API + Web)
npm run build         # Production build

# Database
npm run migration:run     # Run pending migrations
npm run migration:revert  # Revert last migration
```

---

**Last Updated:** 2026-01-10
**Status:** ✅ Production Ready
