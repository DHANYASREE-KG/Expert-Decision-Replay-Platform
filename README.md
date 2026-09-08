## Frontend Technology Stack

The frontend is served by FastAPI and uses:

- HTML5 for page structure
- CSS3 for the custom responsive design system
- Vanilla JavaScript for API integration and interactions
- Bootstrap 5 for responsive layout and component primitives
- Tailwind CSS for utility classes

Open `/` after starting the FastAPI application to use the frontend.

# Expert Decision Replay Platform

## Description
The Expert Decision Replay Platform is a FastAPI backend for recording, reviewing, and replaying organizational decisions. It provides authenticated APIs for decision management, collaboration, auditability, approvals, dashboards, and report exports.

## Features
- User registration, login, and JWT authentication
- Decision and alternative management
- Decision rationale, version history, and status workflows
- Discussion threads, replies, comments, and meeting notes
- Approval workflows and activity logging
- Audit and compliance logs
- Dashboard and reporting endpoints
- Excel report exports

## Technologies Used
- Python
- FastAPI and Uvicorn
- SQLAlchemy
- PostgreSQL with `psycopg2-binary`
- Alembic database migrations
- Pydantic and `pydantic-settings`
- JWT authentication and Passlib/bcrypt password hashing
- `openpyxl` for Excel exports

## How to Run
1. Install the dependencies:

	```bash
	pip install -r requirements.txt
	```

2. Create a `.env` file in the project root:

	```env
	DATABASE_URL=postgresql://user:password@localhost:5432/decision_replay
	JWT_SECRET_KEY=replace-with-a-secure-secret
	```

3. Apply the database migrations:

	```bash
	alembic upgrade head
	```

4. Start the API:

	```bash
	uvicorn app.main:app --reload
	```

5. Open the interactive API documentation at `http://127.0.0.1:8000/docs`.

## Author
Ramya
