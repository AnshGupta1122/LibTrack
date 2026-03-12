# LibTrack v2 — Smart Library Seat Management

## Stack
- **Frontend**: HTML + CSS + Vanilla JS (no build tools needed)
- **Backend**: Java 17 + Spring Boot 3.2 + Spring Data JPA
- **Database**: H2 in-memory (dev) — swap to MySQL for prod
- **Auth**: BCrypt password hashing

## Project Structure
```
libtrack-v2/
├── frontend/
│   ├── index.html        ← Login / Register page
│   ├── dashboard.html    ← Main app (requires login)
│   ├── auth.css / auth.js
│   └── dashboard.css / dashboard.js
└── backend/
    ├── pom.xml
    └── src/main/java/com/libtrack/
        ├── controller/   AuthController, BookingController, RoomController, SeatController
        ├── model/        Student, Seat, Booking, GroupRoom, RoomBooking
        ├── repository/   JPA repositories
        ├── service/      BookingService
        └── config/       CorsConfig, PasswordEncoderConfig
```

## Running Locally

### 1. Start the backend
```bash
cd backend
mvn spring-boot:run
```
Wait for: `Started LibTrackApplication` + seed messages.
Backend runs at **http://localhost:8080**

### 2. Open the frontend
Open `frontend/index.html` in your browser.

Register → Log in → Use the app.

### H2 Console (database viewer)
http://localhost:8080/h2-console
- JDBC URL: `jdbc:h2:mem:libtracksdb`
- User: `sa` | Password: (blank)

### Quick API test
```bash
curl http://localhost:8080/api/stats
curl http://localhost:8080/api/seats
```

## Production (MySQL)
Set these environment variables:
```
DB_URL=jdbc:mysql://localhost:3306/libtrackdb
DB_USERNAME=root
DB_PASSWORD=yourpassword
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```
Change `spring.jpa.hibernate.ddl-auto=validate` in application.properties.
# LibTrack
# LibTrack
