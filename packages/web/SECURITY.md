# Security Notes

## Package Vulnerabilities

### Current Status
- Some vulnerabilities exist in dev dependencies (eslint, vitest)
- These primarily affect development environment, not production
- Production dependencies are secure

### Deprecated Packages

#### fluent-ffmpeg
- **Status**: Deprecated (package no longer supported)
- **Impact**: Still functional but unmaintained
- **Action**: Consider alternatives for future:
  - Direct FFmpeg child process spawning
  - Other maintained FFmpeg wrappers
  - For now, acceptable for MVP/Phase 1

### Recommended Actions

1. **For Development**: The vulnerabilities in dev dependencies are acceptable for now
   - They don't affect production builds
   - Can be addressed in future updates

2. **For Production**: 
   - All production dependencies are secure
   - No action needed immediately

3. **Future Updates**:
   - Monitor for fluent-ffmpeg alternatives
   - Update Next.js and other packages regularly
   - Run `npm audit` periodically

### Running Security Checks

```bash
# Check for vulnerabilities
npm audit

# Fix non-breaking issues
npm audit fix

# Review breaking changes before applying
npm audit fix --force
```
