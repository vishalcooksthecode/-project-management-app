# TaskFlow – Project Management App

A full-stack project management web app with role-based access control (Admin/Member), built with Node.js, Express, PostgreSQL, and vanilla JavaScript.

## Live Demo
> **[https://your-app.railway.app](https://your-app.railway.app)**

---

## Features

- **Authentication** – JWT-based signup/login with role selection (Admin/Member)
- **Projects** – Create, view, update, delete projects (Admin only creates/deletes)
- **Team Management** – Add/remove members per project with roles
- **Tasks** – Create, assign, track tasks with status (Todo/In Progress/Done) and priority
- **Dashboard** – Stats: total projects, tasks, overdue count, status breakdown
- **Role-Based Access**:
  - `Admin` – Full access: create projects, manage all members, all tasks
  - `Member` – View assigned projects, update own task status

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Backend    | Node.js, Express.js               |
| Database   | PostgreSQL + Sequelize ORM        |
| Auth       | JWT + bcryptjs                    |
| Frontend   | Vanilla HTML/CSS/JavaScript (SPA) |
| Deployment | Railway                           |

---

## API Endpoints

### Auth
| Method | Endpoint         | Description        |
|--------|------------------|--------------------|
| POST   | /api/auth/signup | Register new user  |
| POST   | /api/auth/login  | Login & get token  |

### Projects
| Method | Endpoint                        | Access        |
|--------|---------------------------------|---------------|
| GET    | /api/projects                   | All users     |
| POST   | /api/projects                   | Admin only    |
| GET    | /api/projects/:id               | Members       |
| PUT    | /api/projects/:id               | Project Admin |
| DELETE | /api/projects/:id               | Admin only    |
| POST   | /api/projects/:id/members       | Project Admin |
| DELETE | /api/projects/:id/members/:uid  | Project Admin |

### Tasks
| Method | Endpoint                      | Access              |
|--------|-------------------------------|---------------------|
| GET    | /api/tasks/project/:projectId | Project members     |
| GET    | /api/tasks/my                 | Current user        |
| POST   | /api/tasks                    | Project Admin       |
| PUT    | /api/tasks/:id                | Admin or assignee   |
| DELETE | /api/tasks/:id                | Project Admin       |

### Dashboard
| Method | Endpoint            | Description       |
|--------|---------------------|-------------------|
| GET    | /api/dashboard/stats | Aggregated stats |

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/your-username/project-management-app.git
cd project-management-app

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 4. Start the server
npm start
```

Open `http://localhost:3000`

---

## Deploy to Railway

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Add a **PostgreSQL** plugin to your project
4. Set environment variables:
   ```
   DATABASE_URL  = (auto-set by Railway PostgreSQL plugin)
   JWT_SECRET    = your_random_secret_string
   NODE_ENV      = production
   ```
5. Deploy — Railway auto-detects Node.js and runs `npm start`

---

## Project Structure

```
project-management-app/
├── src/
│   ├── models/
│   │   ├── index.js          # Associations
│   │   ├── User.js
│   │   ├── Project.js
│   │   ├── Task.js
│   │   └── ProjectMember.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   ├── dashboard.js
│   │   └── users.js
│   ├── middleware/
│   │   └── auth.js           # JWT + role guards
│   ├── database.js
│   └── server.js
├── public/
│   ├── index.html            # SPA shell
│   ├── css/style.css
│   └── js/app.js             # Frontend logic
├── .env.example
├── railway.toml
└── package.json
```

---

## Database Schema

```
Users          Projects         Tasks              ProjectMembers
─────────      ────────         ─────              ──────────────
id             id               id                 id
name           name             title              projectId → Projects
email          description      description        userId    → Users
password       status           status             role
role           ownerId → Users  priority
               createdAt        dueDate
                                projectId → Projects
                                assigneeId → Users
```
