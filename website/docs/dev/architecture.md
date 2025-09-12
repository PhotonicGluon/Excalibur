# Architecture

Excalibur is a secure file storage and sharing platform with a client-server architecture. The system is designed with security and reliability in mind, featuring end-to-end encryption and secure file handling.

## System Components

### Server

The server component is built using Python and FastAPI and provides the backend services for the Excalibur platform.

#### Key Components:

- **API Layer** (`/api/`)
    - Handles all HTTP/HTTPS requests from clients
    - Implements RESTful endpoints for file operations, user management, and authentication
    - Manages WebSocket connections for real-time updates

- **Authentication & Authorization** (`/src/auth/`)
    - Implements secure authentication mechanisms
    - Manages user sessions and access control
    - Handles token generation and validation

- **Database Layer** (`/src/db/`)
    - Manages data persistence
    - Handles database migrations using Alembic (`/alembic/`)
    - Implements data models and relationships

- **File Storage**
    - Manages secure file storage and retrieval
    - Implements chunked file handling for large files
    - Ensures data integrity and redundancy

- **CLI Tools** (`/cli/`)
    - Provides command-line interface for administration
    - Handles server configuration and maintenance tasks

### Client

The client is a cross-platform application built with modern web technologies, packaged as a multi-platform using React, Capacitor, and Ionic.

#### Key Components:

- **Core Application** (`/src/`)
    - Main application entry point (`App.tsx`)
    - Application context management (`Contexts.tsx`)
    - Theme configuration (`/theme/`)

- **Pages** (`/src/pages/`): Main application views including:
    - File Explorer
    - Login/Signup
    - Settings

- **Components** (`/src/components/`)
    - Reusable UI components
    - File/folder views
    - Navigation elements
    - Modal dialogs and forms

- **Native Integration** (`/src/native/`)
    - Platform-specific functionality
    - File system operations
    - System integration

- **Libraries** (`/src/lib/`)
    - Core business logic
    - Network communication
    - Encryption/decryption
    - File handling utilities
