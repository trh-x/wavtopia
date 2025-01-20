# Debugging Guide

This document provides tips and common solutions for debugging issues in the Wavtopia codebase.

## Server Logs

### Viewing Logs in Development

1. **Basic Server Logs**

   ```bash
   # View server logs without collapsing
   pnpm -F backend dev | cat

   # View server logs with timestamps
   pnpm -F backend dev | while read line; do echo "$(date '+%H:%M:%S') $line"; done
   ```

2. **Filtered Logs**

   ```bash
   # Filter for specific keywords
   pnpm -F backend dev | grep "error"
   pnpm -F backend dev | grep -i "track"

   # Show context around matches
   pnpm -F backend dev | grep -A 5 -B 2 "error"  # Shows 2 lines before and 5 after
   ```

3. **Save Logs to File**

   ```bash
   # Save logs to file
   pnpm -F backend dev > server.log 2>&1

   # Save logs while still showing them in terminal
   pnpm -F backend dev 2>&1 | tee server.log
   ```

4. **Real-time Log Monitoring**

   ```bash
   # Watch logs in real-time with tail
   pnpm -F backend dev > server.log 2>&1 & tail -f server.log

   # Monitor specific events
   pnpm -F backend dev | grep --line-buffered "track" > track-events.log & tail -f track-events.log
   ```

5. **Debug Specific Components**

   ```bash
   # Debug database queries
   DEBUG=prisma:* pnpm -F backend dev | cat

   # Debug express routes
   DEBUG=express:* pnpm -F backend dev | cat

   # Debug file operations
   DEBUG=minio* pnpm -F backend dev | cat
   ```

## Common Issues

### Track Upload Issues

1. **500 Internal Server Error on Upload**

   - Check the server logs for detailed error messages
   - Common causes:
     - Invalid JSON in form data (check `data` field formatting)
     - Missing required fields (title, artist, originalFormat)
     - File upload issues (file size, format)
   - Debug steps:
     ```typescript
     // Add these logs in routes/tracks.ts
     console.log("Request body:", req.body);
     console.log("Files:", req.files);
     ```

2. **File Processing Failures**
   - Check the server logs for specific stage failures:
     ```
     "Starting track upload process..."
     "Uploading original file..."
     "Converting XM to WAV..."
     "Generating waveform data..."
     "Converting to MP3..."
     ```
   - Each stage has its own error handling and logging

### Authentication Issues

1. **401 Unauthorized Errors**

   - Check if the token is being sent correctly in the Authorization header
   - Verify token format: `Bearer <token>`
   - Check token expiration
   - Debug steps:
     ```typescript
     // Add in middleware/auth.ts
     console.log("Auth header:", req.headers.authorization);
     ```

2. **Token Missing in Requests**
   - Verify `useAuthToken` hook is being used
   - Check if token is stored in localStorage
   - Ensure token is included in API requests

### File Storage Issues

1. **MinIO Connection Problems**

   - Verify MinIO server is running
   - Check connection settings in `.env`
   - Debug steps:
     ```typescript
     // Add in services/storage.ts
     console.log("MinIO config:", {
       endpoint: process.env.MINIO_ENDPOINT,
       port: process.env.MINIO_PORT,
       bucket: process.env.MINIO_BUCKET,
     });
     ```

2. **File Upload Failures**
   - Check file size limits
   - Verify bucket permissions
   - Check disk space

### Database Issues

1. **Prisma Query Errors**

   - Enable Prisma query logging:
     ```
     // Add to .env
     DEBUG="prisma:*"
     ```
   - Check database schema matches models
   - Verify foreign key constraints

2. **Connection Issues**
   - Check database URL in `.env`
   - Verify database server is running
   - Check connection pool settings

## Debugging Tools

### Backend Debugging

1. **Enable Debug Logging**

   ```bash
   # Run backend with debug logging
   DEBUG=* pnpm -F backend dev

   # Log specific modules
   DEBUG=prisma:*,express:* pnpm -F backend dev
   ```

2. **HTTP Request Logging**
   ```bash
   # Show detailed HTTP request/response logging
   NODE_DEBUG=http,net pnpm -F backend dev
   ```

### Frontend Debugging

1. **React Query DevTools**

   - Available in development mode
   - Shows query states and cache
   - Useful for debugging API calls

2. **Network Tab**
   - Check request/response data
   - Verify headers and authentication
   - Monitor file upload progress

### Database Debugging

1. **Prisma Studio**

   ```bash
   pnpm -F backend prisma studio
   ```

   - Visual database browser
   - View and edit data
   - Check relationships

2. **Database Logs**

   ```bash
   # Enable query logging via connection string
   DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=5&log_statements=all"

   # Enable Prisma query logging
   DATABASE_DEBUG=true pnpm -F backend dev

   # This will log:
   # - All SQL queries
   # - Query parameters
   # - Query execution time in milliseconds
   ```

## Testing

### Unit Tests

- Run specific test:
  ```bash
  pnpm -F backend test -t "test name"
  ```
- Debug test:
  ```bash
  NODE_OPTIONS="--inspect-brk" pnpm -F backend test -t "test name"
  ```

### Integration Tests

- Run with logging:
  ```bash
  DEBUG=* pnpm -F backend test:integration
  ```

## Environment Setup

### Required Services

1. Database (PostgreSQL)
2. MinIO (Object Storage)
3. Redis (Optional, for caching)

### Environment Variables

- Check `.env.example` for required variables
- Verify all required variables are set
- Check variable formatting and values

## Performance Monitoring

1. **Server Metrics**

   - CPU usage
   - Memory usage
   - Disk space
   - Network I/O

2. **Application Metrics**
   - Response times
   - Error rates
   - Active connections
   - Queue lengths

## Contributing

When adding new features or fixing bugs:

1. Add appropriate logging
2. Document error cases
3. Update this debugging guide
4. Add relevant tests

## MinIO Debugging

To list all files in the MinIO bucket when using Docker, use this command pattern:

```bash
docker run --rm --network wavtopia_wavtopia-net -it --entrypoint=/bin/sh minio/mc -c "mc alias set myminio http://minio:9000 USER PASS && mc ls --recursive myminio/wavtopia"
```

Note: Replace USER and PASS with your MinIO credentials.

This command:

1. Uses the MinIO client (mc) Docker image
2. Sets up a temporary alias for the MinIO server
3. Lists all files recursively in the specified bucket
4. Works within the Docker network context

### Additional MinIO Debugging Commands

1. **Check Bucket Size**

   ```bash
   docker run --rm --network wavtopia_wavtopia-net -it --entrypoint=/bin/sh minio/mc -c "mc alias set myminio http://minio:9000 USER PASS && mc du myminio/wavtopia"
   ```

2. **Verify File Existence**

   ```bash
   docker run --rm --network wavtopia_wavtopia-net -it --entrypoint=/bin/sh minio/mc -c "mc alias set myminio http://minio:9000 USER PASS && mc stat myminio/wavtopia/path/to/file"
   ```

3. **List Bucket Policies**

   ```bash
   docker run --rm --network wavtopia_wavtopia-net -it --entrypoint=/bin/sh minio/mc -c "mc alias set myminio http://minio:9000 USER PASS && mc policy get myminio/wavtopia"
   ```

4. **Monitor MinIO Events**
   ```bash
   docker run --rm --network wavtopia_wavtopia-net -it --entrypoint=/bin/sh minio/mc -c "mc alias set myminio http://minio:9000 USER PASS && mc watch myminio/wavtopia"
   ```

### Common MinIO Issues

1. **File Not Found Issues**

   - Check if the file path includes the bucket name
   - Verify the correct bucket is being accessed
   - Ensure file paths use forward slashes (/)
   - Check file permissions

2. **Connection Issues**

   - Verify MinIO service is running: `docker compose ps`
   - Check network connectivity within Docker
   - Verify correct port mapping
   - Ensure credentials are correct

3. **Performance Issues**
   - Monitor disk usage: `docker system df`
   - Check MinIO logs: `docker compose logs minio`
   - Verify network bandwidth between services
   - Consider using MinIO's built-in monitoring
