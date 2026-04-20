# -------------------------------------------------------------
# Dockerfile for LibTrack
# Combines the Frontend and Backend into a single executable container
# -------------------------------------------------------------

# --- Build Stage ---
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Step 1: Copy pom.xml and source code for the backend
COPY backend/pom.xml backend/
COPY backend/src/ backend/src/

# Step 2: Copy the frontend into Spring Boot's static directory
# This allows Spring Boot to serve index.html, JS, and CSS files directly
RUN mkdir -p backend/src/main/resources/static
COPY frontend/ backend/src/main/resources/static/

# Step 3: Build the Spring Boot application (creates the fat jar)
WORKDIR /app/backend
RUN mvn clean package -DskipTests

# --- Run Stage ---
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Copy the built JAR from the builder stage
COPY --from=build /app/backend/target/libtrack-backend-1.0.0.jar app.jar

# Make the container listen on port 8080 (which Render expects)
EXPOSE 8080

# Start the application
ENTRYPOINT ["java", "-jar", "app.jar"]
