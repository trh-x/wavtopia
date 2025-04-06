#!/bin/bash

set -e  # Exit on any error

# Load environment variables
source .env

# Wait for MinIO to be ready
echo "Waiting for MinIO to be ready..."
until curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; do
    sleep 1
done

# Configure mc with root credentials
mc alias set local http://localhost:9000 "$MINIO_USER" "$MINIO_PASSWORD"

# Create regular user for application use
echo "Creating MinIO user 'wavtopia'..."
if mc admin user add local wavtopia wavtopia123; then
    echo "✅ Created MinIO user 'wavtopia'"
else
    echo "⚠️  User 'wavtopia' may already exist"
fi

# Create bucket if it doesn't exist
echo "Creating bucket '$MINIO_BUCKET'..."
if ! mc ls local/$MINIO_BUCKET > /dev/null 2>&1; then
    if mc mb local/$MINIO_BUCKET; then
        echo "✅ Created bucket '$MINIO_BUCKET'"
    else
        echo "❌ Failed to create bucket '$MINIO_BUCKET'"
        exit 1
    fi
else
    echo "⚠️  Bucket '$MINIO_BUCKET' already exists"
fi

# Assign readwrite policy to user
echo "Assigning readwrite policy to user 'wavtopia'..."
if mc admin policy attach local readwrite --user=wavtopia; then
    echo "✅ Assigned readwrite policy to user 'wavtopia'"
else
    echo "❌ Failed to assign policy to user"
    exit 1
fi

echo
echo "✅ MinIO setup completed successfully"
echo "Application should now use these credentials:"
echo "Access Key: wavtopia"
echo "Secret Key: wavtopia123" 