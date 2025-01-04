# TODO

## UI Improvements

### Dark Mode

- [ ] Implement dark mode support across the application
  - [ ] Add dark mode toggle in header/settings
  - [ ] Create dark theme color palette
  - [ ] Update components to support dark mode styles:
    - [ ] Track sharing controls
    - [ ] Buttons and inputs
    - [ ] Waveform displays
    - [ ] Headers and text
  - [ ] Store user's theme preference
  - [ ] Add system theme detection

## Backend Improvements

### File Processing Queue

- [ ] Implement asynchronous file processing system
  - [ ] Set up message queue (Redis/RabbitMQ)
  - [ ] Create worker service for file conversions
  - [ ] Move file conversion logic from upload handler to worker
  - [ ] Add job status tracking and progress updates
  - [ ] Implement retry mechanism for failed conversions
  - [ ] Add webhook notifications for completion/failure
  - [ ] Update frontend to handle async conversion status

### Serverless Migration

- [ ] Evaluate and implement serverless architecture
  - [ ] Research and select cloud provider (AWS/GCP/Azure)
  - [ ] Break down monolithic backend into functions:
    - [ ] File upload and processing functions
    - [ ] Authentication and user management
    - [ ] Track and component management
    - [ ] Sharing and permissions
  - [ ] Set up API Gateway/Load Balancer
  - [ ] Migrate storage to cloud services:
    - [ ] Audio files to object storage (S3/GCS)
    - [ ] Database to managed service (Aurora/Cloud SQL)
  - [ ] Implement proper cold start handling
  - [ ] Set up monitoring and logging
  - [ ] Optimize function sizes and execution times
  - [ ] Implement caching strategy
  - [ ] Create Infrastructure as Code (IaC) templates
  - [ ] Plan and execute gradual migration strategy

### Email Verification

- [ ] Implement email verification system
  - [ ] Set up email service integration (SendGrid/SES)
  - [ ] Add verification token generation and storage
  - [ ] Create email templates for:
    - [ ] Verification emails
    - [ ] Welcome emails
    - [ ] Password reset
  - [ ] Add verification status to user model
  - [ ] Implement token expiration and renewal
  - [ ] Create verification endpoints
  - [ ] Add email verification UI flow
  - [ ] Handle unverified account restrictions
  - [ ] Add resend verification option
  - [ ] Implement email bounce handling

## Feature Improvements

### Tagging System

- [ ] Implement tagging for tracks and components
  - [ ] Add tags table and relationships in database
  - [ ] Create tag management API endpoints
  - [ ] Add tag input/selection UI to track and component forms
  - [ ] Implement tag-based search and filtering
  - [ ] Add tag cloud visualization
  - [ ] Support tag categories (genre, instrument, mood, etc.)
  - [ ] Add batch tagging functionality
  - [ ] Implement tag suggestions based on audio analysis
  - [ ] Add tag-based organization in track lists

### Playlists

- [ ] Implement playlist functionality
  - [ ] Add playlists and playlist_tracks tables to database
  - [ ] Create playlist management API endpoints
  - [ ] Add playlist creation and editing UI
  - [ ] Support drag-and-drop track reordering
  - [ ] Add playlist sharing capabilities
  - [ ] Implement continuous playback mode
  - [ ] Add playlist cover art support
  - [ ] Create playlist-specific waveform visualization
  - [ ] Support both tracks and individual components in playlists
  - [ ] Add playlist search and filtering
  - [ ] Implement smart playlists based on tags/metadata

### Mod File Support

- [ ] Expand support for additional module file formats
  - [ ] Add support for XM (FastTracker) format
  - [ ] Add support for IT (Impulse Tracker) format
  - [ ] Add support for S3M (ScreamTracker) format
  - [ ] Implement proper sample extraction and conversion
  - [ ] Add format-specific metadata display
  - [ ] Support pattern visualization for mod formats
  - [ ] Handle format-specific effects and commands
  - [ ] Add mod-specific playback controls

### Direct WAV Upload

- [ ] Support uploading tracks without module files
  - [ ] Add support for full track WAV upload
  - [ ] Allow uploading multiple component WAVs
  - [ ] Implement component labeling and organization
  - [ ] Add validation for matching sample rates and formats
  - [ ] Create UI for mapping components to track sections
  - [ ] Support batch component upload
  - [ ] Add waveform preview during upload
