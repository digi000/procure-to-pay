# Procure-to-Pay System

A comprehensive Purchase Request & Approval System built with Django REST Framework and React. This system enables staff to submit purchase requests, managers to approve/reject them through a parallel approval process  workflow, and automatically generates Purchase Orders upon final approval.

## 🌟 Features

### Core Functionality
- **Multi-level Approval Workflow**: Two-level approval process (Department Head → Procurement Management)
- **Role-based Access Control**: Staff, Approver L1, Approver L2, and Finance roles
- **Automatic PO Generation**: Purchase Orders are automatically generated as PDFs after final approval
- **AI-powered Document Processing**: 
  - Proforma invoice data extraction using OpenAI
  - Receipt validation against Purchase Orders
  - Discrepancy detection for vendor, items, and amounts

### User Capabilities by Role

| Role | Capabilities |
|------|-------------|
| **Staff** | Create requests, upload proformas, edit pending requests, submit receipts |
| **Approver L1** | View purchase requests, approve/reject with comments |
| **Approver L2** | View all requests, approve/reject, triggers PO generation on final approval |
| **Finance** | View approved requests, access purchase orders |

## 🛠️ Tech Stack

### Backend
- Python 3.8+
- Django 4.2
- Django REST Framework
- PostgreSQL
- JWT Authentication (SimpleJWT)
- ReportLab (PDF generation)
- OpenAI API (document processing)
- drf-spectacular (API documentation)

### Frontend
- React 18 with Vite
- Tailwind CSS
- React Router DOM v6
- Axios
- Lucide React (icons)

## 📋 Prerequisites

- Python 3.8 or higher
- Node.js 18+ and npm
- PostgreSQL 12+
- Poetry (Python package manager)
- OpenAI API key (optional, for AI features)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/digi000/procure-to-pay.git
cd procure-to-pay
```

### 2. Backend Setup

```bash
# Install Poetry if not already installed
curl -sSL https://install.python-poetry.org | python3 -

# Install Python dependencies
poetry install

# Create environment file
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials and settings
```

**Configure `backend/.env`:**
```env
DB_NAME=procure_to_pay
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
OPENAI_API_KEY=your_openai_api_key  # Optional
```

```bash
# Create PostgreSQL database
createdb procure_to_pay

# Run migrations
poetry run python manage.py migrate

# Start backend server
poetry run python manage.py runserver
```

The backend API will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 📚 API Documentation

Once the backend is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/
- **OpenAPI Schema**: http://localhost:8000/api/schema/

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register new user |
| POST | `/api/auth/login/` | Login and get JWT tokens |
| POST | `/api/auth/logout/` | Logout (blacklist token) |
| POST | `/api/token/refresh/` | Refresh access token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me/` | Get current user profile |
| PUT/PATCH | `/api/users/me/` | Update current user profile |

### Purchase Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/requests/` | List requests (filtered by role) |
| POST | `/api/requests/` | Create new request (Staff) |
| GET | `/api/requests/{id}/` | Get request details |
| PUT | `/api/requests/{id}/` | Update request (Staff, pending only) |
| PATCH | `/api/requests/{id}/approve/` | Approve request (Approver) |
| PATCH | `/api/requests/{id}/reject/` | Reject request (Approver) |
| POST | `/api/requests/{id}/submit_receipt/` | Submit receipt (Staff) |
| GET | `/api/requests/{id}/purchase_order/` | Download PO PDF |

## 🔐 Authentication

The API uses JWT (JSON Web Token) authentication. Include the access token in requests:

```
Authorization: Bearer <your_access_token>
```

Tokens expire after 1 days (configurable). Use the refresh endpoint to get a new access token.

## 📁 Project Structure

```
procure-to-pay/
├── backend/
│   ├── __init__.py
│   ├── settings.py          # Django settings
│   ├── urls.py               # Main URL configuration
│   ├── wsgi.py
│   ├── asgi.py
│   └── apps/
│       ├── users/            # User management & auth
│       │   ├── models.py     # Custom User model
│       │   ├── api.py        # Auth & user viewsets
│       │   ├── serializers.py
│       │   └── urls.py
│       ├── purchases/        # Purchase request management
│       │   ├── models.py     # PurchaseRequest, Approval, PurchaseOrder
│       │   ├── api.py        # Request viewset with actions
│       │   ├── serializers.py
│       │   ├── services.py   # PO generation service
│       │   └── permissions.py
│       └── documents/        # Document processing
│           └── processors/
│               ├── proforma_processor.py   # AI proforma extraction
│               └── receipt_validator.py    # Receipt validation
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main app with routing
│   │   ├── main.jsx          # Entry point
│   │   ├── pages/            # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CreateRequest.jsx
│   │   │   ├── RequestDetail.jsx
│   │   │   └── EditRequest.jsx
│   │   ├── components/       # Reusable components
│   │   │   ├── Layout.jsx
│   │   │   └── RequestList.jsx
│   │   ├── contexts/         # React contexts
│   │   │   └── AuthContext.jsx
│   │   └── services/         # API services
│   │       └── api.js
│   ├── vite.config.js
│   └── package.json
├── media/                    # Uploaded files
├── manage.py
├── pyproject.toml            # Poetry dependencies
└── README.md
```

## 🔄 Workflow

```
                              ┌─────────────────────────────────────┐
                              │         PURCHASE REQUEST            │
                              │           (PENDING)                 │
                              └─────────────────┬───────────────────┘
                                                │
                              ┌─────────────────▼───────────────────┐
                              │      PARALLEL APPROVAL PROCESS      │
                              └─────────────────┬───────────────────┘
                                                │
                    ┌───────────────────────────┴───────────────────────────┐
                    │                                                       │
          ┌─────────▼─────────┐                               ┌─────────────▼─────────┐
          │   Approver L1     │                               │     Approver L2       │
          │ (Department Head) │                               │ (Procurement Manager) │
          │                   │                               │                       │
          │  ✓ Approve        │                               │  ✓ Approve            │
          │  ✗ Reject         │                               │  ✗ Reject             │
          └─────────┬─────────┘                               └───────────┬───────────┘
                    │                                                     │
                    └───────────────────────────┬───────────────────────────┘
                                                │
                              ┌─────────────────▼───────────────────┐
                              │         APPROVAL CHECK              │
                              │  Both L1 AND L2 must approve        │
                              │  Any rejection → Request REJECTED   │
                              └─────────────────┬───────────────────┘
                                                │
                    ┌───────────────────────────┴───────────────────────────┐
                    │                                                       │
          ┌─────────▼─────────┐                               ┌─────────────▼─────────┐
          │     APPROVED      │                               │      REJECTED         │
          │                   │                               │                       │
          │  ↓ Auto-generate  │                               │  (Final status)       │
          │    Purchase Order │                               │                       │
          └───────────────────┘                               └───────────────────────┘
```

**Key Points:**
- Approver L1 and L2 can review and approve/reject in **any order**
- Both approvals are required for the request to be approved
- Any single rejection immediately rejects the entire request
- Purchase Order PDF is automatically generated after the **second approval**

## 🐳 Docker Setup

### Development (Local)

```bash
# Start with Docker Compose (dev mode)
docker-compose -f docker-compose.dev.yml up --build

# Backend: http://localhost:8000
# Database: localhost:5432
```

### Production Deployment

```bash
# Clone and configure
git clone https://github.com/digi000/procure-to-pay.git
cd procure-to-pay

# Edit environment file
nano backend/.env  # Edit with your values

# Build and start all services
docker-compose up --build -d

# Run migrations
docker-compose exec web python manage.py migrate

# View logs
docker-compose logs -f
```

## 🚀 DigitalOcean Deployment

### Step 1: Create Droplet

1. Create Ubuntu 22.04 Droplet (2GB RAM minimum, $12/month)
2. Add SSH key for access
3. Note the IP address

### Step 2: Server Setup

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Create app directory
mkdir -p /opt/procure-to-pay
cd /opt/procure-to-pay
```

### Step 3: Deploy Application

```bash
# Clone repository
git clone https://github.com/digi000/procure-to-pay.git .

# Edit environment file
nano backend/.env
# - Set strong DB_PASSWORD
# - Set unique SECRET_KEY
# - Set ALLOWED_HOSTS=your-droplet-ip
# - Add OPENAI_API_KEY if using AI features

# Build and start
docker compose up --build -d

# Run migrations
docker compose exec web python manage.py migrate
```

### Step 4: Verify Deployment

- **Frontend**: http://your-droplet-ip
- **API Docs**: http://your-droplet-ip/api/docs/

### Useful Commands

```bash
# View logs
docker compose logs -f web

# Restart services
docker compose restart

# Stop all services
docker compose down

# Update application
git pull
docker compose up --build -d
docker compose exec web python manage.py migrate

# Backup database
docker compose exec db pg_dump -U postgres procure_to_pay > backup.sql

# Restore database
cat backup.sql | docker compose exec -T db psql -U postgres procure_to_pay
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_NAME` | PostgreSQL database name | - |
| `DB_USER` | Database user | - |
| `DB_PASSWORD` | Database password | - |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `OPENAI_API_KEY` | OpenAI API key for AI features | None |
| `SECRET_KEY` | Django secret key | (generated) |
| `DEBUG` | Debug mode | True |

### JWT Settings

Access tokens expire after 1 days by default. Configure in `backend/settings.py`:

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    ...
}
```

## 📝 Creating Test Users

Using Django shell:

```bash
poetry run python manage.py shell
```

```python
from apps.users.models import User

# Create Approver L1 (Department Head)
approver_l1 = User.objects.create_user(
    username='dept_head',
    password='securepassword123',
    role='approver_l1',
    first_name='Department',
    last_name='Head'
)

# Create Approver L2 (Procurement Manager)
approver_l2 = User.objects.create_user(
    username='procurement_mgr',
    password='securepassword123',
    role='approver_l2',
    first_name='Senior',
    last_name='Manager'
)

# Create Staff (must have manager)
staff = User.objects.create_user(
    username='staff_user',
    password='securepassword123',
    role='staff',
    first_name='Staff',
    last_name='User',
    manager=approver_l1
)

# Create Finance user
finance = User.objects.create_user(
    username='finance_user',
    password='securepassword123',
    role='finance',
    first_name='Finance',
    last_name='User'
)
```

## 🙏 Acknowledgments

- [Django REST Framework](https://www.django-rest-framework.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [OpenAI](https://openai.com/)
- [ReportLab](https://www.reportlab.com/)
